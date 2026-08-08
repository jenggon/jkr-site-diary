import { describe, it, expect, vi } from 'vitest';
import { TreEngineService } from '@/services/TreEngineService';
import { IProgramKerjaBoundaryService } from '@/services/IProgramKerjaBoundaryService';
import { ITradeLibraryRepository } from '@/repositories/ITradeLibraryRepository';
import { IKnowledgeEngineAdapter } from '@/services/adapters/IKnowledgeEngineAdapter';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { isSuccess, isFailure, Success } from '@/lib/result';
import { TreResolutionContext, KnowledgeTradeRecommendation } from '@/types/tre';
import { ProgramKerjaTradeDTO } from '@/dto/programKerjaDto';
import { TradeLibrary } from '@/types/tradeLibrary';
import { NoTradeRecommendationFoundError } from '@/errors/treErrors';

describe('TreEngineService', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-08T12:00:00.000Z',
    nowUtcDate: () => new Date('2026-08-08T12:00:00.000Z'),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => mockLogger,
  } as unknown as Logger;

  const sampleContext: TreResolutionContext = {
    siteDiaryId: 'diary-1',
    programmeId: 'prog-1',
    revisionId: 'rev-approved-1',
    mspTaskId: 'task-100',
    activityName: 'Kerja Konkrit Substruktur',
  };

  const samplePkTrade: ProgramKerjaTradeDTO = {
    tradeId: 'res-1',
    tradeCode: 'CONCRETOR',
    tradeName: 'Pekerja Konkrit',
    tradeCategory: 'Skilled',
  };

  const sampleKeTrade: KnowledgeTradeRecommendation = {
    recommendedTradeId: 'trade-ke-1',
    tradeCode: 'BAR_BENDER',
    tradeName: 'Pemasang Besi',
    tradeCategory: 'Skilled',
    rank: 1,
  };

  const sampleDefaultTrade: TradeLibrary = {
    trade_id: 'trade-def-1',
    trade_code: 'GENERAL_WORKER',
    trade_name: 'Buruh Am',
    trade_category: 'General',
    description: null,
    display_order: 1,
    is_active: true,
    created_at: '2026-08-08T00:00:00.000Z',
    created_by: 'system',
    updated_at: null,
    updated_by: null,
  };

  it('resolves Priority 1 (Program Kerja Boundary Trade) when available', async () => {
    const mockPkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: vi.fn().mockResolvedValue(Success(samplePkTrade)),
      getProgramKerjaWorkforce: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaMaterials: vi.fn().mockResolvedValue(Success(null)),
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: vi.fn().mockResolvedValue(null),
      getTradeByCode: vi.fn().mockResolvedValue(null),
      getTradeById: vi.fn().mockResolvedValue(null),
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: vi.fn().mockResolvedValue(null),
    };

    const service = new TreEngineService({
      programKerjaBoundaryService: mockPkBoundary,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.resolveTradeRecommendation(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('MSP_RESOURCE');
      expect(result.value.tradeCode).toBe('CONCRETOR');
      expect(result.value.tradeName).toBe('Pekerja Konkrit');
    }
    expect(mockPkBoundary.getProgramKerjaTrade).toHaveBeenCalledWith('prog-1', 'rev-approved-1', 'task-100');
    expect(mockKeAdapter.getTopRecommendation).not.toHaveBeenCalled();
    expect(mockTradeLibRepo.getDefaultTrade).not.toHaveBeenCalled();
  });

  it('falls back to Priority 2 (Knowledge Engine) when Priority 1 is missing', async () => {
    const mockPkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaWorkforce: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaMaterials: vi.fn().mockResolvedValue(Success(null)),
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: vi.fn().mockResolvedValue(null),
      getTradeByCode: vi.fn().mockResolvedValue(null),
      getTradeById: vi.fn().mockResolvedValue(null),
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: vi.fn().mockResolvedValue(sampleKeTrade),
    };

    const service = new TreEngineService({
      programKerjaBoundaryService: mockPkBoundary,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.resolveTradeRecommendation(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('KNOWLEDGE_ENGINE');
      expect(result.value.tradeCode).toBe('BAR_BENDER');
    }
    expect(mockPkBoundary.getProgramKerjaTrade).toHaveBeenCalled();
    expect(mockKeAdapter.getTopRecommendation).toHaveBeenCalledWith(sampleContext);
    expect(mockTradeLibRepo.getDefaultTrade).not.toHaveBeenCalled();
  });

  it('falls back to Priority 3 (Master Trade Library) when Priority 1 and 2 miss', async () => {
    const mockPkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaWorkforce: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaMaterials: vi.fn().mockResolvedValue(Success(null)),
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: vi.fn().mockResolvedValue(sampleDefaultTrade),
      getTradeByCode: vi.fn().mockResolvedValue(null),
      getTradeById: vi.fn().mockResolvedValue(null),
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: vi.fn().mockResolvedValue(null),
    };

    const service = new TreEngineService({
      programKerjaBoundaryService: mockPkBoundary,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.resolveTradeRecommendation(sampleContext);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('TRADE_LIBRARY');
      expect(result.value.tradeCode).toBe('GENERAL_WORKER');
    }
    expect(mockTradeLibRepo.getDefaultTrade).toHaveBeenCalled();
  });

  it('returns NoTradeRecommendationFoundError when all 3 priorities miss', async () => {
    const mockPkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaWorkforce: vi.fn().mockResolvedValue(Success(null)),
      getProgramKerjaMaterials: vi.fn().mockResolvedValue(Success(null)),
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: vi.fn().mockResolvedValue(null),
      getTradeByCode: vi.fn().mockResolvedValue(null),
      getTradeById: vi.fn().mockResolvedValue(null),
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: vi.fn().mockResolvedValue(null),
    };

    const service = new TreEngineService({
      programKerjaBoundaryService: mockPkBoundary,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock: mockClock,
      logger: mockLogger,
    });

    const result = await service.resolveTradeRecommendation(sampleContext);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(NoTradeRecommendationFoundError);
    }
  });
});
