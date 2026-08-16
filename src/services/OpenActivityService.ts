import { Result, Success, Failure, FailureResult, isFailure, isSuccess } from '@/lib/result';
import { BaseAppError, UnknownError, InfrastructureError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { generateUuid } from '@/lib/uuid';
import { Activity, ActivitySourceType, ActivityStatus } from '@/types/activity';
import { OpenActivityDto } from '@/types/openActivity';
import { ActivityNotFoundError, ActivityValidationError, ActivityRevisionSupersededError, InvalidActivityStateError } from '@/errors/activityErrors';
import { validateActivityStateTransition } from '@/statemachines/siteDiaryStateMachine';
import { validateActivityName } from '@/validation/activityValidation';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IDomainEventPublisher } from '@/events/IDomainEventPublisher';
import { ActivityCreatedEvent, ActivityUpdatedEvent, ActivityStatusChangedEvent } from '@/events/activityEvents';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import {
  IOpenActivityService,
  CreateActivityCommand,
  UpdateActivityCommand,
} from './IOpenActivityService';

export interface IOpenActivityServiceDependencies {
  readonly activityRepository: IActivityRepository;
  readonly logRepository: IActivityLogRepository;
  readonly transactionManager: ITransactionManager;
  readonly clock: IClock;
  readonly logger: Logger;
  readonly eventPublisher: IDomainEventPublisher;
  readonly revisionRepository?: import('@/repositories/IProgrammeRevisionRepository').IProgrammeRevisionRepository;
  readonly taskRepository?: { getTaskById(taskId: string): Promise<import('@/types/task').Task | null> };
  readonly atomicRepository?: ResidualAtomicRepository;
}

export class OpenActivityService implements IOpenActivityService {
  private readonly activityRepo: IActivityRepository;
  private readonly logRepo: IActivityLogRepository;
  private readonly txManager: ITransactionManager;
  private readonly clock: IClock;
  private readonly logger: Logger;
  private readonly eventPublisher: IDomainEventPublisher;
  private readonly revisionRepo?: import('@/repositories/IProgrammeRevisionRepository').IProgrammeRevisionRepository;
  private readonly taskRepo?: { getTaskById(taskId: string): Promise<import('@/types/task').Task | null> };
  private readonly atomicRepo: ResidualAtomicRepository | undefined;

  constructor(deps: IOpenActivityServiceDependencies) {
    this.activityRepo = deps.activityRepository;
    this.logRepo = deps.logRepository;
    this.txManager = deps.transactionManager;
    this.clock = deps.clock;
    this.logger = deps.logger;
    this.eventPublisher = deps.eventPublisher;
    if (deps.revisionRepository !== undefined) this.revisionRepo = deps.revisionRepository;
    if (deps.taskRepository !== undefined) this.taskRepo = deps.taskRepository;
    this.atomicRepo = deps.atomicRepository;
  }

  private mapToDto(activity: Activity): OpenActivityDto {
    const sourceType = activity.source_type ?? ActivitySourceType.MSP;
    return {
      activityId: activity.activity_id,
      programmeId: activity.programme_id,
      revisionId: activity.revision_id,
      sourceType,
      taskId: activity.task_id ?? undefined,
      voItemId: activity.vo_item_id ?? undefined,
      ahi: activity.ahi,
      ahiDisplayName: activity.ahi_display_name,
      subtask: activity.subtask,
      subtaskDisplayName: activity.subtask_display_name,
      status: activity.status,
      isLocked: false,
      createdAt: activity.created_at,
      createdBy: activity.submitted_by,
      updatedAt: activity.updated_at ?? undefined,
      updatedBy: activity.updated_at ? activity.submitted_by : undefined,
    };
  }

  private async publishEventSafely(event: unknown): Promise<void> {
    try {
      await this.eventPublisher.publish(event as unknown as import('@/events/IDomainEventPublisher').IDomainEvent);
    } catch (err: unknown) {
      this.logger.error('Failed to publish post-commit activity domain event', { error: err });
    }
  }

  private async assertRevisionOperational(activity: Activity): Promise<Result<null, BaseAppError> | null> {
    if (!this.revisionRepo || !activity.revision_id) return null;
    const revRes = await this.revisionRepo.findById(activity.revision_id);
    if (isFailure(revRes)) return revRes as unknown as Result<null, BaseAppError>;
    const revision = revRes.value;
    if (!revision || revision.status !== 'Approved' || !revision.isCurrent) {
      const status = revision ? revision.status : 'missing';
      return Failure(new ActivityRevisionSupersededError(
        `Activity revision '${activity.revision_id}' is no longer operationally current (status: ${status}). Mutation rejected.`
      ));
    }
    return null;
  }

  public async createActivity(cmd: CreateActivityCommand): Promise<Result<OpenActivityDto, BaseAppError>> {
    if (!cmd.revisionId || cmd.revisionId.trim() === '') {
      return Failure(new ActivityValidationError('revisionId is required'));
    }

    try {
      validateActivityName(cmd.activityName);
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ActivityValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    if (this.revisionRepo) {
      const revRes = await this.revisionRepo.findById(cmd.revisionId);
      if (isFailure(revRes)) return Failure(revRes.error);
      if (!revRes.value) return Failure(new ActivityValidationError(`Revision not found: ${cmd.revisionId}`));
      if (revRes.value.programmeId !== cmd.programmeId) return Failure(new ActivityValidationError('programme/revision mismatch'));
      if (revRes.value.status === 'Draft') return Failure(new ActivityValidationError('Cannot create activity under Draft revision'));
      if (revRes.value.status === 'Archived' || revRes.value.status === 'Superseded') {
        return Failure(new ActivityValidationError(`Cannot create activity under ${revRes.value.status} revision`));
      }
    }

    const sourceType = cmd.sourceType ?? ActivitySourceType.MSP;
    const taskId = cmd.taskId?.trim() || undefined;
    const voItemId = cmd.voItemId?.trim() || undefined;

    if (sourceType === ActivitySourceType.MSP) {
      if (!taskId) return Failure(new ActivityValidationError('taskId is required'));
      if (voItemId) return Failure(new ActivityValidationError('MSP Activity forbids voItemId'));
      if (!this.taskRepo) {
        return Failure(new ActivityValidationError('taskRepository is required in composition for MSP Activity provisioning'));
      }
      const task = await this.taskRepo.getTaskById(taskId);
      if (!task) return Failure(new ActivityValidationError(`Task not found: ${taskId}`));
      if (task.revision_id !== cmd.revisionId) return Failure(new ActivityValidationError('task/revision mismatch'));
      if (task.programme_id !== cmd.programmeId) return Failure(new ActivityValidationError('programme/task mismatch'));
    } else if (sourceType === ActivitySourceType.VO) {
      if (!voItemId) return Failure(new ActivityValidationError('voItemId is required'));
      if (taskId) return Failure(new ActivityValidationError('VO Activity forbids taskId'));
      if (!this.atomicRepo) {
        return Failure(new ActivityValidationError('VO Activity provisioning requires canonical atomic persistence'));
      }
    } else {
      return Failure(new ActivityValidationError('Unsupported Activity source type'));
    }

    const now = this.clock.nowIso();
    const activityId = generateUuid();

    try {
      const newActivity: Activity = {
        activity_id: activityId,
        programme_id: cmd.programmeId,
        revision_id: cmd.revisionId,
        source_type: sourceType,
        task_id: taskId ?? null,
        vo_item_id: voItemId ?? null,
        activity_uid: `ACT-${activityId.substring(0, 8)}`,
        ahi: null,
        ahi_display_name: null,
        subtask: cmd.activityName,
        subtask_display_name: null,
        activity_date: now.split('T')[0] ?? '',
        actual_start_date: null,
        completed_date: null,
        status: ActivityStatus.New,
        weather: null,
        notes: '',
        submitted_by: cmd.createdBy,
        created_at: now,
        updated_at: null,
      };

      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId,
        eventType: 'NEW',
        snapshotData: { ...newActivity },
        loggedAt: now,
        loggedBy: cmd.createdBy,
      };

      if (this.atomicRepo) {
        const created = await this.atomicRepo.createActivity(newActivity as unknown as Record<string, unknown>, cmd.createdBy, activityId);
        await this.publishEventSafely(new ActivityCreatedEvent(this.mapToDto(created)));
        return Success(this.mapToDto(created));
      }

      const txResult = await this.txManager.execute(async () => {
        const createRes = await this.activityRepo.create(newActivity);
        if (isFailure(createRes)) return createRes;
        const logRes = await this.logRepo.appendLog(logEntry);
        if (isFailure(logRes)) return logRes;
        return Success(createRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ActivityCreatedEvent(this.mapToDto(txResult.value)));
        return Success(this.mapToDto(txResult.value));
      }
      return txResult as unknown as FailureResult<BaseAppError>;
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Failed to create activity', { cause: err }));
    }
  }

  public async updateActivity(cmd: UpdateActivityCommand): Promise<Result<OpenActivityDto, BaseAppError>> {
    if (cmd.activityName !== undefined) {
      try {
        validateActivityName(cmd.activityName);
      } catch (err: unknown) {
        if (err instanceof BaseAppError) return Failure(err);
        return Failure(new ActivityValidationError(err instanceof Error ? err.message : 'Validation failed'));
      }
    }

    try {
      const existingRes = await this.activityRepo.findById(cmd.activityId);
      if (isFailure(existingRes)) return Failure(existingRes.error);
      if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));

      const revCheck = await this.assertRevisionOperational(existingRes.value);
      if (revCheck !== null && isFailure(revCheck)) return Failure(revCheck.error);

      const updatedAt = this.clock.nowIso();
      const updatedActivity: Activity = {
        ...existingRes.value,
        subtask: cmd.activityName ?? existingRes.value.subtask,
        updated_at: updatedAt,
      };

      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId: cmd.activityId,
        eventType: 'UPDATE',
        snapshotData: { ...updatedActivity },
        loggedAt: updatedAt,
        loggedBy: cmd.updatedBy,
      };

      if (this.atomicRepo) {
        const updated = await this.atomicRepo.updateActivity(cmd.activityId, { subtask: updatedActivity.subtask }, cmd.updatedBy);
        await this.publishEventSafely(new ActivityUpdatedEvent(this.mapToDto(updated)));
        return Success(this.mapToDto(updated));
      }

      const txResult = await this.txManager.execute(async () => {
        const updateRes = await this.activityRepo.update(updatedActivity);
        if (isFailure(updateRes)) return updateRes;
        const logRes = await this.logRepo.appendLog(logEntry);
        if (isFailure(logRes)) return logRes;
        return Success(updateRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ActivityUpdatedEvent(this.mapToDto(txResult.value)));
        return Success(this.mapToDto(txResult.value));
      }
      return txResult as unknown as FailureResult<BaseAppError>;
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Failed to update activity', { cause: err }));
    }
  }

  public async getOpenActivities(programmeId: string): Promise<Result<OpenActivityDto[], BaseAppError>> {
    if (!programmeId || programmeId.trim() === '') {
      return Failure(new ActivityValidationError('programmeId is required'));
    }

    try {
      if (!this.activityRepo.findOpenActivitiesByProgramme) {
        return Failure(new InfrastructureError('ActivityRepository does not support findOpenActivitiesByProgramme'));
      }
      const res = await this.activityRepo.findOpenActivitiesByProgramme(programmeId);
      if (isFailure(res)) return Failure(res.error);
      return Success(res.value.map(activity => this.mapToDto(activity)));
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Failed to get open activities', { cause: err }));
    }
  }

  private async transitionStatusWithLog(
    activityId: string,
    targetStatus: ActivityStatus,
    actorId: string,
    extraLogData?: Record<string, unknown>
  ): Promise<Result<OpenActivityDto, BaseAppError>> {
    try {
      const existingRes = await this.activityRepo.findById(activityId);
      if (isFailure(existingRes)) return Failure(existingRes.error);
      if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));

      const revCheck = await this.assertRevisionOperational(existingRes.value);
      if (revCheck !== null && isFailure(revCheck)) return Failure(revCheck.error);

      const fromStatus = existingRes.value.status;
      validateActivityStateTransition(fromStatus, targetStatus);

      const now = this.clock.nowIso();
      const updatedActivity: Activity = { ...existingRes.value, status: targetStatus, updated_at: now };
      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId,
        eventType: 'UPDATE',
        snapshotData: { ...updatedActivity, ...extraLogData },
        loggedAt: now,
        loggedBy: actorId,
      };

      const txResult = await this.txManager.execute(async () => {
        const updateRes = await this.activityRepo.update(updatedActivity);
        if (isFailure(updateRes)) return updateRes;
        const logRes = await this.logRepo.appendLog(logEntry);
        if (isFailure(logRes)) return logRes;
        return Success(updateRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ActivityStatusChangedEvent(activityId, fromStatus, targetStatus, actorId));
        return Success(this.mapToDto(txResult.value));
      }
      return txResult as unknown as FailureResult<BaseAppError>;
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Status transition failed', { cause: err }));
    }
  }

  public async startActivity(activityId: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>> {
    const existingRes = await this.activityRepo.findById(activityId);
    if (isFailure(existingRes)) return Failure(existingRes.error);
    if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));

    if (this.atomicRepo) {
      try {
        const updated = await this.atomicRepo.transitionActivity(activityId, 'start', actorId);
        await this.publishEventSafely(new ActivityStatusChangedEvent(activityId, existingRes.value.status, ActivityStatus.InProgress, actorId));
        return Success(this.mapToDto(updated));
      } catch (err) {
        return Failure(new UnknownError(err instanceof Error ? err.message : 'Status transition failed', { cause: err }));
      }
    }
    return this.transitionStatusWithLog(activityId, ActivityStatus.InProgress, actorId);
  }

  public async suspendActivity(_activityId: string, _reason: string, _actorId: string): Promise<Result<OpenActivityDto, BaseAppError>> {
    return Failure(new InvalidActivityStateError('Administrative suspension is currently unsupported (SPEC-001 not implemented)'));
  }

  public async completeActivity(activityId: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>> {
    if (this.atomicRepo) {
      try {
        return Success(this.mapToDto(await this.atomicRepo.transitionActivity(activityId, 'complete', actorId)));
      } catch (err) {
        return Failure(new UnknownError(err instanceof Error ? err.message : 'Status transition failed', { cause: err }));
      }
    }
    return this.transitionStatusWithLog(activityId, ActivityStatus.Completed, actorId);
  }

  public async cancelActivity(_activityId: string, _reason: string, _actorId: string): Promise<Result<OpenActivityDto, BaseAppError>> {
    return Failure(new InvalidActivityStateError('Administrative cancellation is currently unsupported (SPEC-001 not implemented)'));
  }

  public async getActivityHistory(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>> {
    return this.logRepo.findLogsByActivityId(activityId);
  }
}
