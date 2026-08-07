import { describe, it, expect } from 'vitest';
import { mapErrorToHttpStatus } from '@/app/api/_shared/httpErrorMapper';
import { toSuccessResponse, createdResponse, toErrorResponse, pagedResponse } from '@/app/api/_shared/response';
import { mapActivityToResponseDto, mapActivityLogToResponseDto } from '@/app/api/_shared/activity.mapper';
import { ActivityNotFoundError, ActivityValidationError, ActivityLockedError } from '@/errors/activityErrors';
import { OpenActivity, ActivityLogEntry } from '@/types/openActivity';

describe('Activity API Shared Infrastructure', () => {
  describe('httpErrorMapper', () => {
    it('should map ActivityNotFoundError to 404', () => {
      const err = new ActivityNotFoundError('Activity act-1 not found');
      expect(mapErrorToHttpStatus(err)).toBe(404);
    });

    it('should map ActivityValidationError to 400', () => {
      const err = new ActivityValidationError('Invalid name');
      expect(mapErrorToHttpStatus(err)).toBe(400);
    });

    it('should map ActivityLockedError to 423', () => {
      const err = new ActivityLockedError('Locked');
      expect(mapErrorToHttpStatus(err)).toBe(423);
    });
  });

  describe('response builders envelope contract', () => {
    it('should format toSuccessResponse as { success: true, data }', async () => {
      const res = toSuccessResponse({ id: '123' });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ success: true, data: { id: '123' } });
    });

    it('should format createdResponse as { success: true, data } with 201', async () => {
      const res = createdResponse({ id: '456' });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ success: true, data: { id: '456' } });
    });

    it('should format pagedResponse as { success: true, data, pagination }', async () => {
      const res = pagedResponse(['a', 'b'], { total: 10, limit: 2, offset: 0, hasNext: true });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        data: ['a', 'b'],
        pagination: { total: 10, limit: 2, offset: 0, hasNext: true },
      });
    });

    it('should format toErrorResponse as { success: false, error: { code, message } }', async () => {
      const err = new ActivityNotFoundError('Activity not found');
      const res = toErrorResponse(err);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Activity not found',
        },
      });
    });
  });

  describe('activity mappers', () => {
    it('should map OpenActivity domain entity to OpenActivityResponseDto explicitly', () => {
      const entity: OpenActivity = {
        activityId: 'act-1',
        siteDiaryId: 'diary-100',
        programmeId: 'prog-1',
        taskId: 'task-5',
        activityName: 'Kerja Memasang Tetulang',
        location: { buildingId: 'b-1', floorLevel: 'Level 2' },
        tradeInfo: { tradeId: 't-1', tradeCode: 'CON', tradeName: 'Concrete', source: 'TradeLibrary' },
        workforceCount: 8,
        status: 'InProgress',
        isLocked: false,
        createdAt: '2026-08-08T00:00:00.000Z',
        createdBy: 'user-supervisor',
      };

      const dto = mapActivityToResponseDto(entity);
      expect(dto.activity_id).toBe('act-1');
      expect(dto.site_diary_id).toBe('diary-100');
      expect(dto.location?.building_id).toBe('b-1');
      expect(dto.trade_info?.source).toBe('TradeLibrary');
      expect(dto.workforce_count).toBe(8);
      expect(dto.status).toBe('InProgress');
    });

    it('should map ActivityLogEntry domain entity to ActivityLogEntryResponseDto explicitly', () => {
      const log: ActivityLogEntry = {
        logId: 'log-1',
        activityId: 'act-1',
        siteDiaryId: 'diary-100',
        eventType: 'NEW',
        snapshotData: { name: 'test' },
        loggedAt: '2026-08-08T00:00:00.000Z',
        loggedBy: 'user-supervisor',
      };

      const dto = mapActivityLogToResponseDto(log);
      expect(dto.log_id).toBe('log-1');
      expect(dto.event_type).toBe('NEW');
      expect(dto.logged_by).toBe('user-supervisor');
    });
  });
});
