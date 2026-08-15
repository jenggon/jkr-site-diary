import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError, ValidationError, InfrastructureError } from '@/lib/errors';
import { Approval, ApprovalStatus } from '@/types/approval';
import { IApprovalService, CreateApprovalCommand, UpdateApprovalCommand } from './IApprovalService';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { ISiteDiaryRepositoryAdapter } from '@/services/siteDiaryService';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { AuditEventType } from '@/types/audit';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';

export interface IApprovalServiceDependencies {
  readonly revisionRepository: IProgrammeRevisionRepository;
  readonly activityRepository: IActivityRepository;
  readonly siteDiaryRepository: ISiteDiaryRepositoryAdapter;
  readonly progressRepository: typeof import('@/repositories/progressRepository').progressRepository;
  readonly approvalRepository: typeof import('@/repositories/approvalRepository').approvalRepository;
  readonly auditRepository: typeof import('@/repositories/auditRepository').auditRepository;
  readonly transactionManager: ITransactionManager;
  readonly clock: IClock;
  readonly logger: Logger;
}

export class ApprovalService implements IApprovalService {
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly activityRepo: IActivityRepository;
  private readonly siteDiaryRepo: ISiteDiaryRepositoryAdapter;
  private readonly progressRepo: typeof import('@/repositories/progressRepository').progressRepository;
  private readonly approvalRepo: typeof import('@/repositories/approvalRepository').approvalRepository;
  private readonly auditRepo: typeof import('@/repositories/auditRepository').auditRepository;
  private readonly txManager: ITransactionManager;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: IApprovalServiceDependencies) {
    this.revisionRepo = deps.revisionRepository;
    this.activityRepo = deps.activityRepository;
    this.siteDiaryRepo = deps.siteDiaryRepository;
    this.progressRepo = deps.progressRepository;
    this.approvalRepo = deps.approvalRepository;
    this.auditRepo = deps.auditRepository;
    this.txManager = deps.transactionManager;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  private async validateContext(cmd: {
    revision_id: string;
    activity_id: string;
    site_diary_id?: string | null | undefined;
    progress_id?: string | null | undefined;
  }): Promise<Result<void, BaseAppError>> {
    // 1. Verify Programme Revision exists, is Approved, and isCurrent
    const revisionRes = await this.revisionRepo.findById(cmd.revision_id);
    if (isFailure(revisionRes)) return Failure(revisionRes.error as BaseAppError);
    if (!revisionRes.value) {
      return Failure(new ValidationError(`Programme Revision not found: ${cmd.revision_id}`));
    }
    const revision = revisionRes.value;
    if (revision.status !== 'Approved' || !revision.isCurrent) {
      return Failure(
        new ValidationError(
          `Cannot process Approval. Revision is not active (Approved and Current). Status: ${revision.status}, isCurrent: ${revision.isCurrent}`
        )
      );
    }

    // 2. Verify Activity exists and belongs to Revision
    const activityRes = await this.activityRepo.findById(cmd.activity_id);
    if (isFailure(activityRes)) return Failure(activityRes.error as BaseAppError);
    if (!activityRes.value) {
      return Failure(new ValidationError(`Activity not found: ${cmd.activity_id}`));
    }
    const activity = activityRes.value;
    if (activity.revision_id !== cmd.revision_id) {
      return Failure(
        new ValidationError(
          `Activity ${cmd.activity_id} belongs to revision ${activity.revision_id}, not requested revision ${cmd.revision_id}`
        )
      );
    }

    // 3. Optional Site Diary validation
    if (cmd.site_diary_id) {
      const siteDiary = await this.siteDiaryRepo.getSiteDiaryById(cmd.site_diary_id);
      if (!siteDiary) {
        return Failure(new ValidationError(`Site Diary not found: ${cmd.site_diary_id}`));
      }
      if (siteDiary.activity_id !== cmd.activity_id) {
        return Failure(
          new ValidationError(
            `Context mismatch: Site Diary ${cmd.site_diary_id} does not belong to Activity ${cmd.activity_id}`
          )
        );
      }
    }

    // 4. Optional Progress validation
    if (cmd.progress_id) {
      const progress = await this.progressRepo.getProgressById(cmd.progress_id);
      if (!progress) {
        return Failure(new ValidationError(`Progress record not found: ${cmd.progress_id}`));
      }
      if (progress.activity_id !== cmd.activity_id) {
        return Failure(
          new ValidationError(
            `Context mismatch: Progress record ${cmd.progress_id} does not belong to Activity ${cmd.activity_id}`
          )
        );
      }
    }

    return Success(undefined);
  }

  public async createApproval(cmd: CreateApprovalCommand): Promise<Result<Approval, BaseAppError>> {
    try {
      const contextRes = await this.validateContext({
        revision_id: cmd.revision_id,
        activity_id: cmd.activity_id,
        site_diary_id: cmd.site_diary_id,
        progress_id: cmd.progress_id,
      });
      if (isFailure(contextRes)) return Failure(contextRes.error);

      const now = this.clock.nowIso();
      const requestedAt = cmd.requested_at || now;

      return this.txManager.execute(async () => {
        const createdApproval = await this.approvalRepo.createApproval({
          programme_id: cmd.programme_id,
          revision_id: cmd.revision_id,
          activity_id: cmd.activity_id,
          site_diary_id: cmd.site_diary_id || null,
          progress_id: cmd.progress_id || null,
          approval_level: cmd.approval_level ?? 1,
          approval_status: ApprovalStatus.Pending,
          approval_date: null,
          approval_comment: cmd.approval_comment || null,
          approved_by: null,
          requested_by: cmd.requested_by,
          requested_at: requestedAt,
          created_at: now,
          updated_at: null,
        });

        await this.auditRepo.createAudit({
          programme_id: createdApproval.programme_id,
          revision_id: createdApproval.revision_id,
          entity_name: 'APPROVAL',
          entity_id: createdApproval.approval_id,
          event_type: AuditEventType.Create,
          performed_by: cmd.requested_by || 'system',
          user_role: 'submitter',
          field_name: 'approval_status',
          old_value: null,
          new_value: ApprovalStatus.Pending,
          change_reason: cmd.approval_comment || 'Approval Request Created',
          ip_address: null,
          device_information: null,
          application_version: null,
        });

        this.logger.info(`Approval record created: ${createdApproval.approval_id}`);
        return Success(createdApproval);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create approval: ${err.message}`);
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getApprovalById(approvalId: string): Promise<Result<Approval | null, BaseAppError>> {
    try {
      const result = await this.approvalRepo.getApprovalById(approvalId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getApprovalsByActivity(activityId: string): Promise<Result<Approval[], BaseAppError>> {
    try {
      const result = await this.approvalRepo.getApprovalsByActivity(activityId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getApprovalsBySiteDiary(siteDiaryId: string): Promise<Result<Approval[], BaseAppError>> {
    try {
      const result = await this.approvalRepo.getApprovalsBySiteDiary(siteDiaryId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async getApprovalsByProgress(progressId: string): Promise<Result<Approval[], BaseAppError>> {
    try {
      const result = await this.approvalRepo.getApprovalsByProgress(progressId);
      return Success(result);
    } catch (error) {
      const err = error as Error;
      return Failure(new InfrastructureError(err.message));
    }
  }

  public async updateApproval(
    approvalId: string,
    cmd: UpdateApprovalCommand
  ): Promise<Result<Approval, BaseAppError>> {
    try {
      const existing = await this.approvalRepo.getApprovalById(approvalId);
      if (!existing) {
        return Failure(new ValidationError(`Approval record not found: ${approvalId}`));
      }

      // Terminal state validation
      const terminalStates = [ApprovalStatus.Approved, ApprovalStatus.Rejected, ApprovalStatus.Cancelled];
      if (terminalStates.includes(existing.approval_status)) {
        return Failure(
          new ValidationError(
            `Cannot transition approval from terminal state: ${existing.approval_status}`
          )
        );
      }

      // Legal target state validation
      const validTargetStates = [
        ApprovalStatus.Approved,
        ApprovalStatus.Rejected,
        ApprovalStatus.Returned,
        ApprovalStatus.Cancelled,
      ];
      if (!validTargetStates.includes(cmd.approval_status)) {
        return Failure(
          new ValidationError(`Invalid target approval status: ${cmd.approval_status}`)
        );
      }

      // Mandatory comment check for Rejected and Returned
      if (cmd.approval_status === ApprovalStatus.Rejected && (!cmd.approval_comment || cmd.approval_comment.trim() === '')) {
        return Failure(new ValidationError('Rejection comment is mandatory'));
      }
      if (cmd.approval_status === ApprovalStatus.Returned && (!cmd.approval_comment || cmd.approval_comment.trim() === '')) {
        return Failure(new ValidationError('Return comment is mandatory'));
      }

      // Context validation (Revision must still be active)
      const contextRes = await this.validateContext({
        revision_id: existing.revision_id,
        activity_id: existing.activity_id,
        site_diary_id: existing.site_diary_id,
        progress_id: existing.progress_id,
      });
      if (isFailure(contextRes)) return Failure(contextRes.error);

      const now = this.clock.nowIso();
      const approvalDate = cmd.approval_status === ApprovalStatus.Approved ? (cmd.approval_date || now) : existing.approval_date;

      // Determine AuditEventType
      let auditEventType: AuditEventType;
      if (cmd.approval_status === ApprovalStatus.Approved) {
        auditEventType = AuditEventType.Approve;
      } else if (cmd.approval_status === ApprovalStatus.Rejected) {
        auditEventType = AuditEventType.Reject;
      } else {
        auditEventType = AuditEventType.Update;
      }

      return this.txManager.execute(async () => {
        const updatedApproval = await this.approvalRepo.updateApproval(approvalId, {
          approval_status: cmd.approval_status,
          approved_by: cmd.approved_by !== undefined ? cmd.approved_by : existing.approved_by,
          approval_date: approvalDate,
          approval_comment: cmd.approval_comment !== undefined ? cmd.approval_comment : existing.approval_comment,
          updated_at: now,
        });

        await this.auditRepo.createAudit({
          programme_id: updatedApproval.programme_id,
          revision_id: updatedApproval.revision_id,
          entity_name: 'APPROVAL',
          entity_id: updatedApproval.approval_id,
          event_type: auditEventType,
          performed_by: cmd.approved_by || 'system',
          user_role: 'approver',
          field_name: 'approval_status',
          old_value: existing.approval_status,
          new_value: updatedApproval.approval_status,
          change_reason: cmd.approval_comment || `Approval status updated to ${cmd.approval_status}`,
          ip_address: null,
          device_information: null,
          application_version: null,
        });

        this.logger.info(`Approval record updated: ${approvalId} to ${cmd.approval_status}`);
        return Success(updatedApproval);
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update approval: ${err.message}`);
      return Failure(new InfrastructureError(err.message));
    }
  }
}
