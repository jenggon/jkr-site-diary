import { describe, it, expect, vi } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { OpenActivityRepository, OpenActivityRow } from '@/repositories/OpenActivityRepository';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { IDomainEventPublisher } from '@/events/IDomainEventPublisher';
import { ITreEngineService } from '@/services/ITreEngineService';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';
import { IMaterialEngineService } from '@/services/IMaterialEngineService';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { Task } from '@/types/task';
import { OpenActivity } from '@/types/openActivity';
import { isSuccess, isFailure, Success } from '@/lib/result';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { CreateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';
import { MaterialRecommendationSnapshot } from '@/types/mre';
import { TradeSelection } from '@/types/tre';

describe('REM-005 Open Activity API and Schema Mapping Test Suite', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-09T22:00:00Z',
    nowUtcDate: () => new Date('2026-08-09T22:00:00Z'),
  };
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger;
  const mockEventPublisher: IDomainEventPublisher = { publish: vi.fn().mockResolvedValue(undefined) };
  const mockTxManager: ITransactionManager = { execute: async (cb) => cb() };

  const mockTradeSelection: TradeSelection = {
    tradeId: 't1',
    tradeCode: 'CONC',
    tradeName: 'Concretor',
    tradeCategory: 'General',
    resolutionSource: 'TRADE_LIBRARY',
  };

  const mockTreEngine: ITreEngineService = {
    resolveTradeRecommendation: vi.fn().mockResolvedValue(Success(mockTradeSelection)),
  };

  const mockWorkforceEngine: IWorkforceEngineService = {
    recommend: vi.fn(),
    resolveWorkforceRecommendation: vi.fn().mockResolvedValue(Success({
      recommendation: {
        items: [{ roleCode: 'GENERAL', tradeId: 't1', tradeCode: 'CONC', tradeName: 'Concretor', recommendedCount: 5, skillLevel: 'GENERAL', isMandatory: false }],
        totalWorkforceCount: 5,
      },
      resolutionSource: 'TRADE_WORKFORCE_LIBRARY',
      confidenceLevel: 'MEDIUM',
      provenance: { repository: 'TradeWorkforceLibraryRepository', evaluator: null, ruleId: null, ruleVersion: null, matchedPriority: 'TRADE_WORKFORCE_LIBRARY', matchedDiscipline: null },
      diagnostics: { evaluationStage: 'TRADE_WORKFORCE_LIBRARY', durationMs: 10, evaluatorsAttemptedCount: 0, timestamp: '2026-08-07T12:00:00Z' },
      reasoning: { reasonCode: 'DEFAULT', reasonDescription: 'Default resolution' },
    })),
  } as unknown as IWorkforceEngineService;

  const mockMaterialEngine: IMaterialEngineService = {
    recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),
    resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),
  } as unknown as IMaterialEngineService;

  const mockLogRepo: IActivityLogRepository = {
    appendLog: vi.fn().mockResolvedValue(Success({} as ActivityLogEntry)),
    findLogsByActivityId: vi.fn().mockResolvedValue(Success([])),
  };

  const revR1Approved: ProgrammeRevision = {
    revisionId: 'rev-r1',
    programmeId: 'prog-1',
    revisionNumber: 1,
    revisionTitle: 'Revision 1',
    isCurrent: true,
    status: 'Approved',
    createdBy: 'user-1',
    createdAt: '2026-08-01T00:00:00Z',
  };

  const revR1Superseded: ProgrammeRevision = {
    ...revR1Approved,
    isCurrent: false,
    status: 'Superseded',
  };

  const revR2Approved: ProgrammeRevision = {
    revisionId: 'rev-r2',
    programmeId: 'prog-1',
    revisionNumber: 2,
    revisionTitle: 'Revision 2',
    isCurrent: true,
    status: 'Approved',
    createdBy: 'user-1',
    createdAt: '2026-08-05T00:00:00Z',
  };

  const taskR1: Task = {
    task_id: 'task-r1',
    programme_id: 'prog-1',
    revision_id: 'rev-r1',
    task_uid: 101,
    task_guid: null,
    wbs: '1.1',
    task_name: 'Excavation R1',
    parent_task_uid: null,
    outline_level: 1,
    outline_number: '1.1',
    trade_code: 'EXC',
    trade_name: 'Excavator',
    display_order: 1,
    planned_start: '2026-08-01',
    planned_finish: '2026-08-10',
    planned_duration_days: 10,
    is_milestone: false,
    is_critical: false,
    is_summary: false,
    constraint_type: null,
    constraint_date: null,
    created_at: '2026-08-01T00:00:00Z',
    created_by: 'user-1',
  };

  const taskR2: Task = {
    ...taskR1,
    task_id: 'task-r2',
    revision_id: 'rev-r2',
    task_name: 'Excavation R2',
  };

  const mockRevisionRepo = (revisions: Record<string, ProgrammeRevision>): IProgrammeRevisionRepository => ({
    findById: async (id: string) => Success(revisions[id] ?? null),
    findByProgrammeId: async () => Success([]),
    findActiveRevision: async () => Success(null),
    create: async () => { throw new Error('Not implemented'); },
    updateStatus: async () => { throw new Error('Not implemented'); },
  });

  const mockTaskRepo = (tasks: Record<string, Task>) => ({
    getTaskById: async (id: string) => tasks[id] ?? null,
  });

  function createService(
    revisions: Record<string, ProgrammeRevision>,
    tasks: Record<string, Task>,
    activityRepo: IOpenActivityRepository
  ) {
    return new OpenActivityService({
      activityRepository: activityRepo,
      logRepository: mockLogRepo,
      transactionManager: mockTxManager,
      revisionRepository: mockRevisionRepo(revisions),
      taskRepository: mockTaskRepo(tasks),
      clock: mockClock,
      logger: mockLogger,
      eventPublisher: mockEventPublisher,
      treEngine: mockTreEngine,
      workforceEngine: mockWorkforceEngine,
      materialEngine: mockMaterialEngine,
    });
  }

  // --- Mandatory F-01 Scenarios ---

  it('TEST-REM005-01: Valid revision_id + valid task revision → activity creation succeeds', async () => {
    let capturedActivity: OpenActivity | undefined;
    const mockActivityRepo: IOpenActivityRepository = {
      create: async (act) => { capturedActivity = act; return Success(act); },
      findById: async () => Success(null),
      findBySiteDiaryId: async () => Success([]),
      findByRevisionId: async () => Success([]),
      update: async () => { throw new Error('Not implemented'); },
      updateStatus: async () => { throw new Error('Not implemented'); },
    };

    const service = createService({ 'rev-r1': revR1Approved }, { 'task-r1': taskR1 }, mockActivityRepo);

    const dto: CreateActivityRequestDto = {
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-r1',
      activity_name: 'Concrete Pouring',
      created_by: 'user-1',
    };

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: dto.programme_id,
      revisionId: dto.revision_id,
      taskId: dto.task_id,
      activityName: dto.activity_name,
      createdBy: dto.created_by,
    });

    expect(isSuccess(res)).toBe(true);
    expect(capturedActivity).toBeDefined();
    if (isSuccess(res)) {
      expect(res.value.revisionId).toBe('rev-r1');
      expect(res.value.programmeId).toBe('prog-1');
      expect(res.value.taskId).toBe('task-r1');
      
      const responseDto = mapActivityToResponseDto(res.value);
      expect(responseDto.revision_id).toBe('rev-r1');
    }
  });

  it('TEST-REM005-02: Missing revision_id → request rejected', async () => {
    const mockActivityRepo: IOpenActivityRepository = {
      create: async (act) => Success(act),
      findById: async () => Success(null),
      findBySiteDiaryId: async () => Success([]),
      findByRevisionId: async () => Success([]),
      update: async () => { throw new Error('Not implemented'); },
      updateStatus: async () => { throw new Error('Not implemented'); },
    };

    const service = createService({ 'rev-r1': revR1Approved }, { 'task-r1': taskR1 }, mockActivityRepo);

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1',
      revisionId: '', // Empty / missing revision_id
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('revisionId is required');
    }
  });

  it('TEST-REM005-03: Revision_id belongs to different programme → rejected', async () => {
    const mockActivityRepo = {} as IOpenActivityRepository;
    const revOtherProg: ProgrammeRevision = { ...revR1Approved, programmeId: 'prog-other' };
    const service = createService({ 'rev-r1': revOtherProg }, {}, mockActivityRepo);

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1', // Mismatch with revOtherProg
      revisionId: 'rev-r1',
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('programme/revision mismatch');
    }
  });

  it('TEST-REM005-04: Revision_id does not match task revision → rejected', async () => {
    const mockActivityRepo = {} as IOpenActivityRepository;
    const service = createService({ 'rev-r1': revR1Approved }, { 'task-r2': taskR2 }, mockActivityRepo);

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1',
      revisionId: 'rev-r1',
      taskId: 'task-r2', // Belongs to rev-r2, not rev-r1
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('task/revision mismatch');
    }
  });

  it('TEST-REM005-05: Superseded revision → rejected', async () => {
    const mockActivityRepo = {} as IOpenActivityRepository;
    const service = createService({ 'rev-r1': revR1Superseded }, { 'task-r1': taskR1 }, mockActivityRepo);

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1',
      revisionId: 'rev-r1',
      taskId: 'task-r1',
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('Cannot create activity under Superseded revision');
    }
  });

  it('TEST-REM005-06: Same task UID exists in another revision → correct revision is selected and persisted', async () => {
    const mockActivityRepo: IOpenActivityRepository = {
      create: async (act) => Success(act),
      findById: async () => Success(null),
      findBySiteDiaryId: async () => Success([]),
      findByRevisionId: async () => Success([]),
      update: async () => { throw new Error('Not implemented'); },
      updateStatus: async () => { throw new Error('Not implemented'); },
    };

    const service = createService(
      { 'rev-r1': revR1Approved, 'rev-r2': revR2Approved },
      { 'task-r1': taskR1, 'task-r2': taskR2 },
      mockActivityRepo
    );

    // Creating against R2 with R2 task (same task_uid 101 as R1 task)
    const res = await service.createActivity({
      siteDiaryId: 'sd-101',
      programmeId: 'prog-1',
      revisionId: 'rev-r2',
      taskId: 'task-r2',
      activityName: 'Excavation',
      createdBy: 'user-1',
    });

    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.revisionId).toBe('rev-r2');
      expect(res.value.taskId).toBe('task-r2');
    }
  });

  it('TEST-REM005-07: R1 task + R2 revision → rejected', async () => {
    const mockActivityRepo = {} as IOpenActivityRepository;
    const service = createService(
      { 'rev-r2': revR2Approved },
      { 'task-r1': taskR1 },
      mockActivityRepo
    );

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1',
      revisionId: 'rev-r2',
      taskId: 'task-r1', // task-r1 belongs to rev-r1
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('task/revision mismatch');
    }
  });

  it('TEST-REM005-08: R2 task + R1 revision → rejected', async () => {
    const mockActivityRepo = {} as IOpenActivityRepository;
    const service = createService(
      { 'rev-r1': revR1Approved },
      { 'task-r2': taskR2 },
      mockActivityRepo
    );

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1',
      revisionId: 'rev-r1',
      taskId: 'task-r2', // task-r2 belongs to rev-r2
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('task/revision mismatch');
    }
  });

  // --- Mandatory F-02 Scenarios ---

  it('TEST-REM005-09: Repository create mapping matches actual DDL', async () => {
    let insertedRow: Record<string, unknown> | undefined;
    const mockAdapter: IDatabaseAdapter = {
      insert: async <T>(_table: string, row: Record<string, unknown>) => {
        insertedRow = row;
        return Success(row as unknown as T);
      },
      selectOne: async <T>() => Success(null as unknown as T),
      selectMany: async <T>() => Success([] as unknown as T[]),
      update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => Success(updates as unknown as T),
      exists: async () => Success(false),
    };

    const repo = new OpenActivityRepository(mockAdapter);

    const snapshot: MaterialRecommendationSnapshot = {
      snapshotId: 'snap-1',
      activityId: 'act-1',
      siteDiaryId: 'sd-1',
      resolutionSource: 'TRADE_MATERIAL_LIBRARY',
      confidenceLevel: 'HIGH',
      items: [],
      reasonCode: 'OK',
      reasonDescription: 'Resolved via trade',
      snapshottedAt: '2026-08-09T22:00:00Z',
    };

    const activity: OpenActivity = {
      activityId: 'act-1',
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-r1',
      taskId: 'task-1',
      activityName: 'Piling Work',
      location: { zone: 'Zone A' },
      tradeInfo: { tradeId: 't1', tradeCode: 'CONC', tradeName: 'Concretor', source: 'TradeLibrary' },
      workforceCount: 5,
      materialSnapshot: snapshot,
      status: 'Planned',
      isLocked: false,
      createdAt: '2026-08-09T22:00:00Z',
      createdBy: 'user-1',
    };

    const res = await repo.create(activity);
    expect(isSuccess(res)).toBe(true);
    expect(insertedRow).toBeDefined();
    if (insertedRow) {
      expect(insertedRow.id).toBe('act-1');
      expect(insertedRow.site_diary_id).toBe('sd-1');
      expect(insertedRow.programme_id).toBe('prog-1');
      expect(insertedRow.revision_id).toBe('rev-r1');
      expect(insertedRow.task_id).toBe('task-1');
      expect(insertedRow.activity_name).toBe('Piling Work');
      expect(insertedRow.material_snapshot).toBeDefined();
    }
  });

  it('TEST-REM005-10: Repository read mapping matches actual DDL', async () => {
    const rawRow: OpenActivityRow = {
      id: 'act-1',
      site_diary_id: 'sd-1',
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-1',
      activity_name: 'Piling Work',
      location: { zone: 'Zone A' },
      trade_info: { tradeId: 't1', tradeCode: 'CONC', tradeName: 'Concretor', source: 'TradeLibrary' },
      workforce_count: 5,
      material_snapshot: { snapshotId: 'snap-1' },
      status: 'Planned',
      is_locked: false,
      created_at: '2026-08-09T22:00:00Z',
      created_by: 'user-1',
    };

    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success(rawRow as unknown as T),
      insert: async <T>(_table: string, row: Record<string, unknown>) => Success(row as unknown as T),
      selectMany: async <T>() => Success([] as unknown as T[]),
      update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => Success(updates as unknown as T),
      exists: async () => Success(false),
    };

    const repo = new OpenActivityRepository(mockAdapter);
    const res = await repo.findById('act-1');

    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res) && res.value) {
      expect(res.value.activityId).toBe('act-1');
      expect(res.value.siteDiaryId).toBe('sd-1');
      expect(res.value.programmeId).toBe('prog-1');
      expect(res.value.revisionId).toBe('rev-r1');
      expect(res.value.taskId).toBe('task-1');
      expect(res.value.materialSnapshot).toBeDefined();
    }
  });

  it('TEST-REM005-11: Repository update mapping matches actual DDL', async () => {
    let updatedRow: Record<string, unknown> | undefined;
    const mockAdapter: IDatabaseAdapter = {
      update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => {
        updatedRow = updates;
        return Success(updates as unknown as T);
      },
      selectOne: async <T>() => Success(null as unknown as T),
      selectMany: async <T>() => Success([] as unknown as T[]),
      insert: async <T>(_table: string, row: Record<string, unknown>) => Success(row as unknown as T),
      exists: async () => Success(false),
    };

    const repo = new OpenActivityRepository(mockAdapter);

    const activity: OpenActivity = {
      activityId: 'act-1',
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-r1',
      taskId: 'task-1',
      activityName: 'Updated Piling Work',
      status: 'InProgress',
      isLocked: false,
      createdAt: '2026-08-09T22:00:00Z',
      createdBy: 'user-1',
      updatedAt: '2026-08-09T22:10:00Z',
      updatedBy: 'user-2',
    };

    const res = await repo.update(activity);
    expect(isSuccess(res)).toBe(true);
    expect(updatedRow).toBeDefined();
    if (updatedRow) {
      expect(updatedRow.id).toBe('act-1');
      expect(updatedRow.activity_name).toBe('Updated Piling Work');
      expect(updatedRow.status).toBe('InProgress');
    }
  });

  it('TEST-REM005-12: No undefined/non-existent column is referenced by OpenActivityRepository', async () => {
    const mockAdapter: IDatabaseAdapter = {
      insert: async <T>(_table: string, row: Record<string, unknown>) => {
        const allowedColumns = new Set([
          'id', 'site_diary_id', 'programme_id', 'revision_id', 'task_id',
          'activity_name', 'location', 'trade_info', 'workforce_count',
          'material_snapshot', 'status', 'is_locked', 'created_at', 'created_by',
          'updated_at', 'updated_by'
        ]);

        for (const key of Object.keys(row)) {
          expect(allowedColumns.has(key)).toBe(true);
        }
        return Success(row as unknown as T);
      },
      selectOne: async <T>() => Success(null as unknown as T),
      selectMany: async <T>() => Success([] as unknown as T[]),
      update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => Success(updates as unknown as T),
      exists: async () => Success(false),
    };

    const repo = new OpenActivityRepository(mockAdapter);

    const activity: OpenActivity = {
      activityId: 'act-1',
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-r1',
      activityName: 'Clean Column Test',
      status: 'Planned',
      isLocked: false,
      createdAt: '2026-08-09T22:00:00Z',
      createdBy: 'user-1',
    };

    const res = await repo.create(activity);
    expect(isSuccess(res)).toBe(true);
  });
});
