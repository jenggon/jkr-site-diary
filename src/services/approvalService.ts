import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError, ValidationError, InfrastructureError, AuthorizationError } from '@/lib/errors';
import { Approval, ApprovalStatus } from '@/types/approval';
import { IApprovalService, CreateApprovalCommand, UpdateApprovalCommand } from './IApprovalService';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { ISiteDiaryRepository } from '@/repositories/siteDiaryRepository';
import { IApprovalReviewReadRepository, ApprovalReviewReadError } from '@/repositories/ApprovalReviewReadRepository';
import { IApprovalAtomicRepository } from '@/repositories/atomic/IApprovalAtomicRepository';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { ApprovalNotFoundError, ApprovalTerminalStateError } from '@/errors/approvalErrors';

export interface IApprovalServiceDependencies {
  readonly revisionRepository: IProgrammeRevisionRepository;
  readonly activityRepository: IActivityRepository;
  readonly siteDiaryRepository: ISiteDiaryRepository;
  readonly progressRepository: typeof import('@/repositories/progressRepository').progressRepository;
  readonly approvalRepository: typeof import('@/repositories/approvalRepository').approvalRepository;
  readonly approvalReviewRepository?: IApprovalReviewReadRepository | undefined;
  readonly atomicRepository: IApprovalAtomicRepository;
  readonly clock: IClock;
  readonly logger: Logger;
}

export class ApprovalService implements IApprovalService {
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly activityRepo: IActivityRepository;
  private readonly siteDiaryRepo: ISiteDiaryRepository;
  private readonly progressRepo: typeof import('@/repositories/progressRepository').progressRepository;
  private readonly approvalRepo: typeof import('@/repositories/approvalRepository').approvalRepository;
  private readonly approvalReviewRepo?: IApprovalReviewReadRepository | undefined;
  private readonly atomicRepo: IApprovalAtomicRepository;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: IApprovalServiceDependencies) {
    this.revisionRepo = deps.revisionRepository;
    this.activityRepo = deps.activityRepository;
    this.siteDiaryRepo = deps.siteDiaryRepository;
    this.progressRepo = deps.progressRepository;
    this.approvalRepo = deps.approvalRepository;
    this.approvalReviewRepo = deps.approvalReviewRepository;
    this.atomicRepo = deps.atomicRepository;
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

      if (cmd.site_diary_id && !cmd.expected_site_diary_last_modified_at) {
        return Failure(new ValidationError('expected_site_diary_last_modified_at is required for Site Diary approvals.'));
      }

      const createdApproval = await this.atomicRepo.create({
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
        }, cmd.requested_by, cmd.expected_site_diary_last_modified_at);
      this.logger.info(`Approval record created: ${createdApproval.approval_id}`);
      return Success(createdApproval);
    } catch (error) {
      if (error instanceof BaseAppError) {
        return Failure(error);
      }
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
      let existing: Approval | null = null;

      if (this.approvalReviewRepo) {
        try {
          existing = await this.approvalReviewRepo.getExact(approvalId);
        } catch (error) {
          if (error instanceof ApprovalReviewReadError) {
            if (error.status === 403) {
              return Failure(new AuthorizationError(error.message || 'F24_UNAUTHORIZED_CAPABILITY'));
            }
            if (error.status === 404) {
              return Failure(new ApprovalNotFoundError(`Approval record not found: ${approvalId}`));
            }
            this.logger.error(`Approval review exact read failed: ${error.message}`);
            return Failure(new InfrastructureError('Failed to retrieve approval record'));
          }
          throw error;
        }
      } else {
        existing = await this.approvalRepo.getApprovalById(approvalId);
      }

      if (!existing) {
        return Failure(new ApprovalNotFoundError(`Approval record not found: ${approvalId}`));
      }

      // Terminal state validation
      const terminalStates = [ApprovalStatus.Approved, ApprovalStatus.Rejected, ApprovalStatus.Cancelled];
      if (terminalStates.includes(existing.approval_status)) {
        return Failure(
          new ApprovalTerminalStateError(
            `Cannot transition approval from terminal state: ${existing.approval_status}`
          )
        );
      }

      // Site Diary approvals use the locked single-tier lifecycle. Generic
      // Activity approvals retain the pre-B02 target contract.
      const validTargetStates = existing.site_diary_id
        ? existing.approval_status === ApprovalStatus.Returned
          ? [ApprovalStatus.Pending]
          : [
              ApprovalStatus.Approved,
              ApprovalStatus.Rejected,
              ApprovalStatus.Returned,
              ApprovalStatus.Cancelled,
            ]
        : [
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

      if (existing.site_diary_id && !cmd.expected_site_diary_last_modified_at) {
        return Failure(new ValidationError('expected_site_diary_last_modified_at is required for Site Diary approvals.'));
      }

      if (!cmd.approved_by) {
        return Failure(new ValidationError('Authenticated approval actor is required'));
      }
      const updatedApproval = await this.atomicRepo.update(approvalId, {
          approval_status: cmd.approval_status,
          approval_date: approvalDate,
          approval_comment: cmd.approval_status === ApprovalStatus.Pending
            ? (cmd.approval_comment ?? null)
            : (cmd.approval_comment !== undefined ? cmd.approval_comment : existing.approval_comment),
          updated_at: now,
        }, cmd.approved_by, cmd.expected_site_diary_last_modified_at);
      this.logger.info(`Approval record updated: ${approvalId} to ${cmd.approval_status}`);
      return Success(updatedApproval);
    } catch (error) {
      if (error instanceof BaseAppError) {
        return Failure(error);
      }
      const err = error as Error;
      this.logger.error(`Failed to update approval: ${err.message}`);
      return Failure(new InfrastructureError(err.message));
    }
  }
}
