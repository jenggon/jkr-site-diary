/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkforceService } from '@/services/workforceService';
import { Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { ValidationError, InfrastructureError } from '@/lib/errors';

describe('WorkforceService', () => {
  let mockSiteDiaryRepo: any;
  let mockRevisionRepo: any;
  let mockTradeLibraryRepo: any;
  let mockWorkforceRepo: any;
  let mockAuditRepo: any;
  let mockTxManager: any;
  let mockClock: any;
  let mockLogger: any;
  let service: WorkforceService;

  beforeEach(() => {
    mockSiteDiaryRepo = { getSiteDiaryById: vi.fn() };
    mockRevisionRepo = { findById: vi.fn() };
    mockTradeLibraryRepo = { getTradeById: vi.fn() };
    mockWorkforceRepo = {
      createWorkforce: vi.fn(),
      getWorkforceById: vi.fn(),
      updateWorkforce: vi.fn(),
      getWorkforceBySiteDiary: vi.fn(),
      getWorkforceByActivity: vi.fn()
    };
    mockAuditRepo = { createAudit: vi.fn() };
    
    mockTxManager = {
      execute: vi.fn(async (block) => {
        try {
          return await block();
        } catch (e: any) {
          return Failure(new InfrastructureError(e.message));
        }
      })
    };
    mockClock = { nowIso: vi.fn().mockReturnValue('2026-08-15T00:00:00Z') };
    mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    service = new WorkforceService({
      siteDiaryRepository: mockSiteDiaryRepo,
      revisionRepository: mockRevisionRepo,
      tradeLibraryRepository: mockTradeLibraryRepo,
      workforceRepository: mockWorkforceRepo,
      auditRepository: mockAuditRepo,
      transactionManager: mockTxManager,
      clock: mockClock,
      logger: mockLogger,
    });
  });

  const validCmd = {
    programme_id: 'prog-1',
    revision_id: 'rev-1',
    activity_id: 'act-1',
    site_diary_id: 'diary-1',
    trade_id: 'trade-1',
    bumiputera_count: 5,
    non_bumiputera_count: 2,
    foreign_count: 0,
  };

  const validRevision = {
    revision_id: 'rev-1',
    status: 'Approved',
    isCurrent: true
  };

  const validSiteDiary = {
    site_diary_id: 'diary-1',
    activity_id: 'act-1'
  };

  const validTrade = {
    trade_id: 'trade-1',
    trade_name: 'Carpenter',
    is_active: true
  };

  describe('createWorkforce', () => {
    it('should create workforce and audit log atomically on valid input', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(validSiteDiary);
      mockTradeLibraryRepo.getTradeById.mockResolvedValue(validTrade);
      mockWorkforceRepo.createWorkforce.mockResolvedValue({ workforce_id: 'wf-1' });
      mockAuditRepo.createAudit.mockResolvedValue(null);

      const result = await service.createWorkforce(validCmd);

      expect(isSuccess(result)).toBe(true);
      expect(mockTxManager.execute).toHaveBeenCalled();
      expect(mockWorkforceRepo.createWorkforce).toHaveBeenCalledWith(expect.objectContaining({
        trade_name: 'Carpenter',
        total_count: 7
      }));
      expect(mockAuditRepo.createAudit).toHaveBeenCalled();
    });

    it('should reject if revision is not found', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(null));

      const result = await service.createWorkforce(validCmd);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should reject if revision is not active', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success({ ...validRevision, status: 'Draft' }));

      const result = await service.createWorkforce(validCmd);

      expect(isFailure(result)).toBe(true);
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if site diary belongs to a different activity', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue({ ...validSiteDiary, activity_id: 'act-999' });

      const result = await service.createWorkforce(validCmd);

      expect(isFailure(result)).toBe(true);
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if trade is inactive', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(validSiteDiary);
      mockTradeLibraryRepo.getTradeById.mockResolvedValue({ ...validTrade, is_active: false });

      const result = await service.createWorkforce(validCmd);

      expect(isFailure(result)).toBe(true);
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });

    it('should reject if counts are negative', async () => {
      mockRevisionRepo.findById.mockResolvedValue(Success(validRevision));
      mockSiteDiaryRepo.getSiteDiaryById.mockResolvedValue(validSiteDiary);
      mockTradeLibraryRepo.getTradeById.mockResolvedValue(validTrade);

      const result = await service.createWorkforce({ ...validCmd, bumiputera_count: -1 });

      expect(isFailure(result)).toBe(true);
      expect(mockTxManager.execute).not.toHaveBeenCalled();
    });
  });
});
