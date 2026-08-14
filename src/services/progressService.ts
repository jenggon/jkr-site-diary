import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError, ValidationError, InfrastructureError } from '@/lib/errors';
import { Progress, ProgressMeasurementStatus } from '@/types/progress';
import { CreateProgressCommand, UpdateProgressCommand, IProgressService } from './IProgressService';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { ISiteDiaryRepositoryAdapter } from '@/services/siteDiaryService';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IOpenActivityService } from '@/services/IOpenActivityService';
import { AuditEventType } from '@/types/audit';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';

export interface IProgressServiceDependencies {
  readonly activityRepository: IActivityRepository;
  readonly siteDiaryRepository: ISiteDiaryRepositoryAdapter;
  readonly revisionRepository: IProgrammeRevisionRepository;
  readonly progressRepository: typeof import('@/repositories/progressRepository').progressRepository;
  readonly auditRepository: typeof import('@/repositories/auditRepository').auditRepository;
  readonly transactionManager: ITransactionManager;
  readonly openActivityService: IOpenActivityService;
  readonly clock: IClock;
  readonly logger: Logger;
}

export class ProgressService implements IProgressService {
  private readonly activityRepo: IActivityRepository;
  private readonly siteDiaryRepo: ISiteDiaryRepositoryAdapter;
  private readonly revisionRepo: IProgrammeRevisionRepository;
  private readonly progressRepo: typeof import('@/repositories/progressRepository').progressRepository;
  private readonly auditRepo: typeof import('@/repositories/auditRepository').auditRepository;
  private readonly txManager: ITransactionManager;
  private readonly openActivityService: IOpenActivityService;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: IProgressServiceDependencies) {
    this.activityRepo = deps.activityRepository;
    this.siteDiaryRepo = deps.siteDiaryRepository;
    this.revisionRepo = deps.revisionRepository;
    this.progressRepo = deps.progressRepository;
    this.auditRepo = deps.auditRepository;
    this.txManager = deps.transactionManager;
    this.openActivityService = deps.openActivityService;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  private async validateContext(cmd: { activity_id: string; site_diary_id: string; revision_id: string; measurement_date: string }): Promise<Result<void, BaseAppError>> {
    // 1. Verify Activity exists
    const activityRes = await this.activityRepo.findById(cmd.activity_id);
    if (isFailure(activityRes)) return Failure(activityRes.error as BaseAppError);
    if (!activityRes.value) {
      return Failure(new ValidationError(`Activity not found: ${cmd.activity_id}`));
    }

    // 2. Verify Programme Revision is active
    const revisionRes = await this.revisionRepo.findById(cmd.revision_id);
    if (isFailure(revisionRes)) return Failure(revisionRes.error as BaseAppError);
    if (!revisionRes.value) {
      return Failure(new ValidationError(`Programme Revision not found: ${cmd.revision_id}`));
    }
    const revision = revisionRes.value;
    if (revision.status !== 'Approved' || !revision.isCurrent) {
      return Failure(new ValidationError(`Cannot create/update Progress. Revision is not active (Approved and Current). Status: ${revision.status}`));
    }

    // 3. Verify Site Diary exists and matches Context
    const siteDiary = await this.siteDiaryRepo.getSiteDiaryById(cmd.site_diary_id);
    if (!siteDiary) {
      return Failure(new ValidationError(`Site Diary not found: ${cmd.site_diary_id}`));
    }
    if (siteDiary.activity_id !== cmd.activity_id) {
      return Failure(new ValidationError(`Context mismatch: Site Diary ${cmd.site_diary_id} does not belong to Activity ${cmd.activity_id}`));
    }
    
    return Success(undefined);
  }

  private async validateCumulativeCeiling(activityId: string, additionalQuantity: number): Promise<Result<void, BaseAppError>> {
    const existingProgress = await this.progressRepo.getProgressByActivity(activityId);
    let total = 0;
    let planned = 0;
    
    if (existingProgress.length > 0) {
      for (const p of existingProgress) {
        total += Number(p.actual_quantity || 0);
        if (p.planned_quantity && planned === 0) {
          planned = Number(p.planned_quantity);
        }
      }
    }
    
    // DEV-011D Sec 5.2: MUST NOT exceed 100.00%
    if (planned > 0) {
       const newTotal = total + additionalQuantity;
       const percentage = (newTotal / planned) * 100;
       if (percentage > 100.00) {
          return Failure(new ValidationError(`Total cumulative progress MUST NOT exceed 100.00%. Attempted: ${percentage.toFixed(2)}%`));
       }
    }

    return Success(undefined);
  }

  public async createProgress(cmd: CreateProgressCommand, actorId?: string): Promise<Result<Progress, BaseAppError>> {
    try {
      const validationRes = await this.validateContext({
        activity_id: cmd.activity_id,
        site_diary_id: cmd.site_diary_id,
        revision_id: cmd.revision_id,
        measurement_date: cmd.measurement_date,
      });
      if (isFailure(validationRes)) return Failure(validationRes.error as BaseAppError);

      const ceilingRes = await this.validateCumulativeCeiling(cmd.activity_id, cmd.actual_quantity);
      if (isFailure(ceilingRes)) return Failure(ceilingRes.error as BaseAppError);

      const now = this.clock.nowIso();
      const measurementStatus = cmd.measurement_status || ProgressMeasurementStatus.Draft;

      return this.txManager.execute(async () => {
        // 1. Create Progress record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
          ...cmd,
          measurement_status: measurementStatus,
          created_at: now,
          updated_at: null,
        };
        const created = await this.progressRepo.createProgress(payload);

        // 2. Audit Log
        if (actorId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const auditPayload: any = {
            programme_id: cmd.programme_id,
            entity_name: 'Progress',
            entity_id: created.progress_id,
            event_type: AuditEventType.Create,
            performed_by: actorId,
            event_timestamp: now,
          };
          await this.auditRepo.createAudit(auditPayload);
        }

        // 3. Activity Transition if 100% Approved
        if (measurementStatus === ProgressMeasurementStatus.Approved && created.progress_percentage === 100) {
           const completeRes = await this.openActivityService.completeActivity(cmd.activity_id, actorId || 'SYSTEM');
           if (isFailure(completeRes)) return Failure(completeRes.error as BaseAppError);
        }

        this.logger.info('Created Progress', { progressId: created.progress_id });
        return Success(created);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('Failed to create progress', { error: msg });
      return Failure(new InfrastructureError(`Failed to create progress: ${msg}`));
    }
  }

  public async getProgressById(progressId: string): Promise<Result<Progress | null, BaseAppError>> {
    try {
      const progress = await this.progressRepo.getProgressById(progressId);
      return Success(progress);
    } catch {
      return Failure(new InfrastructureError('Failed to get progress by ID'));
    }
  }

  public async getProgressByActivity(activityId: string): Promise<Result<Progress[], BaseAppError>> {
    try {
      const progress = await this.progressRepo.getProgressByActivity(activityId);
      return Success(progress);
    } catch {
      return Failure(new InfrastructureError('Failed to get progress by Activity'));
    }
  }

  public async getProgressBySiteDiary(siteDiaryId: string): Promise<Result<Progress[], BaseAppError>> {
    try {
      const progress = await this.progressRepo.getProgressBySiteDiary(siteDiaryId);
      return Success(progress);
    } catch {
      return Failure(new InfrastructureError('Failed to get progress by Site Diary'));
    }
  }

  public async getProgressByMeasurementDate(measurementDate: string): Promise<Result<Progress[], BaseAppError>> {
    try {
      const progress = await this.progressRepo.getProgressByMeasurementDate(measurementDate);
      return Success(progress);
    } catch {
      return Failure(new InfrastructureError('Failed to get progress by Measurement Date'));
    }
  }

  public async updateProgress(progressId: string, updates: UpdateProgressCommand, actorId?: string): Promise<Result<Progress, BaseAppError>> {
    try {
      const existingRes = await this.getProgressById(progressId);
      if (isFailure(existingRes)) return Failure(existingRes.error as BaseAppError);
      const existing = existingRes.value;
      if (!existing) {
        return Failure(new ValidationError(`Progress not found: ${progressId}`));
      }

      const validationRes = await this.validateContext({
        activity_id: existing.activity_id,
        site_diary_id: existing.site_diary_id,
        revision_id: existing.revision_id,
        measurement_date: existing.measurement_date,
      });
      if (isFailure(validationRes)) return Failure(validationRes.error as BaseAppError);

      if (updates.actual_quantity !== undefined) {
        const delta = updates.actual_quantity - existing.actual_quantity;
        if (delta > 0) {
          const ceilingRes = await this.validateCumulativeCeiling(existing.activity_id, delta);
          if (isFailure(ceilingRes)) return Failure(ceilingRes.error as BaseAppError);
        }
      }

      const now = this.clock.nowIso();

      return this.txManager.execute(async () => {
        // 1. Update Progress
        const updated = await this.progressRepo.updateProgress(progressId, {
          ...updates,
          updated_at: now,
        });

        // 2. Audit Log
        if (actorId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const auditPayload: any = {
            programme_id: updated.programme_id,
            entity_name: 'Progress',
            entity_id: updated.progress_id,
            event_type: AuditEventType.Update,
            performed_by: actorId,
            event_timestamp: now,
          };
          await this.auditRepo.createAudit(auditPayload);
        }

        // 3. Activity Transition if 100% Approved
        const newStatus = updates.measurement_status || existing.measurement_status;
        const newPercentage = updates.progress_percentage !== undefined ? updates.progress_percentage : existing.progress_percentage;
        
        if (newStatus === ProgressMeasurementStatus.Approved && newPercentage === 100) {
           const completeRes = await this.openActivityService.completeActivity(updated.activity_id, actorId || 'SYSTEM');
           if (isFailure(completeRes)) return Failure(completeRes.error as BaseAppError);
        }

        this.logger.info('Updated Progress', { progressId: updated.progress_id });
        return Success(updated);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('Failed to update progress', { error: msg });
      return Failure(new InfrastructureError(`Failed to update progress: ${msg}`));
    }
  }
}
