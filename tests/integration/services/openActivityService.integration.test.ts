import { describe, it, expect } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { OpenActivityRepository } from '@/repositories/OpenActivityRepository';
import { ActivityLogRepository } from '@/repositories/ActivityLogRepository';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';
import { isSuccess, Success, Failure } from '@/lib/result';
import { ActivityNotFoundError } from '@/errors/activityErrors';

describe('OpenActivityService Integration Scenarios', () => {
  const mockDiaryRows: Map<string, Record<string, unknown>> = new Map();
  const mockLogRows: ActivityLogRowInternal[] = [];

  interface ActivityLogRowInternal {
    log_id: string;
    activity_id: string;
    site_diary_id: string;
    event_type: 'NEW' | 'UPDATE';
    snapshot_data: Record<string, unknown>;
    logged_at: string;
    logged_by: string;
  }

  const mockAdapter: IDatabaseAdapter = {
    selectOne: async <T>(table: string, filter: Record<string, unknown>) => {
      if (table === 'site_diary') {
        const id = filter.id as string;
        const item = mockDiaryRows.get(id);
        if (item) return Success(item as T);
        return Success(null);
      }
      return Success(null);
    },

    selectMany: async <T>(table: string, filter?: Record<string, unknown>) => {
      if (table === 'site_diary') {
        const results: T[] = [];
        for (const item of mockDiaryRows.values()) {
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
      if (table === 'site_diary_logs') {
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
      if (table === 'site_diary') {
        const id = row.id as string;
        mockDiaryRows.set(id, row);
        return Success(row as T);
      }
      if (table === 'site_diary_logs') {
        mockLogRows.push(row as unknown as ActivityLogRowInternal);
        return Success(row as T);
      }
      return Success(row as T);
    },

    update: async <T>(table: string, filter: Record<string, unknown>, updates: Record<string, unknown>) => {
      if (table === 'site_diary') {
        const id = filter.id as string;
        const existing = mockDiaryRows.get(id);
        if (!existing) return Failure(new ActivityNotFoundError('Not found'));
        const updated = { ...existing, ...updates };
        mockDiaryRows.set(id, updated);
        return Success(updated as T);
      }
      return Failure(new ActivityNotFoundError('Table not found'));
    },

    exists: async (_table: string, _filter: Record<string, unknown>) => {
      return Success(false);
    },
  };

  const activityRepo = new OpenActivityRepository(mockAdapter);
  const logRepo = new ActivityLogRepository(mockAdapter);
  const txManager = new DatabaseTransactionManager();
  const clock = new SystemClock();
  const logger = { info: () => {}, error: () => {}, warn: () => {}, debug: () => {} } as unknown as Logger;
  const eventPublisher = new NoopDomainEventPublisher();

  const service = new OpenActivityService({
    activityRepository: activityRepo,
    logRepository: logRepo,
    transactionManager: txManager,
    clock,
    logger,
    eventPublisher,
  });

  it('should execute createActivity and write single site_diary row + append-only site_diary_log', async () => {
    const createRes = await service.createActivity({
      siteDiaryId: 'diary-888',
      programmeId: 'prog-999',
      activityName: 'Memasang Papan Acuan',
      workforceCount: 6,
      createdBy: 'user-supervisor',
    });

    expect(isSuccess(createRes)).toBe(true);
    if (isSuccess(createRes)) {
      const actId = createRes.value.activityId;

      // Verify site_diary table contains single row
      expect(mockDiaryRows.has(actId)).toBe(true);
      expect(mockDiaryRows.size).toBe(1);

      // Verify site_diary_logs contains 'NEW' event entry
      const historyRes = await service.getActivityHistory(actId);
      expect(isSuccess(historyRes)).toBe(true);
      if (isSuccess(historyRes)) {
        expect(historyRes.value.length).toBe(1);
        expect(historyRes.value[0]?.eventType).toBe('NEW');
      }
    }
  });

  it('should execute updateActivity and update single site_diary row + append UPDATE log', async () => {
    const listRes = await service.getActivitiesForDiary('diary-888');
    expect(isSuccess(listRes)).toBe(true);

    if (isSuccess(listRes) && listRes.value.length > 0) {
      const actId = listRes.value[0]!.activityId;

      const updateRes = await service.updateActivity({
        activityId: actId,
        activityName: 'Memasang Papan Acuan Blok B',
        updatedBy: 'user-supervisor',
      });

      expect(isSuccess(updateRes)).toBe(true);

      // Verify site_diary table STILL has 1 row (UPDATE modified existing row, no duplicates)
      expect(mockDiaryRows.size).toBe(1);

      // Verify site_diary_logs now has 2 entries (NEW + UPDATE)
      const historyRes = await service.getActivityHistory(actId);
      expect(isSuccess(historyRes)).toBe(true);
      if (isSuccess(historyRes)) {
        expect(historyRes.value.length).toBe(2);
        expect(historyRes.value[1]?.eventType).toBe('UPDATE');
      }
    }
  });
});
