import { describe, it, expect, vi } from 'vitest';
import { Task } from '@/types/task';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { ProgrammeRevisionApprovedEvent } from '@/events/programmeEvents';
import { SyncDomainEventPublisher } from '@/events/SyncDomainEventPublisher';
import { OpenActivityTerminationHandler } from '@/events/handlers/OpenActivityTerminationHandler';
import { Activity, ActivityStatus } from '@/types/activity';
import { IActivityRepository } from '@/repositories/IActivityRepository';
import { OpenActivityService } from '@/services/OpenActivityService';
import { ProgramKerjaBoundaryService } from '@/services/ProgramKerjaBoundaryService';
import { TreEngineService } from '@/services/TreEngineService';
import { Success, isSuccess, isFailure } from '@/lib/result';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { createTreEngineService } from '@/composition/treComposition';
import { createWorkforceEngineService } from '@/composition/wreComposition';
import { createMaterialEngineService } from '@/composition/mreComposition';

describe('D2 Remediation Test Suite (M01-M08)', () => {
  const clock = new SystemClock();

  it('M01 & M02: D2 canonical type extensions are optional and nullable', () => {
    const task: Task = {
      task_id: 'task-1',
      programme_id: 'prog-1',
      revision_id: 'rev-1',
      task_uid: 10,
      task_guid: null,
      wbs: '1.1',
      task_name: 'Installation Task',
      parent_task_uid: null,
      outline_level: 1,
      outline_number: '1.1',
      trade_code: 'PLUMBING',
      trade_name: 'Plumbing Works',
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

    expect(task.outline_number).toBe('1.1');
    expect(task.trade_code).toBe('PLUMBING');
    expect(task.trade_name).toBe('Plumbing Works');

    const revision: ProgrammeRevision = {
      revisionId: 'rev-1',
      programmeId: 'prog-1',
      revisionNumber: 1,
      revisionTitle: 'Revision 1',
      isCurrent: true,
      status: 'Approved',
      msp_file_hash: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
      createdAt: '2026-08-01T00:00:00Z',
      createdBy: 'user-1',
    };

    expect(revision.msp_file_hash).toBeDefined();
    expect(revision.msp_file_hash?.length).toBe(64);
  });

  it('M03: ProgrammeRevisionApprovedEvent carries transition context', () => {
    const revision: ProgrammeRevision = {
      revisionId: 'rev-2',
      programmeId: 'prog-1',
      revisionNumber: 2,
      revisionTitle: 'Revision 2',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-01T00:00:00Z',
      createdBy: 'user-1',
    };

    const event = new ProgrammeRevisionApprovedEvent(revision, 'rev-1');
    expect(event.payload.programmeId).toBe('prog-1');
    expect(event.payload.approvedRevisionId).toBe('rev-2');
    expect(event.payload.previousRevisionId).toBe('rev-1');
  });

  it('M04: SyncDomainEventPublisher dispatches events in-process to registered subscribers', async () => {
    const publisher = new SyncDomainEventPublisher();
    const handlerFn = vi.fn();

    publisher.subscribe('PROGRAMME_REVISION_APPROVED', handlerFn);

    const revision: ProgrammeRevision = {
      revisionId: 'rev-2',
      programmeId: 'prog-1',
      revisionNumber: 2,
      revisionTitle: 'Revision 2',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-01T00:00:00Z',
      createdBy: 'user-1',
    };

    const event = new ProgrammeRevisionApprovedEvent(revision, 'rev-1');
    await publisher.publish(event);

    expect(handlerFn).toHaveBeenCalledOnce();
    expect(handlerFn).toHaveBeenCalledWith(event);
  });

  it('M05: OpenActivityTerminationHandler logs cleanly without modifying DB-014 Activity bounds (isLocked is obsolete)', async () => {
    const activities: Activity[] = [
      {
        activity_id: 'act-1',
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        task_id: 'task-1',
        activity_uid: 'ACT-1',
        ahi: null,
        ahi_display_name: null,
        subtask: 'Planned Task',
        subtask_display_name: null,
        activity_date: '2026-08-01',
        actual_start_date: null,
        completed_date: null,
        status: ActivityStatus.New,
        weather: null,
        notes: '',
        submitted_by: 'user-1',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: null,
      }
    ];

    let updateCalled = false;

    const mockRepo: IActivityRepository = {
      findById: async (id) => Success(activities.find((a) => a.activity_id === id) ?? null),
      findByRevisionId: async (revId) => Success(activities.filter((a) => a.revision_id === revId)),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      create: async (a) => Success(a),
      update: async (a) => {
        updateCalled = true;
        return Success(a);
      },
      updateStatus: async (id, status) => {
        updateCalled = true;
        return Success({ ...activities[0]!, activity_id: id, status });
      },
    };

    const handler = new OpenActivityTerminationHandler({ activityRepository: mockRepo as unknown as IActivityRepository, logger });

    const revision: ProgrammeRevision = {
      revisionId: 'rev-2',
      programmeId: 'prog-1',
      revisionNumber: 2,
      revisionTitle: 'Revision 2',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-01T00:00:00Z',
      createdBy: 'user-1',
    };

    const event = new ProgrammeRevisionApprovedEvent(revision, 'rev-1');
    await handler.handle(event);

    // M05 explicitly guarantees we DO NOT mutate DB-014 activity because isLocked is obsolete.
    expect(updateCalled).toBe(false);
  });

  it('M06: createActivity requires non-empty revisionId and validates revision and task matches', async () => {
    const mockActivityRepo: IActivityRepository = {
      findById: async () => Success(null),
      findByRevisionId: async () => Success([]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      create: async (a) => Success(a),
      update: async (a) => Success(a),
      updateStatus: async (id, status) => Success({ activity_id: id, status } as unknown as Activity),
    };

    const mockRevisionRepo: IProgrammeRevisionRepository = {
      findById: async (id) => {
        if (id === 'rev-valid') {
          return Success({
            revisionId: 'rev-valid',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Rev 1',
            isCurrent: true,
            status: 'Approved',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          });
        }
        return Success(null);
      },
      findByProgrammeId: async () => Success([]),
      findActiveRevision: async () => Success(null),
      create: async (r) => Success(r),
      updateStatus: async (id, s) => Success({ revisionId: id, status: s } as unknown as ProgrammeRevision),
    };

    const service = new OpenActivityService({
      activityRepository: mockActivityRepo,
      logRepository: { appendLog: async (l) => Success(l), findLogsByActivityId: async () => Success([]) },
      transactionManager: { execute: async (fn) => fn() },
      clock,
      logger,
      eventPublisher: { publish: async () => {} },
      revisionRepository: mockRevisionRepo,
      taskRepository: {
        getTaskById: async (taskId) => {
          if (taskId === 'task-1') {
            return {
              task_id: 'task-1',
              programme_id: 'prog-1',
              revision_id: 'rev-valid',
              task_uid: 1,
              task_guid: null,
              wbs: '1',
              task_name: 'Task 1',
              parent_task_uid: null,
              outline_level: 1,
              display_order: 1,
              planned_start: null,
              planned_finish: null,
              planned_duration_days: null,
              is_milestone: false,
              is_critical: false,
              is_summary: false,
              constraint_type: null,
              constraint_date: null,
              created_at: '2026-08-01',
              created_by: 'user-1',
            };
          }
          return null;
        },
      },
    });

    // 1. Missing revisionId
    const resNoRev = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: '',
      activityName: 'Test Activity',
      createdBy: 'user-1',
    });
    expect(isFailure(resNoRev)).toBe(true);

    // 2. Mismatch programme/revision
    const resMismatchProg = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-2', // Mismatch!
      revisionId: 'rev-valid',
      activityName: 'Test Activity',
      createdBy: 'user-1',
    });
    expect(isFailure(resMismatchProg)).toBe(true);

    // 3. Mismatch task/revision
    const resMismatchTask = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-valid-other', // Mismatch!
      taskId: 'task-1',
      activityName: 'Test Activity',
      createdBy: 'user-1',
    });
    expect(isFailure(resMismatchTask)).toBe(true);

    // 4. Valid creation
    const resValid = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-valid',
      taskId: 'task-1',
      activityName: 'Test Activity',
      createdBy: 'user-1',
    });
    expect(isSuccess(resValid)).toBe(true);
    if (isSuccess(resValid)) {
      expect(resValid.value.revisionId).toBe('rev-valid');
    }
  });

  it('R3.B & R3.C: createActivity rejects Draft, Archived, and Superseded revisions', async () => {
    const mockRevisionRepo: IProgrammeRevisionRepository = {
      findById: async (id) => {
        if (id === 'rev-draft') {
          return Success({
            revisionId: 'rev-draft',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Draft Rev',
            isCurrent: false,
            status: 'Draft',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          });
        }
        if (id === 'rev-archived') {
          return Success({
            revisionId: 'rev-archived',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Archived Rev',
            isCurrent: false,
            status: 'Archived',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          });
        }
        if (id === 'rev-superseded') {
          return Success({
            revisionId: 'rev-superseded',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Superseded Rev',
            isCurrent: false,
            status: 'Superseded',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          });
        }
        return Success(null);
      },
      findByProgrammeId: async () => Success([]),
      findActiveRevision: async () => Success(null),
      create: async (r) => Success(r),
      updateStatus: async (id, s) => Success({ revisionId: id, status: s } as unknown as ProgrammeRevision),
    };

    const service = new OpenActivityService({
      activityRepository: {
        findById: async () => Success(null),
        findByRevisionId: async () => Success([]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
        create: async (a) => Success(a),
        update: async (a) => Success(a),
        updateStatus: async (id, status) => Success({ activity_id: id, status } as unknown as Activity),
      },
      logRepository: { appendLog: async (l) => Success(l), findLogsByActivityId: async () => Success([]) },
      transactionManager: { execute: async (fn) => fn() },
      clock,
      logger,
      eventPublisher: { publish: async () => {} },
      revisionRepository: mockRevisionRepo,
    });

    const resDraft = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-draft',
      activityName: 'Draft Activity',
      createdBy: 'user-1',
    });
    expect(isFailure(resDraft)).toBe(true);

    const resArchived = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-archived',
      activityName: 'Archived Activity',
      createdBy: 'user-1',
    });
    expect(isFailure(resArchived)).toBe(true);

    const resSuperseded = await service.createActivity({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-superseded',
      activityName: 'Superseded Activity',
      createdBy: 'user-1',
    });
    expect(isFailure(resSuperseded)).toBe(true);
  });

  it('R3.D: OpenActivityTerminationHandler exits cleanly when previousRevisionId is null', async () => {
    let updateCalled = false;
    const mockRepo: IActivityRepository = {
      findById: async () => Success(null),
      findByRevisionId: async () => Success([]),
      findByTaskId: async () => import("@/lib/result").then(m => m.Success([])),
      create: async (a) => Success(a),
      update: async (a) => {
        updateCalled = true;
        return Success(a);
      },
      updateStatus: async (id, status) => Success({ activity_id: id, status } as unknown as Activity),
    };

    const handler = new OpenActivityTerminationHandler({ activityRepository: mockRepo as unknown as IActivityRepository, logger });
    const revision: ProgrammeRevision = {
      revisionId: 'rev-1',
      programmeId: 'prog-1',
      revisionNumber: 1,
      revisionTitle: 'Initial Revision',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-01T00:00:00Z',
      createdBy: 'user-1',
    };

    const event = new ProgrammeRevisionApprovedEvent(revision, null);
    await handler.handle(event);

    expect(updateCalled).toBe(false);
  });

  it('R2: ProgramKerjaBoundaryService validates revisionId and enforces operational revision safety', async () => {
    const mockRevisionRepo: IProgrammeRevisionRepository = {
      findById: async (id) => {
        if (id === 'rev-approved') {
          return Success({
            revisionId: 'rev-approved',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Rev 1',
            isCurrent: true,
            status: 'Approved',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          });
        }
        if (id === 'rev-draft') {
          return Success({
            revisionId: 'rev-draft',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Draft',
            isCurrent: false,
            status: 'Draft',
            createdAt: '2026-08-01',
            createdBy: 'user-1',
          });
        }
        return Success(null);
      },
      findByProgrammeId: async () => Success([]),
      findActiveRevision: async () => Success(null),
      create: async (r) => Success(r),
      updateStatus: async (id, s) => Success({ revisionId: id, status: s } as unknown as ProgrammeRevision),
    };

    const boundary = new ProgramKerjaBoundaryService({
      revisionRepository: mockRevisionRepo,
      taskRepository: {
        getTaskById: async (taskId) => {
          if (taskId === 'task-1') {
            return {
              task_id: 'task-1',
              programme_id: 'prog-1',
              revision_id: 'rev-approved',
              task_uid: 1,
              task_guid: null,
              wbs: '1.1',
              task_name: 'Boundary Task',
              parent_task_uid: null,
              outline_level: 1,
              trade_code: 'CARPENTER',
              trade_name: 'Carpentry',
              display_order: 1,
              planned_start: null,
              planned_finish: null,
              planned_duration_days: null,
              is_milestone: false,
              is_critical: false,
              is_summary: false,
              constraint_type: null,
              constraint_date: null,
              created_at: '2026-08-01',
              created_by: 'user-1',
            };
          }
          return null;
        },
      },
    });

    // 1. Valid context
    const tradeValid = await boundary.getProgramKerjaTrade('prog-1', 'rev-approved', 'task-1');
    expect(tradeValid).not.toBeNull();
    expect(tradeValid?.tradeCode).toBe('CARPENTER');

    // 2. Draft revision context rejected
    const tradeDraft = await boundary.getProgramKerjaTrade('prog-1', 'rev-draft', 'task-1');
    expect(tradeDraft).toBeNull();

    // 3. Task/revision mismatch rejected
    const tradeMismatch = await boundary.getProgramKerjaTrade('prog-1', 'rev-other', 'task-1');
    expect(tradeMismatch).toBeNull();
  });

  it('R1 & R3.E: Production Composition Roots instantiate and wire ProgramKerjaBoundaryService (boundary routing verified)', async () => {
    // Spy on the ProgramKerjaBoundaryService prototype BEFORE the factory creates its internal instance.
    // This intercepts the real instance created inside createTreEngineService() without modifying
    // the production composition root or any architectural code.
    const spy = vi.spyOn(ProgramKerjaBoundaryService.prototype, 'getProgramKerjaTrade')
      .mockResolvedValue({
        tradeId: 'boundary-verified-trade-id',
        tradeCode: 'BOUNDARY_ROUTE_CONFIRMED',
        tradeName: 'Boundary Routing Confirmed',
        tradeCategory: 'TEST',
      });

    try {
      const treEngine = createTreEngineService();
      expect(treEngine).toBeDefined();

      const result = await treEngine.resolveTradeRecommendation({
        siteDiaryId: 'sd-an001',
        programmeId: 'prog-an001',
        revisionId: 'rev-an001',
        mspTaskId: 'task-an001',
        activityName: 'AN-001 Boundary Routing Test',
      });

      // The spy must have been called once with the exact programmeId, revisionId, taskId
      // that were in the resolution context. This proves TreEngineService called
      // pkBoundary.getProgramKerjaTrade() — i.e., the boundary IS wired in production composition.
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith('prog-an001', 'rev-an001', 'task-an001');

      // The result must be resolved via Priority 1 (MSP_RESOURCE) with the value
      // our spy returned — proving resolution went through the boundary, not the raw MSP fallback.
      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.tradeCode).toBe('BOUNDARY_ROUTE_CONFIRMED');
        expect(result.value.resolutionSource).toBe('MSP_RESOURCE');
      }
    } finally {
      spy.mockRestore();
    }

    // Verify WRE and MRE composition roots also instantiate correctly (structural check).
    const wreEngine = createWorkforceEngineService();
    expect(wreEngine).toBeDefined();

    const mreEngine = createMaterialEngineService();
    expect(mreEngine).toBeDefined();
  });

  it('M07: ProgramKerjaBoundaryService provides Priority 1 trade recommendations cleanly', async () => {
    const boundary = new ProgramKerjaBoundaryService({
      taskRepository: {
        getTaskById: async () => ({
          task_id: 'task-10',
          programme_id: 'prog-1',
          revision_id: 'rev-1',
          task_uid: 10,
          task_guid: null,
          wbs: '1.2',
          task_name: 'Concreting Task',
          parent_task_uid: null,
          outline_level: 1,
          outline_number: '1.2',
          trade_code: 'CONCRETOR',
          trade_name: 'Concrete Specialist',
          display_order: 1,
          planned_start: null,
          planned_finish: null,
          planned_duration_days: null,
          is_milestone: false,
          is_critical: false,
          is_summary: false,
          constraint_type: null,
          constraint_date: null,
          created_at: '2026-08-01',
          created_by: 'user-1',
        }),
      },
    });

    const treService = new TreEngineService({
      programKerjaBoundaryService: boundary,
      tradeLibraryRepository: { getDefaultTrade: async () => null, getTradeByCode: async () => null, getTradeById: async () => null },
      knowledgeEngineAdapter: { getTopRecommendation: async () => null },
      clock,
      logger,
    });

    const res = await treService.resolveTradeRecommendation({
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      revisionId: 'rev-1',
      mspTaskId: 'task-10',
      activityName: 'Concreting Task',
    });

    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value.tradeCode).toBe('CONCRETOR');
      expect(res.value.tradeName).toBe('Concrete Specialist');
      expect(res.value.resolutionSource).toBe('MSP_RESOURCE');
    }
  });
});
