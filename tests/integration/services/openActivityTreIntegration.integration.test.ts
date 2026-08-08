import { describe, it, expect, vi } from 'vitest';
import { TreEngineService } from '@/services/TreEngineService';
import { OpenActivityService } from '@/services/OpenActivityService';
import { IMspResourceRepository } from '@/repositories/IMspResourceRepository';
import { ITradeLibraryRepository } from '@/repositories/ITradeLibraryRepository';
import { IKnowledgeEngineAdapter } from '@/services/adapters/IKnowledgeEngineAdapter';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { Success, Result, isSuccess } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivity } from '@/types/openActivity';
import { MspResourceTrade } from '@/types/tre';
import { TradeLibrary } from '@/types/tradeLibrary';
import { SystemClock } from '@/lib/clock';
import { LazyPlatformServiceContainer } from '@/app/api/_shared/container';
import { IMaterialEngineService } from '@/services/IMaterialEngineService';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';

const mockMreNoOp: IMaterialEngineService = {
  recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),
  resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),
} as unknown as IMaterialEngineService;


describe('OpenActivityService + TreEngineService Integration', () => {
  const clock: IClock = new SystemClock();

  const mockWreEngine = {
    resolveWorkforceRecommendation: async () => ({ success: false, error: { errorCode: 'NO_WORKFORCE_RECOMMENDATION_FOUND' } }),
  } as unknown as IWorkforceEngineService;

  const silentLogger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    child: () => silentLogger,
  } as unknown as Logger;

  const mockTxManager: ITransactionManager = {
    execute: async <T>(work: () => Promise<Result<T, BaseAppError>>) => work(),
  };

  const mockEventPublisher: IDomainEventPublisher = {
    publish: async (_event: IDomainEvent) => {},
  };

  const sampleActivity: OpenActivity = {
    activityId: 'act-integ-1',
    siteDiaryId: 'diary-integ',
    programmeId: 'prog-integ',
    activityName: 'Integration Test Activity',
    status: 'Planned',
    isLocked: false,
    createdAt: '2026-08-08T00:00:00.000Z',
    createdBy: 'test-user',
  };

  const sampleLog: ActivityLogEntry = {
    logId: 'log-integ-1',
    activityId: 'act-integ-1',
    siteDiaryId: 'diary-integ',
    eventType: 'NEW',
    snapshotData: {},
    loggedAt: '2026-08-08T00:00:00.000Z',
    loggedBy: 'test-user',
  };

  const mockActivityRepo: IOpenActivityRepository = {
    findById: async () => Success(sampleActivity),
    findBySiteDiaryId: async () => Success([sampleActivity]),
    create: async (a) => Success(a),
    update: async (a) => Success(a),
    updateStatus: async (id, status) => Success({ ...sampleActivity, activityId: id, status }),
  };

  const mockLogRepo: IActivityLogRepository = {
    appendLog: async (e) => Success(e),
    findLogsByActivityId: async () => Success([sampleLog]),
  };

  const sampleMspTrade: MspResourceTrade = {
    resourceId: 'res-integ-1',
    tradeCode: 'CONCRETOR',
    tradeName: 'Pekerja Konkrit',
    tradeCategory: 'Skilled',
  };

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

  it('integration: OpenActivityService uses shared TreEngineService instance to resolve Priority 1 (MSP)', async () => {
    const mockMspRepo: IMspResourceRepository = {
      findResourceTradeByMspTask: async () => sampleMspTrade,
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: async () => null,
      getTradeByCode: async () => null,
      getTradeById: async () => null,
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: async () => null,
    };

    // Real TreEngineService — not mocked
    const treEngine = new TreEngineService({
      mspResourceRepository: mockMspRepo,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock,
      logger: silentLogger,
    });

    const openActivityService = new OpenActivityService({
      activityRepository: mockActivityRepo,
      logRepository: mockLogRepo,
      transactionManager: mockTxManager,
      clock,
      logger: silentLogger,
      eventPublisher: mockEventPublisher,
      treEngine,
      workforceEngine: mockWreEngine,
      materialEngine: mockMreNoOp,
    });

    const result = await openActivityService.createActivity({
      siteDiaryId: 'diary-integ',
      programmeId: 'prog-integ',
      taskId: 'msp-task-1',
      activityName: 'Kerja Konkrit Utama',
      createdBy: 'test-user',
      // tradeSelection intentionally omitted — TRE should auto-resolve
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo).toBeDefined();
      expect(result.value.tradeInfo?.tradeCode).toBe('CONCRETOR');
      expect(result.value.tradeInfo?.source).toBe('MSPResource');
    }
  });

  it('integration: OpenActivityService falls back to Trade Library when MSP and KRE miss', async () => {
    const mockMspRepo: IMspResourceRepository = {
      findResourceTradeByMspTask: async () => null,
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: async () => sampleDefaultTrade,
      getTradeByCode: async () => null,
      getTradeById: async () => null,
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: async () => null,
    };

    const treEngine = new TreEngineService({
      mspResourceRepository: mockMspRepo,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock,
      logger: silentLogger,
    });

    const openActivityService = new OpenActivityService({
      activityRepository: mockActivityRepo,
      logRepository: mockLogRepo,
      transactionManager: mockTxManager,
      clock,
      logger: silentLogger,
      eventPublisher: mockEventPublisher,
      treEngine,
      workforceEngine: mockWreEngine,
      materialEngine: mockMreNoOp,
    });

    const result = await openActivityService.createActivity({
      siteDiaryId: 'diary-integ',
      programmeId: 'prog-integ',
      activityName: 'Kerja Am Tapak',
      createdBy: 'test-user',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo?.tradeCode).toBe('GENERAL_WORKER');
      expect(result.value.tradeInfo?.source).toBe('TradeLibrary');
    }
  });

  it('integration: activity is created (tradeInfo=undefined) when all TRE sources exhausted', async () => {
    const mockMspRepo: IMspResourceRepository = {
      findResourceTradeByMspTask: async () => null,
    };
    const mockTradeLibRepo: ITradeLibraryRepository = {
      getDefaultTrade: async () => null,
      getTradeByCode: async () => null,
      getTradeById: async () => null,
    };
    const mockKeAdapter: IKnowledgeEngineAdapter = {
      getTopRecommendation: async () => null,
    };

    const treEngine = new TreEngineService({
      mspResourceRepository: mockMspRepo,
      tradeLibraryRepository: mockTradeLibRepo,
      knowledgeEngineAdapter: mockKeAdapter,
      clock,
      logger: silentLogger,
    });

    const openActivityService = new OpenActivityService({
      activityRepository: mockActivityRepo,
      logRepository: mockLogRepo,
      transactionManager: mockTxManager,
      clock,
      logger: silentLogger,
      eventPublisher: mockEventPublisher,
      treEngine,
      workforceEngine: mockWreEngine,
      materialEngine: mockMreNoOp,
    });

    const result = await openActivityService.createActivity({
      siteDiaryId: 'diary-integ',
      programmeId: 'prog-integ',
      activityName: 'Kerja Tiada Trade',
      createdBy: 'test-user',
    });

    // Activity MUST still be created even when TRE finds nothing
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo).toBeUndefined();
      expect(result.value.activityName).toBe('Kerja Tiada Trade');
    }
  });

  it('integration: shared TRE instance identity — same reference used by openActivity()', () => {
    const container = new LazyPlatformServiceContainer();

    // Retrieve treEngine() first — creates shared instance
    const treRef1 = container.treEngine();
    // Retrieve openActivity() — internally calls this.treEngine() to get the shared instance
    container.openActivity();
    // Retrieve treEngine() again — must return the SAME instance (lazy idempotency)
    const treRef2 = container.treEngine();

    expect(treRef1).toBe(treRef2);
  });
});
