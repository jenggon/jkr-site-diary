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
    revisionRepo?: Partial<import('@/repositories/IProgrammeRevisionRepository').IProgrammeRevisionRepository>;
    txManager?: ITransactionManager;
    eventPublisher?: IDomainEventPublisher;
    logger?: Logger;
  }) {
    const activityRepo: IActivityRepository = {
      findById: async () => Success(sampleActivity),
      findByRevisionId: async () => Success([sampleActivity]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      findOpenActivitiesByProgramme: async () => import("@/lib/result").then(m => m.Success([])),
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
      revisionRepository: {
        findById: async () => import("@/lib/result").then(m => m.Success({ revisionId: 'rev-001', programmeId: 'prog-1', status: 'Approved', isCurrent: true, revisionNumber: 1, revisionTitle: 'Rev 1', createdAt: '2026-08-01', createdBy: 'user-1' } as unknown as import('@/types/programmeRevision').ProgrammeRevision)),
        findActiveRevision: async (progId: string) => import("@/lib/result").then(m => m.Success({ revisionId: 'rev-001', programmeId: progId, status: 'Approved', isCurrent: true, revisionNumber: 1, revisionTitle: 'Rev 1', createdAt: '2026-08-01', createdBy: 'user-1' } as unknown as import('@/types/programmeRevision').ProgrammeRevision)),
        ...overrides?.revisionRepo,
      } as unknown as import('@/repositories/IProgrammeRevisionRepository').IProgrammeRevisionRepository,
      taskRepository: {
        getTaskById: async () => ({
          task_id: 'task-1',
          programme_id: 'prog-1',
          revision_id: 'rev-001',
        } as unknown as import('@/types/task').Task),
      },
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
      taskId: 'task-1',
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

  // -----------------------------------------------------------------------
  // Canonical Activity Provisioning Tests (Blocker 2)
  // -----------------------------------------------------------------------

  describe('Canonical Activity Provisioning', () => {
    it('1. Missing task_id -> 400 (ActivityValidationError)', async () => {
      const service = createService();
      const result = await service.createActivity({
        programmeId: 'prog-1',
        revisionId: 'rev-001',
        taskId: '', // missing
        activityName: 'Test',
        createdBy: 'user-1',
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toContain('taskId is required');
      }
    });

    it('2. Invalid/nonexistent task -> rejection', async () => {
      const s = new OpenActivityService({
        activityRepository: { create: async (a: Activity) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityRepository,
        logRepository: { appendLog: async (a: ActivityLogEntry) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityLogRepository,
        transactionManager: mockTxManager,
        clock: mockClock,
        logger: mockLogger,
        eventPublisher: mockEventPublisher,
        taskRepository: {
          getTaskById: async () => null,
        },
      });

      const result = await s.createActivity({
        programmeId: 'prog-1',
        revisionId: 'rev-001',
        taskId: 'invalid-task',
        activityName: 'Test',
        createdBy: 'user-1',
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('Task not found');
      }
    });

    it('3. Task belonging to another Programme -> rejection', async () => {
      const s = new OpenActivityService({
        activityRepository: { create: async (a: Activity) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityRepository,
        logRepository: { appendLog: async (a: ActivityLogEntry) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityLogRepository,
        transactionManager: mockTxManager,
        clock: mockClock,
        logger: mockLogger,
        eventPublisher: mockEventPublisher,
        taskRepository: {
          getTaskById: async () => ({
            task_id: 'task-1',
            programme_id: 'wrong-prog',
            revision_id: 'rev-001',
          } as unknown as import('@/types/task').Task),
        },
      });

      const result = await s.createActivity({
        programmeId: 'prog-1',
        revisionId: 'rev-001',
        taskId: 'task-1',
        activityName: 'Test',
        createdBy: 'user-1',
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('programme/task mismatch');
      }
    });

    it('4. Task belonging to another Revision -> rejection', async () => {
      const s = new OpenActivityService({
        activityRepository: { create: async (a: Activity) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityRepository,
        logRepository: { appendLog: async (a: ActivityLogEntry) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityLogRepository,
        transactionManager: mockTxManager,
        clock: mockClock,
        logger: mockLogger,
        eventPublisher: mockEventPublisher,
        taskRepository: {
          getTaskById: async () => ({
            task_id: 'task-1',
            programme_id: 'prog-1',
            revision_id: 'wrong-rev',
          } as unknown as import('@/types/task').Task),
        },
      });

      const result = await s.createActivity({
        programmeId: 'prog-1',
        revisionId: 'rev-001',
        taskId: 'task-1',
        activityName: 'Test',
        createdBy: 'user-1',
      });
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('task/revision mismatch');
      }
    });

    it('5. Valid Programme + Revision + Task -> successful canonical Activity provisioning', async () => {
      const s = new OpenActivityService({
        activityRepository: { create: async (a: Activity) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityRepository,
        logRepository: { appendLog: async (a: ActivityLogEntry) => import("@/lib/result").then(m => m.Success(a)) } as unknown as IActivityLogRepository,
        transactionManager: mockTxManager,
        clock: mockClock,
        logger: mockLogger,
        eventPublisher: mockEventPublisher,
        taskRepository: {
          getTaskById: async () => ({
            task_id: 'task-1',
            programme_id: 'prog-1',
            revision_id: 'rev-001',
          } as unknown as import('@/types/task').Task),
        },
      });

      const result = await s.createActivity({
        programmeId: 'prog-1',
        revisionId: 'rev-001',
        taskId: 'task-1',
        activityName: 'Test Activity',
        createdBy: 'user-1',
      });
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('getOpenActivities', () => {
    it('should return open activities successfully filtered by current revision', async () => {
      let passedRevisionId: string | undefined;
      const service = createService({
        activityRepo: {
          findOpenActivitiesByProgramme: async (progId: string, revId?: string) => {
            passedRevisionId = revId;
            return Success([
              { ...sampleActivity, activity_id: 'act-1', status: ActivityStatus.New, programme_id: progId, revision_id: revId ?? 'rev-001' },
              { ...sampleActivity, activity_id: 'act-2', status: ActivityStatus.InProgress, programme_id: progId, revision_id: revId ?? 'rev-001' }
            ]);
          },
        }
      });
      const result = await service.getOpenActivities('prog-1');
      expect(isSuccess(result)).toBe(true);
      expect(passedRevisionId).toBe('rev-001');
      if (isSuccess(result) && result.value) {
        expect(result.value).toHaveLength(2);
        expect(result.value?.[0]?.status).toBe(ActivityStatus.New);
        expect(result.value?.[0]?.isLocked).toBe(false);
        expect(result.value?.[1]?.status).toBe(ActivityStatus.InProgress);
        expect(result.value?.[1]?.isLocked).toBe(false);
      }
    });

    it('should return empty array if no active approved current revision exists', async () => {
      const service = createService({
        revisionRepo: {
          findActiveRevision: async () => Success(null),
        }
      });
      const result = await service.getOpenActivities('prog-1');
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result) && result.value) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return empty array if active revision is not Approved', async () => {
      const service = createService({
        revisionRepo: {
          findActiveRevision: async () => Success({
            revisionId: 'rev-draft',
            programmeId: 'prog-1',
            status: 'Draft',
            isCurrent: true,
            revisionNumber: 1,
            revisionTitle: 'Draft',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          }),
        }
      });
      const result = await service.getOpenActivities('prog-1');
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result) && result.value) {
        expect(result.value).toEqual([]);
      }
    });

    it('should return error if programmeId is missing', async () => {
      const service = createService();
      const result = await service.getOpenActivities('');
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toContain('programmeId is required');
      }
    });
  });
});
