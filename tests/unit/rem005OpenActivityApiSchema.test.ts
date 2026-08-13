import { describe, it, expect, vi } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { ActivityRepository, ActivityRow } from '@/repositories/activityRepository';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { IDomainEventPublisher } from '@/events/IDomainEventPublisher';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { Task } from '@/types/task';
import { Activity, ActivityStatus } from '@/types/activity';
import { OpenActivityDto } from '@/types/openActivity';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { isSuccess, isFailure, Success } from '@/lib/result';
import { CreateActivityRequestDto } from '@/app/api/_shared/activity.dto';
import { mapActivityToResponseDto } from '@/app/api/_shared/activity.mapper';

describe('REM-005 Canonical Activity API and Schema Mapping Test Suite', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-09T22:00:00Z',
    nowUtcDate: () => new Date('2026-08-09T22:00:00Z'),
  };
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger;
  const mockEventPublisher: IDomainEventPublisher = { publish: vi.fn().mockResolvedValue(undefined) };
  const mockTxManager: ITransactionManager = { execute: async (cb) => cb() };


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
    activityRepo: IActivityRepository
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
    });
  }

  // --- Mandatory F-01 Scenarios ---

  it('TEST-REM005-01: Valid revision_id + valid task revision → activity creation succeeds', async () => {
    let capturedActivity: Activity | undefined;
    const mockActivityRepo: IActivityRepository = {
      create: async (act) => { capturedActivity = act; return Success(act); },
      findById: async () => Success(null),
      findByRevisionId: async () => Success([]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      findOpenActivitiesByProgramme: async () => import("@/lib/result").then(m => m.Success([])),
      update: async () => { throw new Error('Not implemented'); },
      updateStatus: async () => { throw new Error('Not implemented'); },
    };

    const service = createService({ 'rev-r1': revR1Approved }, { 'task-r1': taskR1 }, mockActivityRepo);

    const dto: CreateActivityRequestDto = {
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-r1',
      subtask: 'Concrete Pouring',
      created_by: 'user-1',
    };

    const res = await service.createActivity({
      siteDiaryId: 'sd-100', // Still accepted by service API for context, but not persisted on Activity
      programmeId: dto.programme_id,
      revisionId: dto.revision_id,
      taskId: dto.task_id ?? 'task-r1',
      activityName: dto.subtask,
      createdBy: dto.created_by,
    });

    expect(isSuccess(res)).toBe(true);
    expect(capturedActivity).toBeDefined();
    if (isSuccess(res)) {
      expect(res.value.revisionId).toBe('rev-r1');
      expect(res.value.programmeId).toBe('prog-1');
      expect(res.value.taskId).toBe('task-r1');
      
      const responseDto = mapActivityToResponseDto(res.value as unknown as OpenActivityDto); // mapActivityToResponseDto will be migrated later, bypass typecheck for this specific mapping assertion
      expect(responseDto.revision_id).toBe('rev-r1');
    }
  });

  it('TEST-REM005-02: Missing revision_id → request rejected', async () => {
    const mockActivityRepo: IActivityRepository = {
      create: async (act) => Success(act),
      findById: async () => Success(null),
      findByRevisionId: async () => Success([]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      findOpenActivitiesByProgramme: async () => import("@/lib/result").then(m => m.Success([])),
      update: async () => { throw new Error('Not implemented'); },
      updateStatus: async () => { throw new Error('Not implemented'); },
    };

    const service = createService({ 'rev-r1': revR1Approved }, { 'task-r1': taskR1 }, mockActivityRepo);

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1',
      revisionId: '', // Empty / missing revision_id
      taskId: 'task-r1',
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('revisionId is required');
    }
  });

  it('TEST-REM005-03: Revision_id belongs to different programme → rejected', async () => {
    const mockActivityRepo = {} as IActivityRepository;
    const revOtherProg: ProgrammeRevision = { ...revR1Approved, programmeId: 'prog-other' };
    const service = createService({ 'rev-r1': revOtherProg }, {}, mockActivityRepo);

    const res = await service.createActivity({
      siteDiaryId: 'sd-100',
      programmeId: 'prog-1', // Mismatch with revOtherProg
      revisionId: 'rev-r1',
      taskId: 'task-r1',
      activityName: 'Concrete Pouring',
      createdBy: 'user-1',
    });

    expect(isFailure(res)).toBe(true);
    if (isFailure(res)) {
      expect(res.error.message).toContain('programme/revision mismatch');
    }
  });

  it('TEST-REM005-04: Revision_id does not match task revision → rejected', async () => {
    const mockActivityRepo = {} as IActivityRepository;
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
    const mockActivityRepo = {} as IActivityRepository;
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
    const mockActivityRepo: IActivityRepository = {
      create: async (act) => Success(act),
      findById: async () => Success(null),
      findByRevisionId: async () => Success([]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      findOpenActivitiesByProgramme: async () => import("@/lib/result").then(m => m.Success([])),
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
    const mockActivityRepo = {} as IActivityRepository;
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
    const mockActivityRepo = {} as IActivityRepository;
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

  it('TEST-REM005-09: Repository create mapping matches actual DDL for canonical DB-014 activity', async () => {
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

    const repo = new ActivityRepository(mockAdapter);

    const activity: Activity = {
      activity_id: 'act-1',
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-1',
      activity_uid: 'ACT-1',
      ahi: null,
      ahi_display_name: null,
      subtask: 'Piling Work',
      subtask_display_name: null,
      activity_date: '2026-08-09',
      actual_start_date: null,
      completed_date: null,
      status: ActivityStatus.New,
      weather: null,
      notes: '',
      submitted_by: 'user-1',
      created_at: '2026-08-09T22:00:00Z',
      updated_at: null,
    };

    const res = await repo.create(activity);
    expect(isSuccess(res)).toBe(true);
    expect(insertedRow).toBeDefined();
    if (insertedRow) {
      expect(insertedRow.activity_id).toBe('act-1');
      expect(insertedRow.programme_id).toBe('prog-1');
      expect(insertedRow.revision_id).toBe('rev-r1');
      expect(insertedRow.task_id).toBe('task-1');
      expect(insertedRow.subtask).toBe('Piling Work');
      expect(insertedRow.status).toBe('New');
      // Verify forbidden UI/engine fields are not persisted
      expect(insertedRow.material_snapshot).toBeUndefined();
      expect(insertedRow.site_diary_id).toBeUndefined();
      expect(insertedRow.location).toBeUndefined();
      expect(insertedRow.trade_info).toBeUndefined();
      expect(insertedRow.workforce_count).toBeUndefined();
      expect(insertedRow.is_locked).toBeUndefined();
    }
  });

  it('TEST-REM005-10: Repository read mapping matches actual DDL for canonical DB-014 activity', async () => {
    const rawRow: ActivityRow = {
      activity_id: 'act-1',
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-1',
      activity_uid: 'ACT-1',
      ahi: null,
      ahi_display_name: null,
      subtask: 'Piling Work',
      subtask_display_name: null,
      activity_date: '2026-08-09',
      actual_start_date: null,
      completed_date: null,
      status: ActivityStatus.New,
      weather: null,
      notes: '',
      submitted_by: 'user-1',
      created_at: '2026-08-09T22:00:00Z',
      updated_at: null,
    };

    const mockAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success(rawRow as unknown as T),
      insert: async <T>(_table: string, row: Record<string, unknown>) => Success(row as unknown as T),
      selectMany: async <T>() => Success([] as unknown as T[]),
      update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => Success(updates as unknown as T),
      exists: async () => Success(false),
    };

    const repo = new ActivityRepository(mockAdapter);
    const res = await repo.findById('act-1');

    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res) && res.value) {
      expect(res.value.activity_id).toBe('act-1');
      expect(res.value.programme_id).toBe('prog-1');
      expect(res.value.revision_id).toBe('rev-r1');
      expect(res.value.task_id).toBe('task-1');
      expect(res.value.subtask).toBe('Piling Work');
      expect(res.value.status).toBe(ActivityStatus.New);
      
      // Ensure these fields don't accidentally leak into domain type
      expect((res.value as unknown as Record<string, unknown>).siteDiaryId).toBeUndefined();
    }
  });

  it('TEST-REM005-11: Repository update mapping matches actual DDL for canonical DB-014 activity', async () => {
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

    const repo = new ActivityRepository(mockAdapter);

    const activity: Activity = {
      activity_id: 'act-1',
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-1',
      activity_uid: 'ACT-1',
      ahi: null,
      ahi_display_name: null,
      subtask: 'Updated Piling Work',
      subtask_display_name: null,
      activity_date: '2026-08-09',
      actual_start_date: null,
      completed_date: null,
      status: ActivityStatus.InProgress,
      weather: null,
      notes: '',
      submitted_by: 'user-1',
      created_at: '2026-08-09T22:00:00Z',
      updated_at: '2026-08-09T22:10:00Z',
    };

    const res = await repo.update(activity);
    expect(isSuccess(res)).toBe(true);
    expect(updatedRow).toBeDefined();
    if (updatedRow) {
      expect(updatedRow.activity_id).toBe('act-1');
      expect(updatedRow.subtask).toBe('Updated Piling Work');
      expect(updatedRow.status).toBe('In Progress');
    }
  });

  it('TEST-REM005-12: No undefined/non-existent column is referenced by ActivityRepository', async () => {
    const mockAdapter: IDatabaseAdapter = {
      insert: async <T>(_table: string, row: Record<string, unknown>) => {
        const allowedColumns = new Set([
          'activity_id', 'programme_id', 'revision_id', 'task_id', 'activity_uid',
          'ahi', 'ahi_display_name', 'subtask', 'subtask_display_name',
          'activity_date', 'actual_start_date', 'completed_date', 'status',
          'weather', 'notes', 'submitted_by', 'created_at', 'updated_at'
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

    const repo = new ActivityRepository(mockAdapter);

    const activity: Activity = {
      activity_id: 'act-1',
      programme_id: 'prog-1',
      revision_id: 'rev-r1',
      task_id: 'task-1',
      activity_uid: 'ACT-1',
      ahi: null,
      ahi_display_name: null,
      subtask: 'Clean Column Test',
      subtask_display_name: null,
      activity_date: '2026-08-09',
      actual_start_date: null,
      completed_date: null,
      status: ActivityStatus.New,
      weather: null,
      notes: '',
      submitted_by: 'user-1',
      created_at: '2026-08-09T22:00:00Z',
      updated_at: null,
    };

    const res = await repo.create(activity);
    expect(isSuccess(res)).toBe(true);
  });
});
