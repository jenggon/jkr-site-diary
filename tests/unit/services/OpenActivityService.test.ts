import { describe, it, expect, vi } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { Result, Success, isSuccess, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Activity, ActivityStatus } from '@/types/activity';

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

  const sampleActivity: Activity = {
    activity_id: 'act-1',
    programme_id: 'prog-1',
    revision_id: 'rev-001',
    task_id: 'task-1',
    activity_uid: 'ACT-abcdefgh',
    ahi: null,
    ahi_display_name: null,
    subtask: 'Konkrit Tapak Bangunan',
    subtask_display_name: null,
    activity_date: '2026-08-07',
    actual_start_date: null,
    completed_date: null,
    status: ActivityStatus.New,
    weather: null,
    notes: '',
    submitted_by: 'user-supervisor',
    created_at: '2026-08-07T12:00:00.000Z',
    updated_at: null,
  };

  const sampleLog: ActivityLogEntry = {
    logId: 'log-1',
    activityId: 'act-1',
    eventType: 'NEW',
    snapshotData: { ...sampleActivity },
    loggedAt: '2026-08-07T12:00:00.000Z',
    loggedBy: 'user-supervisor',
  };

  function createService(overrides?: {
    activityRepo?: Partial<IActivityRepository>;
    logRepo?: Partial<IActivityLogRepository>;
    txManager?: ITransactionManager;
    eventPublisher?: IDomainEventPublisher;
    logger?: Logger;
  }) {
    const activityRepo: IActivityRepository = {
      findById: async () => Success(sampleActivity),
      findByRevisionId: async () => Success([sampleActivity]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      create: async (a) => Success(a),
      update: async (a) => Success(a),
      updateStatus: async (id, status) => Success({ ...sampleActivity, activity_id: id, status }),
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
      logger: overrides?.logger ?? mockLogger,
      eventPublisher: overrides?.eventPublisher ?? mockEventPublisher,
    });
  }

  // -----------------------------------------------------------------------
  // Existing lifecycle tests
  // -----------------------------------------------------------------------

  it('should create an activity and append NEW log event in single transaction', async () => {
    const service = createService();
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      revisionId: 'rev-001',
      activityName: 'Kerja-kerja Memasang Tetulang',
      createdBy: 'user-1',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.subtask).toBe('Kerja-kerja Memasang Tetulang');
      expect(result.value.status).toBe(ActivityStatus.New);
      expect(result.value.programmeId).toBe('prog-1');
      expect(result.value.revisionId).toBe('rev-001');
    }
  });

  it('should start activity successfully', async () => {
    const service = createService();
    const result = await service.startActivity('act-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe(ActivityStatus.InProgress);
    }
  });

  it('should fail suspendActivity (stubbed per DB-003 constraint)', async () => {
    const service = createService();
    const result = await service.suspendActivity('act-1', 'Hujan Lebat di Tapak', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('INVALID_ACTIVITY_STATE');
    }
  });

  it('should complete activity successfully from InProgress', async () => {
    const service = createService({
      activityRepo: {
        findById: async () => Success({ ...sampleActivity, status: ActivityStatus.InProgress }),
      },
    });

    const result = await service.completeActivity('act-1', 'user-1');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe(ActivityStatus.Completed);
    }
  });

  it('should fail cancelActivity (stubbed per DB-003 constraint)', async () => {
    const service = createService();
    const result = await service.cancelActivity('act-1', 'Perubahan Reka Bentuk', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('INVALID_ACTIVITY_STATE');
    }
  });
});
