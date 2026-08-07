import { Result, Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { BaseAppError, UnknownError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import { generateUuid } from '@/lib/uuid';
import { OpenActivity, ActivityStatus } from '@/types/openActivity';
import { ActivityNotFoundError, ActivityLockedError, ActivityValidationError } from '@/errors/activityErrors';
import { validateActivityStateTransition } from '@/statemachines/siteDiaryStateMachine';
import { validateActivityName, validateReason, validateManpower } from '@/validation/activityValidation';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IDomainEventPublisher } from '@/events/IDomainEventPublisher';
import { ActivityCreatedEvent, ActivityUpdatedEvent, ActivityStatusChangedEvent } from '@/events/activityEvents';
import {
  IOpenActivityService,
  CreateActivityCommand,
  UpdateActivityCommand,
} from './IOpenActivityService';

export interface IOpenActivityServiceDependencies {
  readonly activityRepository: IOpenActivityRepository;
  readonly logRepository: IActivityLogRepository;
  readonly transactionManager: ITransactionManager;
  readonly clock: IClock;
  readonly logger: Logger;
  readonly eventPublisher: IDomainEventPublisher;
}

export class OpenActivityService implements IOpenActivityService {
  private readonly activityRepo: IOpenActivityRepository;
  private readonly logRepo: IActivityLogRepository;
  private readonly txManager: ITransactionManager;
  private readonly clock: IClock;
  private readonly logger: Logger;
  private readonly eventPublisher: IDomainEventPublisher;

  constructor(deps: IOpenActivityServiceDependencies) {
    this.activityRepo = deps.activityRepository;
    this.logRepo = deps.logRepository;
    this.txManager = deps.transactionManager;
    this.clock = deps.clock;
    this.logger = deps.logger;
    this.eventPublisher = deps.eventPublisher;
  }

  private async publishEventSafely(event: unknown): Promise<void> {
    try {
      await this.eventPublisher.publish(event as unknown as import('@/events/IDomainEventPublisher').IDomainEvent);
    } catch (err: unknown) {
      this.logger.error('Failed to publish post-commit activity domain event', { error: err });
    }
  }

  public async createActivity(cmd: CreateActivityCommand): Promise<Result<OpenActivity, BaseAppError>> {
    try {
      validateActivityName(cmd.activityName);
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ActivityValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    try {
      const now = this.clock.nowIso();
      const activityId = generateUuid();

      const newActivity: OpenActivity = {
        activityId,
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        taskId: cmd.taskId,
        activityName: cmd.activityName,
        location: cmd.location,
        tradeInfo: cmd.tradeSelection,
        workforceCount: cmd.workforceCount,
        status: 'Planned',
        isLocked: false,
        createdAt: now,
        createdBy: cmd.createdBy,
      };

      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId,
        siteDiaryId: cmd.siteDiaryId,
        eventType: 'NEW',
        snapshotData: { ...newActivity },
        loggedAt: now,
        loggedBy: cmd.createdBy,
      };

      const txResult = await this.txManager.execute(async () => {
        const createRes = await this.activityRepo.create(newActivity);
        if (isFailure(createRes)) return Failure(createRes.error);

        const logRes = await this.logRepo.appendLog(logEntry);
        if (isFailure(logRes)) return Failure(logRes.error);

        return Success(createRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ActivityCreatedEvent(txResult.value));
      }
      return txResult;
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Failed to create activity', { cause: err }));
    }
  }

  public async updateActivity(cmd: UpdateActivityCommand): Promise<Result<OpenActivity, BaseAppError>> {
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
      if (existingRes.value.isLocked) return Failure(new ActivityLockedError('Cannot update locked activity'));

      const now = this.clock.nowIso();
      const updatedActivity: OpenActivity = {
        ...existingRes.value,
        activityName: cmd.activityName ?? existingRes.value.activityName,
        location: cmd.location ?? existingRes.value.location,
        tradeInfo: cmd.tradeSelection ?? existingRes.value.tradeInfo,
        workforceCount: cmd.workforceCount ?? existingRes.value.workforceCount,
        updatedAt: now,
        updatedBy: cmd.updatedBy,
      };

      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId: cmd.activityId,
        siteDiaryId: existingRes.value.siteDiaryId,
        eventType: 'UPDATE',
        snapshotData: { ...updatedActivity },
        loggedAt: now,
        loggedBy: cmd.updatedBy,
      };

      const txResult = await this.txManager.execute(async () => {
        const updateRes = await this.activityRepo.update(updatedActivity);
        if (isFailure(updateRes)) return Failure(updateRes.error);

        const logRes = await this.logRepo.appendLog(logEntry);
        if (isFailure(logRes)) return Failure(logRes.error);

        return Success(updateRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ActivityUpdatedEvent(txResult.value));
      }
      return txResult;
    } catch (err: unknown) {
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Failed to update activity', { cause: err }));
    }
  }

  private async transitionStatusWithLog(
    activityId: string,
    targetStatus: ActivityStatus,
    actorId: string,
    extraLogData?: Record<string, unknown>
  ): Promise<Result<OpenActivity, BaseAppError>> {
    try {
      const existingRes = await this.activityRepo.findById(activityId);
      if (isFailure(existingRes)) return Failure(existingRes.error);
      if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));
      if (existingRes.value.isLocked) return Failure(new ActivityLockedError('Cannot update status on locked activity'));

      const fromStatus = existingRes.value.status;
      validateActivityStateTransition(fromStatus, targetStatus);

      const now = this.clock.nowIso();
      const updatedActivity: OpenActivity = {
        ...existingRes.value,
        status: targetStatus,
        updatedAt: now,
        updatedBy: actorId,
      };

      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId,
        siteDiaryId: existingRes.value.siteDiaryId,
        eventType: 'UPDATE',
        snapshotData: { ...updatedActivity, ...extraLogData },
        loggedAt: now,
        loggedBy: actorId,
      };

      const txResult = await this.txManager.execute(async () => {
        const updateRes = await this.activityRepo.update(updatedActivity);
        if (isFailure(updateRes)) return Failure(updateRes.error);

        const logRes = await this.logRepo.appendLog(logEntry);
        if (isFailure(logRes)) return Failure(logRes.error);

        return Success(updateRes.value);
      });

      if (isSuccess(txResult)) {
        await this.publishEventSafely(new ActivityStatusChangedEvent(activityId, fromStatus, targetStatus, actorId));
      }
      return txResult;
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new UnknownError(err instanceof Error ? err.message : 'Status transition failed', { cause: err }));
    }
  }

  public async startActivity(activityId: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>> {
    const existingRes = await this.activityRepo.findById(activityId);
    if (isFailure(existingRes)) return Failure(existingRes.error);
    if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));

    try {
      validateManpower(existingRes.value.workforceCount);
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ActivityValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    return this.transitionStatusWithLog(activityId, 'InProgress', actorId);
  }

  public async suspendActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>> {
    try {
      validateReason(reason, 'suspendActivity');
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ActivityValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    return this.transitionStatusWithLog(activityId, 'Suspended', actorId, { suspendReason: reason });
  }

  public async completeActivity(activityId: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>> {
    return this.transitionStatusWithLog(activityId, 'Completed', actorId);
  }

  public async cancelActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>> {
    try {
      validateReason(reason, 'cancelActivity');
    } catch (err: unknown) {
      if (err instanceof BaseAppError) return Failure(err);
      return Failure(new ActivityValidationError(err instanceof Error ? err.message : 'Validation failed'));
    }

    return this.transitionStatusWithLog(activityId, 'Cancelled', actorId, { cancelReason: reason });
  }

  public async getActivitiesForDiary(siteDiaryId: string): Promise<Result<OpenActivity[], BaseAppError>> {
    return this.activityRepo.findBySiteDiaryId(siteDiaryId);
  }

  public async getActivityHistory(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>> {
    return this.logRepo.findLogsByActivityId(activityId);
  }
}
