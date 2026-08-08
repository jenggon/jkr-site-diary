import { describe, it, expect, vi } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ITransactionManager } from '@/transactions/ITransactionManager';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { IDomainEventPublisher, IDomainEvent } from '@/events/IDomainEventPublisher';
import { ITreEngineService } from '@/services/ITreEngineService';
import { Result, Success, Failure, isSuccess, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivity } from '@/types/openActivity';
import { TradeSelection as TreTradeSelection } from '@/types/tre';
import { NoTradeRecommendationFoundError, TreEngineError } from '@/errors/treErrors';

describe('OpenActivityService', () => {
  const mockClock: IClock = {
    nowIso: () => '2026-08-07T12:00:00.000Z',
    nowUtcDate: () => new Date('2026-08-07T12:00:00.000Z'),
  };

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => mockLogger,
  } as unknown as Logger;

  const mockTxManager: ITransactionManager = {
    execute: async <T>(work: () => Promise<Result<T, BaseAppError>>) => work(),
  };

  const mockEventPublisher: IDomainEventPublisher = {
    publish: vi.fn(async (_event: IDomainEvent) => {}),
  };

  const sampleActivity: OpenActivity = {
    activityId: 'act-1',
    siteDiaryId: 'diary-100',
    programmeId: 'prog-1',
    activityName: 'Konkrit Tapak Bangunan',
    workforceCount: 5,
    status: 'Planned',
    isLocked: false,
    createdAt: '2026-08-07T12:00:00.000Z',
    createdBy: 'user-supervisor',
  };

  const sampleLog: ActivityLogEntry = {
    logId: 'log-1',
    activityId: 'act-1',
    siteDiaryId: 'diary-100',
    eventType: 'NEW',
    snapshotData: { ...sampleActivity },
    loggedAt: '2026-08-07T12:00:00.000Z',
    loggedBy: 'user-supervisor',
  };

  const mockTreNoOp: ITreEngineService = {
    resolveTradeRecommendation: vi.fn().mockResolvedValue(Success({
      tradeId: 'trade-1',
      tradeCode: 'GENERAL_WORKER',
      tradeName: 'Buruh Am',
      tradeCategory: 'General',
      resolutionSource: 'TRADE_LIBRARY',
    } satisfies TreTradeSelection)),
  };

  function createService(overrides?: {
    activityRepo?: Partial<IOpenActivityRepository>;
    logRepo?: Partial<IActivityLogRepository>;
    txManager?: ITransactionManager;
    eventPublisher?: IDomainEventPublisher;
    treEngine?: ITreEngineService;
  }) {
    const activityRepo: IOpenActivityRepository = {
      findById: async () => Success(sampleActivity),
      findBySiteDiaryId: async () => Success([sampleActivity]),
      create: async (a) => Success(a),
      update: async (a) => Success(a),
      updateStatus: async (id, status) => Success({ ...sampleActivity, activityId: id, status }),
      ...overrides?.activityRepo,
    };

    const logRepo: IActivityLogRepository = {
      appendLog: async (e) => Success(e),
      findLogsByActivityId: async () => Success([sampleLog]),
      ...overrides?.logRepo,
    };

    return new OpenActivityService({
      activityRepository: activityRepo,
      logRepository: logRepo,
      transactionManager: overrides?.txManager ?? mockTxManager,
      clock: mockClock,
      logger: mockLogger,
      eventPublisher: overrides?.eventPublisher ?? mockEventPublisher,
      treEngine: overrides?.treEngine ?? mockTreNoOp,
    });
  }

  // -----------------------------------------------------------------------
  // Existing lifecycle tests
  // -----------------------------------------------------------------------

  it('should create an activity and append NEW log event in single transaction', async () => {
    const service = createService();
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja-kerja Memasang Tetulang',
      workforceCount: 4,
      createdBy: 'user-1',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.activityName).toBe('Kerja-kerja Memasang Tetulang');
      expect(result.value.status).toBe('Planned');
    }
  });

  it('should fail startActivity if manpower is not greater than zero', async () => {
    const service = createService({
      activityRepo: {
        findById: async () => Success({ ...sampleActivity, workforceCount: 0 }),
      },
    });

    const result = await service.startActivity('act-1', 'user-1');
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_VALIDATION_ERROR');
    }
  });

  it('should start activity successfully when manpower > 0', async () => {
    const service = createService();
    const result = await service.startActivity('act-1', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('InProgress');
    }
  });

  it('should fail suspendActivity if reason is empty', async () => {
    const service = createService();
    const result = await service.suspendActivity('act-1', '   ', 'user-1');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('ACTIVITY_VALIDATION_ERROR');
    }
  });

  it('should suspend activity successfully with valid reason', async () => {
    const service = createService();
    const result = await service.suspendActivity('act-1', 'Hujan Lebat di Tapak', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Suspended');
    }
  });

  it('should complete activity successfully from InProgress', async () => {
    const service = createService({
      activityRepo: {
        findById: async () => Success({ ...sampleActivity, status: 'InProgress' }),
      },
    });

    const result = await service.completeActivity('act-1', 'user-1');
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Completed');
    }
  });

  it('should cancel activity with mandatory reason', async () => {
    const service = createService();
    const result = await service.cancelActivity('act-1', 'Perubahan Reka Bentuk', 'user-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.status).toBe('Cancelled');
    }
  });

  // -----------------------------------------------------------------------
  // DEV-026: TRE Auto-Resolution Tests
  // -----------------------------------------------------------------------

  it('auto-resolves trade via TRE (MSP_RESOURCE) when no tradeSelection supplied', async () => {
    const msptrade: TreTradeSelection = {
      tradeId: 'msp-trade-1',
      tradeCode: 'CONCRETOR',
      tradeName: 'Pekerja Konkrit',
      tradeCategory: 'Skilled',
      resolutionSource: 'MSP_RESOURCE',
    };
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn().mockResolvedValue(Success(msptrade)),
    };

    const service = createService({ treEngine: mockTre });
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      taskId: 'task-50',
      activityName: 'Kerja Konkrit Asas',
      createdBy: 'user-1',
      // tradeSelection intentionally omitted
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo).toBeDefined();
      expect(result.value.tradeInfo?.tradeCode).toBe('CONCRETOR');
      expect(result.value.tradeInfo?.source).toBe('MSPResource');
    }
    expect(mockTre.resolveTradeRecommendation).toHaveBeenCalledOnce();
  });

  it('auto-resolves trade via TRE (KNOWLEDGE_ENGINE) when MSP misses', async () => {
    const kreTrade: TreTradeSelection = {
      tradeId: 'kre-trade-1',
      tradeCode: 'BAR_BENDER',
      tradeName: 'Pemasang Tetulang',
      tradeCategory: 'Skilled',
      resolutionSource: 'KNOWLEDGE_ENGINE',
    };
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn().mockResolvedValue(Success(kreTrade)),
    };

    const service = createService({ treEngine: mockTre });
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja Tetulang Lantai',
      createdBy: 'user-1',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo?.source).toBe('KnowledgeEngine');
      expect(result.value.tradeInfo?.tradeCode).toBe('BAR_BENDER');
    }
  });

  it('auto-resolves trade via TRE (TRADE_LIBRARY) as final fallback', async () => {
    const libTrade: TreTradeSelection = {
      tradeId: 'lib-trade-1',
      tradeCode: 'GENERAL_WORKER',
      tradeName: 'Buruh Am',
      tradeCategory: 'General',
      resolutionSource: 'TRADE_LIBRARY',
    };
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn().mockResolvedValue(Success(libTrade)),
    };

    const service = createService({ treEngine: mockTre });
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja Am',
      createdBy: 'user-1',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo?.source).toBe('TradeLibrary');
      expect(result.value.tradeInfo?.tradeCode).toBe('GENERAL_WORKER');
    }
  });

  it('creates activity without tradeInfo when TRE returns NoTradeRecommendationFoundError (soft failure)', async () => {
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn().mockResolvedValue(
        Failure(new NoTradeRecommendationFoundError())
      ),
    };
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: () => logger,
    } as unknown as Logger;

    const service = new OpenActivityService({
      activityRepository: {
        findById: async () => Success(sampleActivity),
        findBySiteDiaryId: async () => Success([sampleActivity]),
        create: async (a) => Success(a),
        update: async (a) => Success(a),
        updateStatus: async (id, status) => Success({ ...sampleActivity, activityId: id, status }),
      },
      logRepository: {
        appendLog: async (e) => Success(e),
        findLogsByActivityId: async () => Success([sampleLog]),
      },
      transactionManager: mockTxManager,
      clock: mockClock,
      logger,
      eventPublisher: mockEventPublisher,
      treEngine: mockTre,
    });

    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja Am',
      createdBy: 'user-1',
    });

    // Activity still created — TRE failure is non-fatal
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo).toBeUndefined();
    }
    // Structured observability event emitted at warn level
    expect(logger.warn).toHaveBeenCalledWith(
      'TRE resolution exhausted all sources — activity will be created without trade assignment',
      expect.objectContaining({
        treResolution: expect.objectContaining({
          resolutionOutcome: 'NOT_FOUND',
          failureCode: 'NO_TRADE_RECOMMENDATION_FOUND',
        }),
      })
    );
  });

  it('creates activity without tradeInfo when TRE returns TreEngineError (soft failure)', async () => {
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn().mockResolvedValue(
        Failure(new TreEngineError('Internal TRE crash'))
      ),
    };
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: () => logger,
    } as unknown as Logger;

    const service = new OpenActivityService({
      activityRepository: {
        findById: async () => Success(sampleActivity),
        findBySiteDiaryId: async () => Success([sampleActivity]),
        create: async (a) => Success(a),
        update: async (a) => Success(a),
        updateStatus: async (id, status) => Success({ ...sampleActivity, activityId: id, status }),
      },
      logRepository: {
        appendLog: async (e) => Success(e),
        findLogsByActivityId: async () => Success([sampleLog]),
      },
      transactionManager: mockTxManager,
      clock: mockClock,
      logger,
      eventPublisher: mockEventPublisher,
      treEngine: mockTre,
    });

    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja Am',
      createdBy: 'user-1',
    });

    // Activity still created — TRE failure is non-fatal
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo).toBeUndefined();
    }
    // Structured observability event emitted at error level
    expect(logger.error).toHaveBeenCalledWith(
      'TRE engine error — activity will be created without trade assignment',
      expect.objectContaining({
        treResolution: expect.objectContaining({
          resolutionOutcome: 'ENGINE_ERROR',
          failureCode: 'TRE_ENGINE_ERROR',
        }),
      })
    );
  });

  it('skips TRE entirely when caller supplies tradeSelection (bypass path)', async () => {
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn(),
    };

    const service = createService({ treEngine: mockTre });
    const result = await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      activityName: 'Kerja Konkrit Asas',
      createdBy: 'user-1',
      tradeSelection: {
        tradeId: 'caller-trade-1',
        tradeCode: 'MASON',
        tradeName: 'Tukang Batu',
        source: 'MSPResource',
      },
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.tradeInfo?.tradeCode).toBe('MASON');
      expect(result.value.tradeInfo?.source).toBe('MSPResource');
    }
    // TRE must NOT be called when caller supplies tradeSelection
    expect(mockTre.resolveTradeRecommendation).not.toHaveBeenCalled();
  });

  it('emits structured observability event on successful TRE resolution', async () => {
    const mspTrade: TreTradeSelection = {
      tradeId: 'msp-1',
      tradeCode: 'PLUMBER',
      tradeName: 'Tukang Paip',
      tradeCategory: 'Skilled',
      resolutionSource: 'MSP_RESOURCE',
    };
    const mockTre: ITreEngineService = {
      resolveTradeRecommendation: vi.fn().mockResolvedValue(Success(mspTrade)),
    };
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: () => logger,
    } as unknown as Logger;

    const service = new OpenActivityService({
      activityRepository: {
        findById: async () => Success(sampleActivity),
        findBySiteDiaryId: async () => Success([sampleActivity]),
        create: async (a) => Success(a),
        update: async (a) => Success(a),
        updateStatus: async (id, status) => Success({ ...sampleActivity, activityId: id, status }),
      },
      logRepository: {
        appendLog: async (e) => Success(e),
        findLogsByActivityId: async () => Success([sampleLog]),
      },
      transactionManager: mockTxManager,
      clock: mockClock,
      logger,
      eventPublisher: mockEventPublisher,
      treEngine: mockTre,
    });

    await service.createActivity({
      siteDiaryId: 'diary-100',
      programmeId: 'prog-1',
      taskId: 'task-88',
      activityName: 'Kerja Paip Utama',
      createdBy: 'user-1',
    });

    expect(logger.info).toHaveBeenCalledWith(
      'TRE resolution succeeded',
      expect.objectContaining({
        treResolution: expect.objectContaining({
          resolutionStage: 'MSP_RESOURCE',
          resolutionOutcome: 'RESOLVED',
          failureReason: null,
          failureCode: null,
          programmeId: 'prog-1',
          taskId: 'task-88',
        }),
      })
    );
  });
});
