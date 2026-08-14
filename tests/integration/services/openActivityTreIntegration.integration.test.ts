import { describe, it, expect } from 'vitest';
import { TreEngineService } from '@/services/TreEngineService';
import { ProgramKerjaBoundaryService, ProgramKerjaBoundaryServiceDependencies } from '@/services/ProgramKerjaBoundaryService';
import { ITradeLibraryRepository } from '@/repositories/ITradeLibraryRepository';
import { IKnowledgeEngineAdapter } from '@/services/adapters/IKnowledgeEngineAdapter';
import { SystemClock } from '@/lib/clock';
import { isSuccess } from '@/lib/result';
import { TradeLibrary } from '@/types/tradeLibrary';
import { LazyPlatformServiceContainer } from '@/app/api/_shared/container';
import { Logger } from '@/lib/logger';

describe('TreEngineService Integration', () => {
  const clock = new SystemClock();
  
  const silentLogger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    child: () => silentLogger,
  } as unknown as Logger;

  const sampleDefaultTrade: TradeLibrary = {
    trade_id: 'trade-lib-1',
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

  it('integration: TreEngineService resolves Priority 1 (MSP / ProgramKerja)', async () => {
    const mockBoundaryService = new ProgramKerjaBoundaryService({
      taskRepository: {
        getTaskById: async () => ({
          task_id: 'task-10',
          programme_id: 'prog-integ',
          revision_id: 'rev-integ',
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
      } as unknown as ProgramKerjaBoundaryServiceDependencies['taskRepository'],
    });

    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: async () => null,
      getTradeByCode: async () => null,
      getTradeById: async () => null,
    };
    
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendations: async () => [],
    };

    const treEngine = new TreEngineService({
      programKerjaBoundaryService: mockBoundaryService,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock,
      logger: silentLogger,
    });

    const result = await treEngine.resolveTradeRecommendation({
      siteDiaryId: 'diary-integ',
      programmeId: 'prog-integ',
      revisionId: 'rev-integ',
      mspTaskId: 'msp-task-1',
      activityName: 'Kerja Konkrit Utama',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeCode).toBe('CONCRETOR');
      expect(result.value.resolutionSource).toBe('MSP_RESOURCE');
    }
  });

  it('integration: TreEngineService falls back to Trade Library when ProgramKerja and KRE miss', async () => {
    const mockBoundaryService = new ProgramKerjaBoundaryService({
      taskRepository: { getTaskById: async () => null } as unknown as ProgramKerjaBoundaryServiceDependencies['taskRepository'],
    });

    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: async () => sampleDefaultTrade,
      getTradeByCode: async () => null,
      getTradeById: async () => null,
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendations: async () => [],
    };

    const treEngine = new TreEngineService({
      programKerjaBoundaryService: mockBoundaryService,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock,
      logger: silentLogger,
    });

    const result = await treEngine.resolveTradeRecommendation({
      siteDiaryId: 'diary-integ',
      programmeId: 'prog-integ',
      revisionId: 'rev-integ',
      activityName: 'Kerja Am Tapak',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeCode).toBe('GENERAL_WORKER');
      expect(result.value.resolutionSource).toBe('TRADE_LIBRARY');
    }
  });

  it('integration: TreEngineService returns FAILURE when all sources exhausted (this relies on system invariants to allow empty trade)', async () => {
    const mockBoundaryService = new ProgramKerjaBoundaryService({
      taskRepository: { getTaskById: async () => null } as unknown as ProgramKerjaBoundaryServiceDependencies['taskRepository'],
    });

    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: async () => null,
      getTradeByCode: async () => null,
      getTradeById: async () => null,
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendations: async () => [],
    };

    const treEngine = new TreEngineService({
      programKerjaBoundaryService: mockBoundaryService,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock,
      logger: silentLogger,
    });

    const result = await treEngine.resolveTradeRecommendation({
      siteDiaryId: 'diary-integ',
      programmeId: 'prog-integ',
      revisionId: 'rev-integ',
      activityName: 'Kerja Tiada Trade',
    });

    // When TRE cannot resolve a trade, it returns Failure. The caller (e.g. ActivityService, SiteDiary service) 
    // will decide what to do (e.g., skip applying trade, or proceed without it).
    expect(isSuccess(result)).toBe(false);
  });

  it('integration: shared TRE instance identity', () => {
    const container = new LazyPlatformServiceContainer();

    const treRef1 = container.treEngine();
    container.openActivity();
    const treRef2 = container.treEngine();

    expect(treRef1).toBe(treRef2);
  });
});
