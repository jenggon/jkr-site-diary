import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getOpenActivities } from '@/app/api/activities/open/route';
import { OpenActivityService } from '@/services/OpenActivityService';
import { ActivityRepository } from '@/repositories/activityRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';
import { Success, isSuccess } from '@/lib/result';
import { Activity, ActivitySourceType, ActivityStatus } from '@/types/activity';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ProgrammeRevision } from '@/types/programmeRevision';

let currentTestService: OpenActivityService;

vi.mock('@/app/api/_shared/identity', () => ({
  extractIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization');
    if (!auth || auth === 'invalid') return null;
    return 'verified-actor-123';
  }),
}));

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: vi.fn(() => currentTestService),
}));

describe('F2.2-B01 — Revision-Safe Open Activity Projection Behavioral Suite', () => {
  const mockActivityRows: Activity[] = [];

  const mockAdapter: IDatabaseAdapter = {
    selectOne: async <T>(_table: string, _filter: Record<string, unknown>) => Success(null as T | null),
    selectMany: async <T>(table: string, filter?: Record<string, unknown>) => {
      if (table === 'activity') {
        const results = mockActivityRows.filter((item) => {
          if (!filter) return true;
          if (filter.programme_id && item.programme_id !== filter.programme_id) return false;
          if (filter.revision_id && item.revision_id !== filter.revision_id) return false;
          if (filter.status && Array.isArray(filter.status)) {
            if (!filter.status.includes(item.status)) return false;
          } else if (filter.status && item.status !== filter.status) {
            return false;
          }
          return true;
        });
        return Success(results as unknown as T[]);
      }
      return Success([] as T[]);
    },
    insert: async <T>(_table: string, row: Record<string, unknown>) => Success(row as unknown as T),
    update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => Success(updates as unknown as T),
    exists: async () => Success(false),
  };

  const activityRepo = new ActivityRepository(mockAdapter);
  const logRepo = new ActivityLogRepository(mockAdapter);
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();
  const logger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {}, child: () => logger } as unknown as Logger;
  const eventPublisher = new NoopDomainEventPublisher();

  // Active Programme 1 has current revision 'rev-active-1' (Approved).
  // Obsolete Programme 1 revision is 'rev-superseded-1' (Superseded).
  // Programme 2 has current revision 'rev-active-2' (Approved).
  const mockRevisionRepo: IProgrammeRevisionRepository = {
    findById: async (id) => {
      if (id === 'rev-active-1') {
        return Success({
          revisionId: 'rev-active-1',
          programmeId: 'prog-1',
          revisionNumber: 2,
          revisionTitle: 'Rev 2 Approved',
          isCurrent: true,
          status: 'Approved',
          createdAt: '2026-08-01',
          createdBy: 'admin',
        } as ProgrammeRevision);
      }
      if (id === 'rev-superseded-1') {
        return Success({
          revisionId: 'rev-superseded-1',
          programmeId: 'prog-1',
          revisionNumber: 1,
          revisionTitle: 'Rev 1 Superseded',
          isCurrent: false,
          status: 'Superseded',
          createdAt: '2026-07-01',
          createdBy: 'admin',
        } as ProgrammeRevision);
      }
      if (id === 'rev-active-2') {
        return Success({
          revisionId: 'rev-active-2',
          programmeId: 'prog-2',
          revisionNumber: 1,
          revisionTitle: 'Rev 1 P2 Approved',
          isCurrent: true,
          status: 'Approved',
          createdAt: '2026-08-01',
          createdBy: 'admin',
        } as ProgrammeRevision);
      }
      return Success(null);
    },
    findByProgrammeId: async (progId) => {
      if (progId === 'prog-1') {
        return Success([
          {
            revisionId: 'rev-active-1',
            programmeId: 'prog-1',
            revisionNumber: 2,
            revisionTitle: 'Rev 2 Approved',
            isCurrent: true,
            status: 'Approved',
            createdAt: '2026-08-01',
            createdBy: 'admin',
          },
          {
            revisionId: 'rev-superseded-1',
            programmeId: 'prog-1',
            revisionNumber: 1,
            revisionTitle: 'Rev 1 Superseded',
            isCurrent: false,
            status: 'Superseded',
            createdAt: '2026-07-01',
            createdBy: 'admin',
          },
        ] as ProgrammeRevision[]);
      }
      return Success([]);
    },
    findActiveRevision: async (progId) => {
      if (progId === 'prog-1') {
        return Success({
          revisionId: 'rev-active-1',
          programmeId: 'prog-1',
          revisionNumber: 2,
          revisionTitle: 'Rev 2 Approved',
          isCurrent: true,
          status: 'Approved',
          createdAt: '2026-08-01',
          createdBy: 'admin',
        } as ProgrammeRevision);
      }
      if (progId === 'prog-2') {
        return Success({
          revisionId: 'rev-active-2',
          programmeId: 'prog-2',
          revisionNumber: 1,
          revisionTitle: 'Rev 1 P2 Approved',
          isCurrent: true,
          status: 'Approved',
          createdAt: '2026-08-01',
          createdBy: 'admin',
        } as ProgrammeRevision);
      }
      if (progId === 'prog-draft-only') {
        return Success({
          revisionId: 'rev-draft-only',
          programmeId: 'prog-draft-only',
          revisionNumber: 1,
          revisionTitle: 'Draft Revision',
          isCurrent: true,
          status: 'Draft',
          createdAt: '2026-08-01',
          createdBy: 'admin',
        } as ProgrammeRevision);
      }
      return Success(null);
    },
    create: async (r) => Success(r),
    updateStatus: async (id, s) => Success({ revisionId: id, status: s } as unknown as ProgrammeRevision),
  };

  const service = new OpenActivityService({
    activityRepository: activityRepo,
    logRepository: logRepo,
    transactionManager: txManager,
    revisionRepository: mockRevisionRepo,
    clock,
    logger,
    eventPublisher,
  });

  beforeEach(() => {
    currentTestService = service;
    mockActivityRows.length = 0;
    // Populate fixture activities across revisions, statuses, and programmes
    mockActivityRows.push(
      // 1. Current Revision + New Activity (prog-1, rev-active-1) [MSP]
      {
        activity_id: 'act-cur-new-msp',
        programme_id: 'prog-1',
        revision_id: 'rev-active-1',
        source_type: ActivitySourceType.MSP,
        task_id: 'msp-task-1',
        vo_item_id: null,
        activity_uid: 'ACT-001',
        ahi: 'WBS-1.1',
        ahi_display_name: 'Struktur Bawah',
        subtask: 'Kerja Cerucuk',
        subtask_display_name: 'Kerja Cerucuk P1',
        activity_date: '2026-08-10',
        actual_start_date: null,
        completed_date: null,
        status: ActivityStatus.New,
        weather: null,
        notes: '',
        submitted_by: 'supervisor-1',
        created_at: '2026-08-10T08:00:00Z',
        updated_at: null,
      },
      // 2. Current Revision + InProgress Activity (prog-1, rev-active-1) [VO]
      {
        activity_id: 'act-cur-inp-vo',
        programme_id: 'prog-1',
        revision_id: 'rev-active-1',
        source_type: ActivitySourceType.VO,
        task_id: null,
        vo_item_id: 'vo-item-1',
        activity_uid: 'ACT-002',
        ahi: null,
        ahi_display_name: null,
        subtask: 'Kerja Tambahan Longkang VO #1',
        subtask_display_name: null,
        activity_date: '2026-08-11',
        actual_start_date: '2026-08-11',
        completed_date: null,
        status: ActivityStatus.InProgress,
        weather: null,
        notes: 'Sedang berjalan',
        submitted_by: 'supervisor-1',
        created_at: '2026-08-11T08:00:00Z',
        updated_at: null,
      },
      // 3. Current Revision + Completed Activity (prog-1, rev-active-1)
      {
        activity_id: 'act-cur-completed',
        programme_id: 'prog-1',
        revision_id: 'rev-active-1',
        source_type: ActivitySourceType.MSP,
        task_id: 'msp-task-2',
        vo_item_id: null,
        activity_uid: 'ACT-003',
        ahi: 'WBS-1.2',
        ahi_display_name: 'Pembersihan Tapak',
        subtask: 'Pembersihan Tapak Selesai',
        subtask_display_name: null,
        activity_date: '2026-08-05',
        actual_start_date: '2026-08-05',
        completed_date: '2026-08-06',
        status: ActivityStatus.Completed,
        weather: null,
        notes: 'Siap',
        submitted_by: 'supervisor-1',
        created_at: '2026-08-05T08:00:00Z',
        updated_at: '2026-08-06T17:00:00Z',
      },
      // 4. Superseded Revision + New Activity (prog-1, rev-superseded-1)
      {
        activity_id: 'act-sup-new',
        programme_id: 'prog-1',
        revision_id: 'rev-superseded-1',
        source_type: ActivitySourceType.MSP,
        task_id: 'msp-task-old-1',
        vo_item_id: null,
        activity_uid: 'ACT-OLD-1',
        ahi: 'WBS-OLD.1',
        ahi_display_name: 'Kerja Lama',
        subtask: 'Kerja Lama Rev 1 New',
        subtask_display_name: null,
        activity_date: '2026-07-10',
        actual_start_date: null,
        completed_date: null,
        status: ActivityStatus.New,
        weather: null,
        notes: '',
        submitted_by: 'supervisor-1',
        created_at: '2026-07-10T08:00:00Z',
        updated_at: null,
      },
      // 5. Superseded Revision + InProgress Activity (prog-1, rev-superseded-1)
      {
        activity_id: 'act-sup-inp',
        programme_id: 'prog-1',
        revision_id: 'rev-superseded-1',
        source_type: ActivitySourceType.MSP,
        task_id: 'msp-task-old-2',
        vo_item_id: null,
        activity_uid: 'ACT-OLD-2',
        ahi: 'WBS-OLD.2',
        ahi_display_name: 'Kerja Lama 2',
        subtask: 'Kerja Lama Rev 1 InProgress',
        subtask_display_name: null,
        activity_date: '2026-07-12',
        actual_start_date: '2026-07-12',
        completed_date: null,
        status: ActivityStatus.InProgress,
        weather: null,
        notes: '',
        submitted_by: 'supervisor-1',
        created_at: '2026-07-12T08:00:00Z',
        updated_at: null,
      },
      // 6. Programme 2 Current Revision Activity (prog-2, rev-active-2)
      {
        activity_id: 'act-prog-2-new',
        programme_id: 'prog-2',
        revision_id: 'rev-active-2',
        source_type: ActivitySourceType.MSP,
        task_id: 'msp-p2-task-1',
        vo_item_id: null,
        activity_uid: 'ACT-P2-01',
        ahi: 'WBS-P2.1',
        ahi_display_name: 'P2 Kerja',
        subtask: 'Kerja Programme 2',
        subtask_display_name: null,
        activity_date: '2026-08-12',
        actual_start_date: null,
        completed_date: null,
        status: ActivityStatus.New,
        weather: null,
        notes: '',
        submitted_by: 'supervisor-2',
        created_at: '2026-08-12T08:00:00Z',
        updated_at: null,
      }
    );
  });

  it('1 & 2. Returns Current Revision New & InProgress activities for requested Programme', async () => {
    const res = await service.getOpenActivities('prog-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      const ids = res.value.map((a) => a.activityId);
      expect(ids).toContain('act-cur-new-msp');
      expect(ids).toContain('act-cur-inp-vo');
    }
  });

  it('3. Excludes Completed activity belonging to the current revision', async () => {
    const res = await service.getOpenActivities('prog-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      const ids = res.value.map((a) => a.activityId);
      expect(ids).not.toContain('act-cur-completed');
    }
  });

  it('4. Excludes New activity belonging to a superseded revision', async () => {
    const res = await service.getOpenActivities('prog-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      const ids = res.value.map((a) => a.activityId);
      expect(ids).not.toContain('act-sup-new');
    }
  });

  it('5. Excludes InProgress activity belonging to a superseded revision', async () => {
    const res = await service.getOpenActivities('prog-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      const ids = res.value.map((a) => a.activityId);
      expect(ids).not.toContain('act-sup-inp');
    }
  });

  it('6. Programme 1 query does not return Programme 2 activities', async () => {
    const res1 = await service.getOpenActivities('prog-1');
    expect(isSuccess(res1)).toBe(true);
    if (isSuccess(res1)) {
      const ids = res1.value.map((a) => a.activityId);
      expect(ids).not.toContain('act-prog-2-new');
      expect(res1.value.every((a) => a.programmeId === 'prog-1')).toBe(true);
    }

    const res2 = await service.getOpenActivities('prog-2');
    expect(isSuccess(res2)).toBe(true);
    if (isSuccess(res2)) {
      const ids = res2.value.map((a) => a.activityId);
      expect(ids).toEqual(['act-prog-2-new']);
      expect(res2.value[0]?.programmeId).toBe('prog-2');
    }
  });

  it('7. Current authorised Revision is derived server-side (empty if Draft or no Approved revision)', async () => {
    const res = await service.getOpenActivities('prog-draft-only');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      expect(res.value).toEqual([]);
    }
  });

  it('8. Client cannot force obsolete revision through query parameters', async () => {
    // Calling route with query params attempting to override revision
    const req = {
      url: 'http://localhost/api/activities/open?programmeId=prog-1&revisionId=rev-superseded-1',
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'authorization') return 'Bearer valid-token';
          return null;
        },
      },
    } as unknown as Request;

    // The route handler parses ONLY programmeId and relies on service to derive active revision
    const res = await getOpenActivities(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    // Even if client supplied revisionId=rev-superseded-1 in query, response only contains rev-active-1 items
    const returnedRevisionIds = (body.data as Array<{ revisionId?: string }>).map((item) => item.revisionId);
    expect(returnedRevisionIds.every((r: string | undefined) => r === 'rev-active-1')).toBe(true);
    expect(returnedRevisionIds).not.toContain('rev-superseded-1');
  });

  it('9. MSP source identity survives projection (sourceType, taskId, voItemId is undefined)', async () => {
    const res = await service.getOpenActivities('prog-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      const mspAct = res.value.find((a) => a.activityId === 'act-cur-new-msp');
      expect(mspAct).toBeDefined();
      expect(mspAct?.sourceType).toBe(ActivitySourceType.MSP);
      expect(mspAct?.taskId).toBe('msp-task-1');
      expect(mspAct?.voItemId).toBeUndefined();
      expect(mspAct?.subtask).toBe('Kerja Cerucuk');
      expect(mspAct?.ahi).toBe('WBS-1.1');
    }
  });

  it('10. VO source identity survives projection (sourceType, voItemId, taskId is undefined)', async () => {
    const res = await service.getOpenActivities('prog-1');
    expect(isSuccess(res)).toBe(true);
    if (isSuccess(res)) {
      const voAct = res.value.find((a) => a.activityId === 'act-cur-inp-vo');
      expect(voAct).toBeDefined();
      expect(voAct?.sourceType).toBe(ActivitySourceType.VO);
      expect(voAct?.voItemId).toBe('vo-item-1');
      expect(voAct?.taskId).toBeUndefined();
      expect(voAct?.subtask).toBe('Kerja Tambahan Longkang VO #1');
    }
  });

  it('11. Route requires authentication (401 without valid Bearer)', async () => {
    const reqWithoutAuth = {
      url: 'http://localhost/api/activities/open?programmeId=prog-1',
      headers: {
        get: () => null,
      },
    } as unknown as Request;

    const res = await getOpenActivities(reqWithoutAuth);
    expect(res.status).toBe(401);
  });

  it('12. No separate Open Activity persistence/table is introduced (canonical table is activity)', async () => {
    // Verify that ActivityRepository query targets the single authoritative 'activity' table
    let queriedTable = '';
    const spyAdapter: IDatabaseAdapter = {
      selectOne: async <T>() => Success(null as T | null),
      selectMany: async <T>(table: string) => {
        queriedTable = table;
        return Success([] as T[]);
      },
      insert: async <T>(_table: string, row: Record<string, unknown>) => Success(row as unknown as T),
      update: async <T>(_table: string, _filter: Record<string, unknown>, updates: Record<string, unknown>) => Success(updates as unknown as T),
      exists: async () => Success(false),
    };
    const testRepo = new ActivityRepository(spyAdapter);
    await testRepo.findOpenActivitiesByProgramme('prog-1', 'rev-active-1');
    expect(queriedTable).toBe('activity');
  });
});
