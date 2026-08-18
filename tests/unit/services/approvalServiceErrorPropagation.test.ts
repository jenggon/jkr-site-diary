/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalService } from '@/services/approvalService';
import { ApprovalStatus } from '@/types/approval';
import { Success, isSuccess, isFailure } from '@/lib/result';
import {
  ApprovalStaleSiteDiaryError,
  ApprovalContextChangedError,
  ApprovalTerminalStateError,
} from '@/errors/approvalErrors';
import { ValidationError, InfrastructureError } from '@/lib/errors';

describe('ApprovalService Error Propagation Contract', () => {
  let mockRevisionRepo: any;
  let mockActivityRepo: any;
  let mockSiteDiaryRepo: any;
  let mockProgressRepo: any;
  let mockApprovalRepo: any;
  let mockAtomicRepo: any;
  let mockClock: any;
  let mockLogger: any;
  let service: ApprovalService;

  const validRevision = {
    revision_id: 'rev-1',
    status: 'Approved',
    isCurrent: true,
  };

  const validActivity = {
    activity_id: 'act-1',
    revision_id: 'rev-1',
    programme_id: 'prog-1',
  };

  const validSiteDiary = {
    site_diary_id: 'diary-1',
    activity_id: 'act-1',
  };

  const existingPendingApproval = {
    approval_id: 'appr-1',
    programme_id: 'prog-1',
    revision_id: 'rev-1',
    activity_id: 'act-1',
    site_diary_id: 'diary-1',
    approval_status: ApprovalStatus.Pending,
    approved_by: null,
    approval_date: null,
    approval_comment: null,
  };

  beforeEach(() => {
    mockRevisionRepo = { findById: vi.fn().mockResolvedValue(Success(validRevision)) };
    mockActivityRepo = { findById: vi.fn().mockResolvedValue(Success(validActivity)) };
    mockSiteDiaryRepo = { getSiteDiaryById: vi.fn().mockResolvedValue(validSiteDiary) };
    mockProgressRepo = { getProgressById: vi.fn() };
    mockApprovalRepo = {
      getApprovalById: vi.fn().mockResolvedValue(existingPendingApproval),
    };
    mockAtomicRepo = {
      create: vi.fn(),
      update: vi.fn(),
    };
    mockClock = { nowIso: vi.fn().mockReturnValue('2026-08-18T12:00:00Z') };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    service = new ApprovalService({
      revisionRepository: mockRevisionRepo,
      activityRepository: mockActivityRepo,
      siteDiaryRepository: mockSiteDiaryRepo,
      progressRepository: mockProgressRepo,
      approvalRepository: mockApprovalRepo,
      atomicRepository: mockAtomicRepo,
      clock: mockClock,
      logger: mockLogger,
    });
  });

  describe('createApproval error propagation', () => {
    it('propagates ApprovalStaleSiteDiaryError (409) without message substring matching', async () => {
      mockAtomicRepo.create.mockRejectedValue(new ApprovalStaleSiteDiaryError('DB PT409 Conflict'));

      const result = await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        activity_id: 'act-1',
        site_diary_id: 'diary-1',
        requested_by: 'user-1',
        expected_site_diary_last_modified_at: '2026-08-18T10:00:00Z',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ApprovalStaleSiteDiaryError);
        expect(result.error.httpStatus).toBe(409);
      }
    });

    it('rejects missing expected_site_diary_last_modified_at with ValidationError (400) when site_diary_id is present', async () => {
      const result = await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        activity_id: 'act-1',
        site_diary_id: 'diary-1',
        requested_by: 'user-1',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.httpStatus).toBe(400);
      }
      expect(mockAtomicRepo.create).not.toHaveBeenCalled();
    });

    it('allows createApproval without token when site_diary_id is null', async () => {
      mockAtomicRepo.create.mockResolvedValue({ approval_id: 'appr-non-diary' });

      const result = await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        activity_id: 'act-1',
        site_diary_id: null,
        requested_by: 'user-1',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockAtomicRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ site_diary_id: null }),
        'user-1',
        undefined
      );
    });

    it('propagates unexpected DB error as InfrastructureError (500), NOT misclassified as 409', async () => {
      mockAtomicRepo.create.mockRejectedValue(new Error('Connection terminated unexpectedly'));

      const result = await service.createApproval({
        programme_id: 'prog-1',
        revision_id: 'rev-1',
        activity_id: 'act-1',
        site_diary_id: 'diary-1',
        requested_by: 'user-1',
        expected_site_diary_last_modified_at: '2026-08-18T10:00:00Z',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(InfrastructureError);
        expect(result.error.httpStatus).toBe(500);
      }
    });
  });

  describe('updateApproval error propagation', () => {
    it('propagates ApprovalStaleSiteDiaryError (409)', async () => {
      mockAtomicRepo.update.mockRejectedValue(new ApprovalStaleSiteDiaryError('Stale token'));

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'so-1',
        expected_site_diary_last_modified_at: '2026-08-18T10:00:00Z',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ApprovalStaleSiteDiaryError);
        expect(result.error.httpStatus).toBe(409);
      }
    });

    it('propagates ApprovalContextChangedError (409)', async () => {
      mockAtomicRepo.update.mockRejectedValue(new ApprovalContextChangedError('Context changed'));

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'so-1',
        expected_site_diary_last_modified_at: '2026-08-18T10:00:00Z',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ApprovalContextChangedError);
        expect(result.error.httpStatus).toBe(409);
      }
    });

    it('propagates ApprovalTerminalStateError (409) from repository', async () => {
      mockAtomicRepo.update.mockRejectedValue(new ApprovalTerminalStateError('Terminal state'));

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'so-1',
        expected_site_diary_last_modified_at: '2026-08-18T10:00:00Z',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ApprovalTerminalStateError);
        expect(result.error.httpStatus).toBe(409);
      }
    });

    it('rejects missing token when updating Site Diary approval with ValidationError (400)', async () => {
      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'so-1',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.httpStatus).toBe(400);
      }
      expect(mockAtomicRepo.update).not.toHaveBeenCalled();
    });

    it('does NOT misclassify generic unexpected error as 409', async () => {
      mockAtomicRepo.update.mockRejectedValue(new Error('Syntax error in SQL query'));

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'so-1',
        expected_site_diary_last_modified_at: '2026-08-18T10:00:00Z',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(InfrastructureError);
        expect(result.error.httpStatus).toBe(500);
      }
    });
  });
});
