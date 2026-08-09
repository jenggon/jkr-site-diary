import { describe, it, expect, vi } from 'vitest';
import { Task } from '@/types/task';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { ProgrammeRevisionApprovedEvent } from '@/events/programmeEvents';
import { SyncDomainEventPublisher } from '@/events/SyncDomainEventPublisher';
import { OpenActivityTerminationHandler } from '@/events/handlers/OpenActivityTerminationHandler';
import { OpenActivity } from '@/types/openActivity';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { OpenActivityService } from '@/services/OpenActivityService';
import { ProgramKerjaBoundaryService } from '@/services/ProgramKerjaBoundaryService';
import { TreEngineService } from '@/services/TreEngineService';
import { Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { BaseAppError } from '@/lib/errors';

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

  it('M05: OpenActivityTerminationHandler locks previous revision activities as-is without changing status', async () => {
    const activities: OpenActivity[] = [
      {
        activityId: 'act-1',
        siteDiaryId: 'sd-1',
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityName: 'Planned Task',
        status: 'Planned',
        isLocked: false,
        createdAt: '2026-08-01T00:00:00Z',
        createdBy: 'user-1',
      },
      {
        activityId: 'act-2',
        siteDiaryId: 'sd-1',
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityName: 'In Progress Task',
        status: 'InProgress',
        isLocked: false,
        createdAt: '2026-08-01T00:00:00Z',
        createdBy: 'user-1',
      },
      {
        activityId: 'act-3',
        siteDiaryId: 'sd-1',
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityName: 'Completed Task',
        status: 'Completed',
        isLocked: false,
        createdAt: '2026-08-01T00:00:00Z',
        createdBy: 'user-1',
      },
      {
        activityId: 'act-4',
        siteDiaryId: 'sd-1',
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityName: 'Cancelled Task',
        status: 'Cancelled',
        isLocked: false,
        createdAt: '2026-08-01T00:00:00Z',
        createdBy: 'user-1',
      },
    ];

    const updatedActivities: OpenActivity[] = [];

    const mockRepo: IOpenActivityRepository = {
      findById: async (id) => Success(activities.find((a) => a.activityId === id) ?? null),
      findBySiteDiaryId: async () => Success(activities),
      findByRevisionId: async (revId) => Success(activities.filter((a) => a.revisionId === revId)),
      create: async (a) => Success(a),
      update: async (a) => {
        updatedActivities.push(a);
        return Success(a);
      },
      updateStatus: async (id, status) => Success({ ...activities[0]!, activityId: id, status }),
    };

    const handler = new OpenActivityTerminationHandler({ activityRepository: mockRepo, logger });

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

    // Only act-1 (Planned) and act-2 (InProgress) should be updated to isLocked=true
    expect(updatedActivities.length).toBe(2);
    expect(updatedActivities.find((a) => a.activityId === 'act-1')?.isLocked).toBe(true);
    expect(updatedActivities.find((a) => a.activityId === 'act-1')?.status).toBe('Planned');
    expect(updatedActivities.find((a) => a.activityId === 'act-2')?.isLocked).toBe(true);
    expect(updatedActivities.find((a) => a.activityId === 'act-2')?.status).toBe('InProgress');

    // act-3 (Completed) and act-4 (Cancelled) are not in updatedActivities
    expect(updatedActivities.find((a) => a.activityId === 'act-3')).toBeUndefined();
    expect(updatedActivities.find((a) => a.activityId === 'act-4')).toBeUndefined();
  });

  it('M06: createActivity requires non-empty revisionId and validates revision and task matches', async () => {
    const mockActivityRepo: IOpenActivityRepository = {
      findById: async () => Success(null),
      findBySiteDiaryId: async () => Success([]),
      findByRevisionId: async () => Success([]),
      create: async (a) => Success(a),
      update: async (a) => Success(a),
      updateStatus: async (id, status) => Success({ activityId: id, status } as unknown as OpenActivity),
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
      treEngine: { resolveTradeRecommendation: async () => Failure(new Error('no tre') as unknown as BaseAppError) },
      workforceEngine: {
        recommend: async () => Failure(new Error('no wre') as unknown as BaseAppError),
        resolveWorkforceRecommendation: async () => Failure(new Error('no wre') as unknown as BaseAppError),
      },
      materialEngine: {
        recommend: async () => Failure(new Error('no mre') as unknown as BaseAppError),
        resolveMaterialRecommendation: async () => Failure(new Error('no mre') as unknown as BaseAppError),
      },
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
