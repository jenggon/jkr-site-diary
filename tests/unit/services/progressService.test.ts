/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressService } from '@/services/progressService';
import { ProgressMeasurementStatus } from '@/types/progress';
import { Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { ValidationError, InfrastructureError } from '@/lib/errors';

describe('ProgressService', () => {
  let mockActivityRepo: any;
  let mockSiteDiaryRepo: any;
  let mockRevisionRepo: any;
  let mockProgressRepo: any;
  let mockAuditRepo: any;
  let mockTxManager: any;
  let mockOpenActivityService: any;
  let mockAtomicRepo: any;
  let mockClock: any;
  let mockLogger: any;
  let service: ProgressService;

  beforeEach(() => {
    mockActivityRepo = { findById: vi.fn() };
    mockSiteDiaryRepo = { getSiteDiaryById: vi.fn() };
    mockRevisionRepo = { findById: vi.fn() };
    mockProgressRepo = {
      createProgress: vi.fn(),
      getProgressByActivity: vi.fn(),
      updateProgress: vi.fn(),
      getProgressById: vi.fn()
    };
    mockAuditRepo = { createAudit: vi.fn() };
    
    // Stub TransactionManager to just execute the block
    mockTxManager = {
      execute: vi.fn(async (block) => {
        try {
          return await block();
        } catch (e: any) {
          return Failure(new InfrastructureError(e.message));
        }
      })
    };
    mockOpenActivityService = { completeActivity: vi.fn() };
    mockAtomicRepo = {
      create: vi.fn((payload, actorId) => mockTxManager.execute(async () => {
        const created = await mockProgressRepo.createProgress(payload);
        await mockAuditRepo.createAudit({ event_type: 'Create', performed_by: actorId });
        return Success(created);
      }).then((result: any) => {
        if (isFailure(result)) throw result.error;
        return result.value;
      })),
      update: vi.fn((progressId, payload, actorId) => mockTxManager.execute(async () => {
        const updated = await mockProgressRepo.updateProgress(progressId, payload);
        await mockAuditRepo.createAudit({ event_type: 'Update', performed_by: actorId });
        return Success(updated);
      }).then((result: any) => {
        if (isFailure(result)) throw result.error;
        return result.value;
      })),
    };
    mockClock = { nowIso: vi.fn().mockReturnValue('2026-08-15T00:00:00Z') };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    service = new ProgressService({
      activityRepository: mockActivityRepo,
      siteDiaryRepository: mockSiteDiaryRepo,
      revisionRepository: mockRevisionRepo,
      progressRepository: mockProgressRepo,
      atomicRepository: mockAtomicRepo,
      clock: mockClock,
      logger: mockLogger,
    });
  });

  const validCmd = {
    programme_id: 'prog-1',
    revision_id: 'rev-1',
    activity_id: 'act-1',
    site_diary_id: 'sd-1',
    measurement_date: '2026-08-15',
    actual_quantity: 10,
  };

  const setupValidMocks = () => {
    mockActivityRepo.findById.mockResolvedValue(Success({
      activity_id: 'act-1',
      status: 'In Progress',
    }));
    mockRevisionRepo.findById.mockResolvedValue(Success({ revision_id: 'rev-1', status: 'Approved', isCurrent: true }));
    mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue({ site_diary_id: 'sd-1', activity_id: 'act-1' });
    mockProgressRepo.getProgressByActivity.mockResolvedValue([{ actual_quantity: 40, planned_quantity: 100 }]);
    mockProgressRepo.createProgress.mockResolvedValue({ progress_id: 'prog-123', progress_percentage: 50 });
    mockProgressRepo.updateProgress.mockResolvedValue({ progress_id: 'prog-123', progress_percentage: 60 });
    mockOpenActivityService.completeActivity.mockResolvedValue(Success({}));
  };

  it('1. Rejects creation if Activity is missing', async () => {
    setupValidMocks();
    mockActivityRepo.findById.mockResolvedValue(Success(null));

    const result = await service.createProgress(validCmd, 'user-123');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain('Activity not found');
    }
  });

  it('2. Rejects creation if Site Diary is missing or mismatch', async () => {
    setupValidMocks();
    mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(null);

    let result = await service.createProgress(validCmd, 'user-123');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toContain('Site Diary not found');
    }

    mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue({ site_diary_id: 'sd-1', activity_id: 'wrong-act' });
    result = await service.createProgress(validCmd, 'user-123');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.message).toContain('Context mismatch');
    }
  });

  it('3. Rejects creation if Revision is inactive or superseded', async () => {
    setupValidMocks();
    mockRevisionRepo.findById.mockResolvedValue(Success({ revision_id: 'rev-1', status: 'Draft', isCurrent: false }));

    const result = await service.createProgress(validCmd, 'user-123');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain('Revision is not active');
    }
  });

  it('6. Rejects creation if cumulative progress > 100%', async () => {
    setupValidMocks();
    mockProgressRepo.getProgressByActivity.mockResolvedValue([{ actual_quantity: 95, planned_quantity: 100 }]);

    const result = await service.createProgress({ ...validCmd, actual_quantity: 10 }, 'user-123');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.message).toContain('MUST NOT exceed 100.00%');
    }
  });

  it('7. createProgress executes through TransactionManager', async () => {
    setupValidMocks();

    const result = await service.createProgress(validCmd, 'user-123');
    expect(isSuccess(result)).toBe(true);
    expect(mockTxManager.execute).toHaveBeenCalled();
    expect(mockProgressRepo.createProgress).toHaveBeenCalled();
  });

  it('8. updateProgress executes through TransactionManager', async () => {
    setupValidMocks();
    mockProgressRepo.getProgressById.mockResolvedValue({ 
      progress_id: 'prog-123', activity_id: 'act-1', site_diary_id: 'sd-1', revision_id: 'rev-1', actual_quantity: 40 
    });

    const result = await service.updateProgress('prog-123', { actual_quantity: 50 }, 'user-123');
    expect(isSuccess(result)).toBe(true);
    expect(mockTxManager.execute).toHaveBeenCalled();
    expect(mockProgressRepo.updateProgress).toHaveBeenCalled();
  });

  it('9. Audit operation occurs within the atomic operation', async () => {
    setupValidMocks();

    const result = await service.createProgress(validCmd, 'user-123');
    expect(isSuccess(result)).toBe(true);
    expect(mockAuditRepo.createAudit).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'Create',
      performed_by: 'user-123'
    }));
  });

  it('10. 100% APPROVED cumulative progress validates completion and delegates atomic persistence', async () => {
    setupValidMocks();
    mockProgressRepo.createProgress.mockResolvedValue({ progress_id: 'prog-123', progress_percentage: 100 });

    const result = await service.createProgress({ ...validCmd, measurement_status: ProgressMeasurementStatus.Approved, progress_percentage: 100 }, 'user-123');
    expect(isSuccess(result)).toBe(true);
    expect(mockAtomicRepo.create).toHaveBeenCalledWith(expect.any(Object), 'user-123');
  });

  it('11. Failure inside the atomic operation propagates error', async () => {
    setupValidMocks();
    mockAuditRepo.createAudit.mockRejectedValue(new Error('Audit DB down'));

    const result = await service.createProgress(validCmd, 'user-123');
    expect(isFailure(result)).toBe(true);
    // Even though txManager catches it, in real env it rolls back.
    if (isFailure(result)) {
      expect(result.error.message).toContain('Audit DB down');
    }
  });
});
