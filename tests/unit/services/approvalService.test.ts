/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApprovalService } from '@/services/approvalService';
import { ApprovalStatus } from '@/types/approval';
import { Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { ValidationError, InfrastructureError } from '@/lib/errors';
import { AuditEventType } from '@/types/audit';

describe('ApprovalService', () => {
  let mockRevisionRepo: any;
  let mockActivityRepo: any;
  let mockSiteDiaryRepo: any;
  let mockProgressRepo: any;
  let mockApprovalRepo: any;
  let mockAuditRepo: any;
  let mockTxManager: any;
  let mockClock: any;
  let mockLogger: any;
  let service: ApprovalService;

  beforeEach(() => {
    mockRevisionRepo = { findById: vi.fn() };
    mockActivityRepo = { findById: vi.fn() };
    mockSiteDiaryRepo = { getSiteDiaryById: vi.fn() };
    mockProgressRepo = { getProgressById: vi.fn() };
    mockApprovalRepo = {
      createApproval: vi.fn(),
      getApprovalById: vi.fn(),
      updateApproval: vi.fn(),
      getApprovalsByActivity: vi.fn(),
      getApprovalsBySiteDiary: vi.fn(),
      getApprovalsByProgress: vi.fn(),
    };
    mockAuditRepo = { createAudit: vi.fn() };

    mockTxManager = {
      execute: vi.fn(async (block) => {
        try {
          return await block();
        } catch (e: any) {
          return Failure(new InfrastructureError(e.message));
        }
      }),
    };
    mockClock = { nowIso: vi.fn().mockReturnValue('2026-08-15T12:00:00Z') };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    service = new ApprovalService({
      revisionRepository: mockRevisionRepo,
      activityRepository: mockActivityRepo,
      siteDiaryRepository: mockSiteDiaryRepo,
      progressRepository: mockProgressRepo,
      approvalRepository: mockApprovalRepo,
      auditRepository: mockAuditRepo,
      transactionManager: mockTxManager,
      clock: mockClock,
      logger: mockLogger,
    });
  });

  const validRevision = {
    revision_id: 'rev-1',
    status: 'Approved',
    isCurrent: true,
  };

  const validActivity = {
    activity_id: 'act-1',
    revision_id: 'rev-1',
  };

  const validSiteDiary = {
    site_diary_id: 'diary-1',
    activity_id: 'act-1',
  };

  const validProgress = {
    progress_id: 'prog-1',
    activity_id: 'act-1',
  };

  const validCreateCmd = {
    programme_id: 'prog-root-1',
    revision_id: 'rev-1',
    activity_id: 'act-1',
    site_diary_id: 'diary-1',
    progress_id: 'prog-1',
    requested_by: 'usr-engineer-1',
    approval_comment: 'Ready for review',
  };

  describe('createApproval', () => {
    it('should create approval and audit log atomically on valid input', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockActivityRepo.findById.mockResolvedValue(Success(validActivity));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(validSiteDiary);
      mockProgressRepo.getProgressById.mockResolvedValue(validProgress);
      mockApprovalRepo.createApproval.mockResolvedValue({
        approval_id: 'appr-1',
        programme_id: 'prog-root-1',
        revision_id: 'rev-1',
        approval_status: ApprovalStatus.Pending,
      });
      mockAuditRepo.createAudit.mockResolvedValue(null);

      const result = await service.createApproval(validCreateCmd);

      expect(isSuccess(result)).toBe(true);
      expect(mockTxManager.execute).toHaveBeenCalled();
      expect(mockApprovalRepo.createApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          approval_status: ApprovalStatus.Pending,
          requested_by: 'usr-engineer-1',
          created_at: '2026-08-15T12:00:00Z',
        })
      );
      expect(mockAuditRepo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_name: 'APPROVAL',
          event_type: AuditEventType.Create,
          new_value: ApprovalStatus.Pending,
        })
      );
    });

    it('should reject if revision is not found', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(null));

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Programme Revision not found');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if revision is not Approved', async () => {
      mockRevisionRepo.findById.mockResolvedValue(
        Success({ ...validRevision, status: 'Draft' })
      );

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Revision is not active');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if revision is not current', async () => {
      mockRevisionRepo.findById.mockResolvedValue(
        Success({ ...validRevision, isCurrent: false })
      );

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Revision is not active');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if activity is not found', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockActivityRepo.findById.mockResolvedValue(Success(null));

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Activity not found');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if activity belongs to a different revision', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockActivityRepo.findById.mockResolvedValue(
        Success({ ...validActivity, revision_id: 'rev-other' })
      );

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('belongs to revision rev-other');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if site diary does not belong to activity', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockActivityRepo.findById.mockResolvedValue(Success(validActivity));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue({
        ...validSiteDiary,
        activity_id: 'act-other',
      });

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('does not belong to Activity');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if progress record does not belong to activity', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockActivityRepo.findById.mockResolvedValue(Success(validActivity));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(validSiteDiary);
      mockProgressRepo.getProgressById.mockResolvedValue({
        ...validProgress,
        activity_id: 'act-other',
      });

      const result = await service.createApproval(validCreateCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('does not belong to Activity');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });
  });

  describe('updateApproval', () => {
    const existingPendingApproval = {
      approval_id: 'appr-1',
      programme_id: 'prog-root-1',
      revision_id: 'rev-1',
      activity_id: 'act-1',
      site_diary_id: 'diary-1',
      progress_id: 'prog-1',
      approval_status: ApprovalStatus.Pending,
      approved_by: null,
      approval_date: null,
      approval_comment: null,
    };

    beforeEach(() => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockActivityRepo.findById.mockResolvedValue(Success(validActivity));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(validSiteDiary);
      mockProgressRepo.getProgressById.mockResolvedValue(validProgress);
    });

    it('should successfully approve a pending request and log Approve audit event atomically', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);
      mockApprovalRepo.updateApproval.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Approved,
        approved_by: 'usr-so-1',
        approval_date: '2026-08-15T12:00:00Z',
      });
      mockAuditRepo.createAudit.mockResolvedValue(null);

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'usr-so-1',
        approval_comment: 'Approved on site',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockTxManager.execute).toHaveBeenCalled();
      expect(mockApprovalRepo.updateApproval).toHaveBeenCalledWith(
        'appr-1',
        expect.objectContaining({
          approval_status: ApprovalStatus.Approved,
          approved_by: 'usr-so-1',
        })
      );
      expect(mockAuditRepo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuditEventType.Approve,
          new_value: ApprovalStatus.Approved,
        })
      );
    });

    it('should successfully reject a pending request when comment is provided and log Reject audit event', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);
      mockApprovalRepo.updateApproval.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Rejected,
        approved_by: 'usr-so-1',
      });
      mockAuditRepo.createAudit.mockResolvedValue(null);

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Rejected,
        approved_by: 'usr-so-1',
        approval_comment: 'Invalid rain hours reported',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockAuditRepo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuditEventType.Reject,
          new_value: ApprovalStatus.Rejected,
        })
      );
    });

    it('should reject rejection attempt without mandatory comment', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Rejected,
        approved_by: 'usr-so-1',
        approval_comment: '',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Rejection comment is mandatory');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should successfully return a pending request when comment is provided and log Update audit event', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);
      mockApprovalRepo.updateApproval.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Returned,
      });
      mockAuditRepo.createAudit.mockResolvedValue(null);

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Returned,
        approval_comment: 'Please clarify trade headcounts',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockAuditRepo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuditEventType.Update,
          new_value: ApprovalStatus.Returned,
        })
      );
    });

    it('should reject return attempt without mandatory comment', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Returned,
        approval_comment: '   ',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Return comment is mandatory');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should successfully cancel a pending request', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);
      mockApprovalRepo.updateApproval.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Cancelled,
      });
      mockAuditRepo.createAudit.mockResolvedValue(null);

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Cancelled,
        approval_comment: 'Withdrawn by submitter',
      });

      expect(isSuccess(result)).toBe(true);
      expect(mockAuditRepo.createAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: AuditEventType.Update,
          new_value: ApprovalStatus.Cancelled,
        })
      );
    });

    it('should forbid transition from terminal Approved state', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Approved,
      });

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Returned,
        approval_comment: 'Attempting reopen',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Cannot transition approval from terminal state: Approved');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should forbid transition from terminal Rejected state', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Rejected,
      });

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Cannot transition approval from terminal state: Rejected');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should forbid transition from terminal Cancelled state', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Cancelled,
      });

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toContain('Cannot transition approval from terminal state: Cancelled');
      }
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should rollback transaction when audit creation fails', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue(existingPendingApproval);
      mockApprovalRepo.updateApproval.mockResolvedValue({
        ...existingPendingApproval,
        approval_status: ApprovalStatus.Approved,
      });
      mockAuditRepo.createAudit.mockRejectedValue(new Error('Audit DB write failure'));

      const result = await service.updateApproval('appr-1', {
        approval_status: ApprovalStatus.Approved,
        approved_by: 'usr-so-1',
      });

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(InfrastructureError);
        expect(result.error.message).toContain('Audit DB write failure');
      }
    });
  });

  describe('query methods', () => {
    it('should retrieve approval by id', async () => {
      mockApprovalRepo.getApprovalById.mockResolvedValue({ approval_id: 'appr-1' });

      const result = await service.getApprovalById('appr-1');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual({ approval_id: 'appr-1' });
      }
    });

    it('should retrieve approvals by activity', async () => {
      mockApprovalRepo.getApprovalsByActivity.mockResolvedValue([{ approval_id: 'appr-1' }]);

      const result = await service.getApprovalsByActivity('act-1');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual([{ approval_id: 'appr-1' }]);
      }
    });

    it('should retrieve approvals by site diary', async () => {
      mockApprovalRepo.getApprovalsBySiteDiary.mockResolvedValue([{ approval_id: 'appr-1' }]);

      const result = await service.getApprovalsBySiteDiary('diary-1');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual([{ approval_id: 'appr-1' }]);
      }
    });

    it('should retrieve approvals by progress', async () => {
      mockApprovalRepo.getApprovalsByProgress.mockResolvedValue([{ approval_id: 'appr-1' }]);

      const result = await service.getApprovalsByProgress('prog-1');

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toEqual([{ approval_id: 'appr-1' }]);
      }
    });
  });
});
