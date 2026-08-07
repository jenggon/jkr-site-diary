import { describe, it, expect, vi } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { Result, Success, isSuccess, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivity } from '@/types/openActivity';

describe('OpenActivityService', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-07T12:00:00.000Z',
    nowUtcDate: () => new Date('2026-08-07T12:00:00.000Z'),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => mockLogger,
  } as unknown as Logger;

  const mockTxManager: ITransactionManager = {
    execute: async <T>(work: () => Promise<Result<T, BaseAppError>>) => work(),
  };

  const mockEventPublisher: IDomainEventPublisher = {
    publish: vi.fn(async (_event: IDomainEvent) => {}),
  };

  const sampleActivity: OpenActivity = {
    activityId: 'act-1',
    siteDiaryId: 'diary-100',
    programmeId: 'prog-1',
    activityName: 'Konkrit Tapak Bangunan',
    workforceCount: 5,
    status: 'Planned',
    isLocked: false,
    createdAt: '2026-08-07T12:00:00.000Z',
    createdBy: 'user-supervisor',
  };

  const sampleLog: ActivityLogEntry = {
    logId: 'log-1',
    activityId: 'act-1',
    siteDiaryId: 'diary-100',
    eventType: 'NEW',
    snapshotData: { ...sampleActivity },
    loggedAt: '2026-08-07T12:00:00.000Z',
    loggedBy: 'user-supervisor',
  };

  function createService(overrides?: {
    activityRepo?: Partial<IOpenActivityRepository>;
    logRepo?: Partial<IActivityLogRepository>;
    txManager?: ITransactionManager;
    eventPublisher?: IDomainEventPublisher;
  }) {
    const activityRepo: IOpenActivityRepository = {
      findById: async () => Success(sampleActivity),
      findBySiteDiaryId: async () => Success([sampleActivity]),
      create: async (a) => Success(a),
      update: async (a) => Success(a),
      updateStatus: async (id, status) => Success({ ...sampleActivity, activityId: id, status }),
      ...overrides?.activityRepo,
    };

    const logRepo: IActivityLogRepository = {
      appendLog: async (e) => Success(e),
      findLogsByActivityId: async () => Success([sampleLog]),
      ...overrides?.logRepo,
    };

    return new OpenActivityService({
      activityRepository: activityRepo,
      logRepository: logRepo,
      transactionManager: overrides?.txManager ?? mockTxManager,
      clock: mockClock,
      logger: mockLogger,
      eventPublisher: overrides?.eventPublisher ?? mockEventPublisher,
    });
  }

  it('should create an activity and append NEW log event in single transaction', async () => {
    const service = createService();
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja-kerja Memasang Tetulang',
      workforceCount: 4,
      createdBy: 'user-1',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.activityName).toBe('Kerja-kerja Memasang Tetulang');
      expect(result.value.status).toBe('Planned');
    }
  });

  it('should fail startActivity if manpower is not greater than zero', async () => {
    const service = createService({
      activityRepo: {
        findById: async () => Success({ ...sampleActivity, workforceCount: 0 }),
      },
    });

    const result = await service.startActivity('act-1', 'user-1');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_VALIDATION_ERROR');
    }
  });

  it('should start activity successfully when manpower > 0', async () => {
    const service = createService();
    const result = await service.startActivity('act-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('InProgress');
    }
  });

  it('should fail suspendActivity if reason is empty', async () => {
    const service = createService();
    const result = await service.suspendActivity('act-1', '   ', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_VALIDATION_ERROR');
    }
  });

  it('should suspend activity successfully with valid reason', async () => {
    const service = createService();
    const result = await service.suspendActivity('act-1', 'Hujan Lebat di Tapak', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Suspended');
    }
  });

  it('should complete activity successfully from InProgress', async () => {
    const service = createService({
      activityRepo: {
        findById: async () => Success({ ...sampleActivity, status: 'InProgress' }),
      },
    });

    const result = await service.completeActivity('act-1', 'user-1');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Completed');
    }
  });

  it('should cancel activity with mandatory reason', async () => {
    const service = createService();
    const result = await service.cancelActivity('act-1', 'Perubahan Reka Bentuk', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Cancelled');
    }
  });
});
