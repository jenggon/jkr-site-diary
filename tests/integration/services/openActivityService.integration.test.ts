import { describe, it, expect } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { ActivityRepository } from '@/repositories/ActivityRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';
import { isSuccess, Success, Failure } from '@/lib/result';
import { ActivityNotFoundError } from '@/errors/activityErrors';
import { IProgrammeRevisionRepository } from '@/repositories/IProgrammeRevisionRepository';
import { ProgrammeRevision } from '@/types/programmeRevision';

describe('OpenActivityService Integration (DB-003 Remediation)', () => {
  const mockActivityRows: Map<string, Record<string, unknown>> = new Map();
  const mockLogRows: ActivityLogRowInternal[] = [];

  interface ActivityLogRowInternal {
    log_id: string;
    activity_id: string;
    event_type: 'NEW' | 'UPDATE';
    snapshot_data: Record<string, unknown>;
    logged_at: string;
    logged_by: string;
  }

  const mockAdapter: IDatabaseAdapter = {
    selectOne: async <T>(table: string, filter: Record<string, unknown>) => {
      if (table === 'activity') {
        const id = filter.activity_id as string;
        const item = mockActivityRows.get(id);
        if (item) return Success(item as T);
        return Success(null);
      }
      return Success(null);
    },

    selectMany: async <T>(table: string, filter?: Record<string, unknown>) => {
      if (table === 'activity') {
        const results: T[] = [];
        for (const item of mockActivityRows.values()) {
          let match = true;
          if (filter) {
            for (const [k, v] of Object.entries(filter)) {
              if (item[k] !== v) match = false;
            }
          }
          if (match) results.push(item as T);
        }
        return Success(results);
      }
      if (table === 'site_diary_logs') { // Assuming ActivityLogRepository still uses this or similar
        const results: T[] = [];
        const actId = filter?.activity_id as string;
        for (const log of mockLogRows) {
          if (log.activity_id === actId) results.push(log as T);
        }
        return Success(results);
      }
      return Success([]);
    },

    insert: async <T>(table: string, row: Record<string, unknown>) => {
      if (table === 'activity') {
        const id = row.activity_id as string;
        mockActivityRows.set(id, row);
        return Success(row as T);
      }
      if (table === 'site_diary_logs') {
        mockLogRows.push(row as unknown as ActivityLogRowInternal);
        return Success(row as T);
      }
      return Success(row as T);
    },

    update: async <T>(table: string, filter: Record<string, unknown>, updates: Record<string, unknown>) => {
      if (table === 'activity') {
        const id = filter.activity_id as string;
        const existing = mockActivityRows.get(id);
        if (!existing) return Failure(new ActivityNotFoundError('Not found'));
        const updated = { ...existing, ...updates };
        mockActivityRows.set(id, updated);
        return Success(updated as T);
      }
      return Failure(new ActivityNotFoundError('Table not found'));
    },

    exists: async (_table: string, _filter: Record<string, unknown>) => {
      return Success(false);
    },
  };

  const activityRepo = new ActivityRepository(mockAdapter);
  const logRepo = new ActivityLogRepository(mockAdapter);
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();
  const logger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} } as unknown as Logger;
  const eventPublisher = new NoopDomainEventPublisher();



  const mockRevisionRepo: IProgrammeRevisionRepository = {
    findById: async (id) => Success({
      revisionId: id,
      programmeId: 'prog-999',
      revisionNumber: 1,
      revisionTitle: 'Rev',
      isCurrent: true,
      status: 'Approved',
      createdAt: '2026-08-01',
      createdBy: 'user',
    }),
    findByProgrammeId: async () => Success([]),
    findActiveRevision: async () => Success(null),
    create: async (r) => Success(r),
    updateStatus: async (id, s) => Success({ revisionId: id, status: s } as unknown as ProgrammeRevision),
  };

  const service = new OpenActivityService({
    activityRepository: activityRepo,
    logRepository: logRepo,
    transactionManager: txManager,
    revisionRepository: mockRevisionRepo,
    taskRepository: {
      getTaskById: async () => ({
        task_id: 'task-999',
        programme_id: 'prog-999',
        revision_id: 'rev-999',
        task_uid: 1,
        task_guid: null,
        wbs: '1',
        task_name: 'Task 999',
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
        created_by: 'user',
      }),
    },
    clock,
    logger,
    eventPublisher,
  });

  it('should execute createActivity and write single activity row + append-only site_diary_log', async () => {
    const createRes = await service.createActivity({
      siteDiaryId: 'diary-888', // This won't be persisted on Activity, but might be on Log or returned in DTO
      programmeId: 'prog-999',
      revisionId: 'rev-999',
      taskId: 'task-999',
      activityName: 'Memasang Papan Acuan',
      createdBy: 'user-supervisor',
    });

    expect(isSuccess(createRes)).toBe(true);
    if (isSuccess(createRes)) {
      const actId = createRes.value.activityId;

      // Verify activity table contains single row
      expect(mockActivityRows.has(actId)).toBe(true);
      expect(mockActivityRows.size).toBe(1);

      // Verify site_diary_logs contains 'NEW' event entry
      const historyRes = await service.getActivityHistory(actId);
      expect(isSuccess(historyRes)).toBe(true);
      if (isSuccess(historyRes)) {
        expect(historyRes.value.length).toBe(1);
        expect(historyRes.value[0]?.eventType).toBe('NEW');
      }
    }
  });

  it('should execute updateActivity and update single activity row + append UPDATE log', async () => {
    // Assuming 'act-1' exists in mockActivityRows from the previous test, or we'll fetch whatever is there.
    // Instead, let's just get the first created one manually or use the map.
    const createdActs = Array.from(mockActivityRows.values());
    expect(createdActs.length).toBeGreaterThan(0);
    
    const actId = createdActs[0]!.activity_id as string;

    const updateRes = await service.updateActivity({
      activityId: actId,
      activityName: 'Memasang Papan Acuan Blok B',
      updatedBy: 'user-supervisor',
    });

    expect(isSuccess(updateRes)).toBe(true);

    // Verify activity table STILL has 1 row (UPDATE modified existing row, no duplicates)
    expect(mockActivityRows.size).toBe(1);
    expect(mockActivityRows.get(actId)?.subtask).toBe('Memasang Papan Acuan Blok B');

    // Verify site_diary_logs now has 2 entries (NEW + UPDATE)
    const historyRes = await service.getActivityHistory(actId);
    expect(isSuccess(historyRes)).toBe(true);
    if (isSuccess(historyRes)) {
      expect(historyRes.value.length).toBe(2);
      expect(historyRes.value[1]?.eventType).toBe('UPDATE');
    }
  });
});
