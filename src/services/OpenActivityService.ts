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
import { ITreEngineService } from '@/services/ITreEngineService';
import { TreResolutionContext } from '@/types/tre';
import { mapTreSelectionToActivityTrade } from '@/services/mappers/treTradeSelectionMapper';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';
import { WorkforceResolutionContext, WorkforceResolutionObservabilityEvent } from '@/types/wre';
import { mapWreResolutionToActivityWorkforceCount } from '@/services/mappers/wreRecommendationMapper';
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
  readonly treEngine: ITreEngineService;
  readonly workforceEngine: IWorkforceEngineService;
}

/**
 * Structured observability payload for TRE resolution outcomes.
 * Enables platform metrics: MSP hit rate, KRE hit rate,
 * Trade Library fallback rate, TRE failure rate.
 */
interface TreResolutionObservabilityEvent {
  readonly requestId: string;
  readonly activityId: string | null;
  readonly programmeId: string;
  readonly taskId: string | undefined;
  readonly resolutionStage:
    | 'MSP_RESOURCE'
    | 'KNOWLEDGE_ENGINE'
    | 'TRADE_LIBRARY'
    | 'ALL_SOURCES_EXHAUSTED';
  readonly resolutionOutcome: 'RESOLVED' | 'NOT_FOUND' | 'ENGINE_ERROR';
  readonly failureReason: string | null;
  readonly failureCode: string | null;
  readonly durationMs: number;
  readonly timestamp: string;
}

export class OpenActivityService implements IOpenActivityService {
  private readonly activityRepo: IOpenActivityRepository;
  private readonly logRepo: IActivityLogRepository;
  private readonly txManager: ITransactionManager;
  private readonly clock: IClock;
  private readonly logger: Logger;
  private readonly eventPublisher: IDomainEventPublisher;
  private readonly treEngine: ITreEngineService;
  private readonly workforceEngine: IWorkforceEngineService;

  constructor(deps: IOpenActivityServiceDependencies) {
    this.activityRepo = deps.activityRepository;
    this.logRepo = deps.logRepository;
    this.txManager = deps.transactionManager;
    this.clock = deps.clock;
    this.logger = deps.logger;
    this.eventPublisher = deps.eventPublisher;
    this.treEngine = deps.treEngine;
    this.workforceEngine = deps.workforceEngine;
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

    const requestId = generateUuid();
    const now = this.clock.nowIso();
    const activityId = generateUuid();

    // TRE auto-resolution: only when caller did not supply a tradeSelection
    let resolvedTradeInfo: OpenActivity['tradeInfo'] = cmd.tradeSelection;

    if (cmd.tradeSelection === undefined) {
      const treCtx: TreResolutionContext = {
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        mspTaskId: cmd.taskId,
        activityName: cmd.activityName,
      };

      const treStart = Date.now();
      const treResult = await this.treEngine.resolveTradeRecommendation(treCtx);
      const durationMs = Date.now() - treStart;

      if (isSuccess(treResult)) {
        resolvedTradeInfo = mapTreSelectionToActivityTrade(treResult.value);

        const resolutionStage = ((): TreResolutionObservabilityEvent['resolutionStage'] => {
          switch (treResult.value.resolutionSource) {
            case 'MSP_RESOURCE': return 'MSP_RESOURCE';
            case 'KNOWLEDGE_ENGINE': return 'KNOWLEDGE_ENGINE';
            case 'TRADE_LIBRARY': return 'TRADE_LIBRARY';
          }
        })();

        const observabilityEvent: TreResolutionObservabilityEvent = {
          requestId,
          activityId,
          programmeId: cmd.programmeId,
          taskId: cmd.taskId,
          resolutionStage,
          resolutionOutcome: 'RESOLVED',
          failureReason: null,
          failureCode: null,
          durationMs,
          timestamp: this.clock.nowIso(),
        };
        this.logger.info('TRE resolution succeeded', { treResolution: observabilityEvent });
      } else {
        // Soft failure — TRE failure MUST NEVER fail activity creation
        const error = treResult.error;
        const isNotFound = error.errorCode === 'NO_TRADE_RECOMMENDATION_FOUND';

        const observabilityEvent: TreResolutionObservabilityEvent = {
          requestId,
          activityId,
          programmeId: cmd.programmeId,
          taskId: cmd.taskId,
          resolutionStage: 'ALL_SOURCES_EXHAUSTED',
          resolutionOutcome: isNotFound ? 'NOT_FOUND' : 'ENGINE_ERROR',
          failureReason: error.message,
          failureCode: error.errorCode,
          durationMs,
          timestamp: this.clock.nowIso(),
        };

        if (isNotFound) {
          this.logger.warn(
            'TRE resolution exhausted all sources — activity will be created without trade assignment',
            { treResolution: observabilityEvent }
          );
        } else {
          this.logger.error(
            'TRE engine error — activity will be created without trade assignment',
            { treResolution: observabilityEvent }
          );
        }

        resolvedTradeInfo = undefined;
      }
    }

    // WRE auto-resolution: only when caller did not supply workforceCount and trade is resolved
    let resolvedWorkforceCount: number | undefined = cmd.workforceCount;

    if (cmd.workforceCount === undefined && resolvedTradeInfo !== undefined) {
      const wreCtx: WorkforceResolutionContext = {
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        mspTaskId: cmd.taskId,
        activityName: cmd.activityName,
        tradeSelection: resolvedTradeInfo,
        location: cmd.location,
      };

      const wreStart = Date.now();
      const wreResult = await this.workforceEngine.resolveWorkforceRecommendation(wreCtx);
      const durationMs = Date.now() - wreStart;

      if (isSuccess(wreResult)) {
        resolvedWorkforceCount = mapWreResolutionToActivityWorkforceCount(wreResult.value);

        const observabilityEvent: WorkforceResolutionObservabilityEvent = {
          requestId,
          activityId,
          programmeId: cmd.programmeId,
          tradeId: resolvedTradeInfo.tradeId,
          resolutionSource: wreResult.value.resolutionSource,
          confidenceLevel: wreResult.value.confidenceLevel,
          evaluationStage: wreResult.value.diagnostics.evaluationStage,
          durationMs,
          workforceCount: resolvedWorkforceCount,
          timestamp: this.clock.nowIso(),
        };
        this.logger.info('WRE resolution succeeded', { wreResolution: observabilityEvent });
      } else {
        // Soft failure — WRE failure MUST NEVER fail activity creation
        const error = wreResult.error;
        const isNotFound = error.errorCode === 'NO_WORKFORCE_RECOMMENDATION_FOUND';

        const observabilityEvent: WorkforceResolutionObservabilityEvent = {
          requestId,
          activityId,
          programmeId: cmd.programmeId,
          tradeId: resolvedTradeInfo.tradeId,
          resolutionSource: null,
          confidenceLevel: null,
          evaluationStage: 'ALL_SOURCES_EXHAUSTED',
          durationMs,
          workforceCount: 0,
          timestamp: this.clock.nowIso(),
        };

        if (isNotFound) {
          this.logger.warn(
            'WRE resolution exhausted all sources — activity will be created without workforce assignment',
            { wreResolution: observabilityEvent, failureReason: error.message, failureCode: error.errorCode }
          );
        } else {
          this.logger.error(
            'WRE engine error — activity will be created without workforce assignment',
            { wreResolution: observabilityEvent, failureReason: error.message, failureCode: error.errorCode }
          );
        }
      }
    }

    try {
      const newActivity: OpenActivity = {
        activityId,
        siteDiaryId: cmd.siteDiaryId,
        programmeId: cmd.programmeId,
        taskId: cmd.taskId,
        activityName: cmd.activityName,
        location: cmd.location,
        tradeInfo: resolvedTradeInfo,
        workforceCount: resolvedWorkforceCount,
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

      const updatedAt = this.clock.nowIso();
      const updatedActivity: OpenActivity = {
        ...existingRes.value,
        activityName: cmd.activityName ?? existingRes.value.activityName,
        location: cmd.location ?? existingRes.value.location,
        tradeInfo: cmd.tradeSelection ?? existingRes.value.tradeInfo,
        workforceCount: cmd.workforceCount ?? existingRes.value.workforceCount,
        updatedAt,
        updatedBy: cmd.updatedBy,
      };

      const logEntry: ActivityLogEntry = {
        logId: generateUuid(),
        activityId: cmd.activityId,
        siteDiaryId: existingRes.value.siteDiaryId,
        eventType: 'UPDATE',
        snapshotData: { ...updatedActivity },
        loggedAt: updatedAt,
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
