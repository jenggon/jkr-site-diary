import { describe, it, expect, vi } from 'vitest';
import { OpenActivityService } from '@/services/OpenActivityService';
import { ITreEngineService } from '@/services/ITreEngineService';
import { IMaterialEngineService } from '@/services/IMaterialEngineService';
import { IWorkforceEngineService } from '@/services/IWorkforceEngineService';
import { IOpenActivityRepository } from '@/repositories/IOpenActivityRepository';
import { IActivityLogRepository, ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { DatabaseTransactionManager } from '@/transactions/DatabaseTransactionManager';

const mockMreNoOp: IMaterialEngineService = {
  recommend: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),
  resolveMaterialRecommendation: vi.fn().mockResolvedValue({ success: false, error: { errorCode: 'NO_MATERIAL_RECOMMENDATION_FOUND', message: 'Mock not found' } }),
} as unknown as IMaterialEngineService;

import { SystemClock } from '@/lib/clock';
import { logger } from '@/lib/logger';
import { NoopDomainEventPublisher } from '@/events/NoopDomainEventPublisher';
import { isSuccess, Success } from '@/lib/result';
import { OpenActivity } from '@/types/openActivity';

describe('openActivityWreIntegration', () => {
  it('orchestrates TRE followed by WRE sequentially during activity creation', async () => {
    const workforceEngine = {
      resolveWorkforceRecommendation: async () => ({
        success: true,
        value: {
          recommendation: { items: [], totalWorkforceCount: 42 },
          resolutionSource: 'TRADE_WORKFORCE_LIBRARY',
          confidenceLevel: 'HIGH',
          diagnostics: { evaluationStage: 'TRADE_WORKFORCE_LIBRARY' }
        }
      })
    } as unknown as IWorkforceEngineService;
    
    const mockActivityRepo: IOpenActivityRepository = {
      findById: async () => Success({} as OpenActivity),
      findBySiteDiaryId: async () => Success([]),
      create: async (a: OpenActivity) => Success(a),
      update: async (a: OpenActivity) => Success(a),
      updateStatus: async (_id: string, _status: import('@/types/openActivity').ActivityStatus) => Success({} as OpenActivity),
    };

    const mockLogRepo: IActivityLogRepository = {
      appendLog: async (e: ActivityLogEntry) => Success(e),
      findLogsByActivityId: async () => Success([]),
    };

    const txManager = new DatabaseTransactionManager();
    const clock = new SystemClock();
    const eventPublisher = new NoopDomainEventPublisher();

    const mockTreEngine = {
      resolveTradeRecommendation: async () => ({
        success: true,
        value: {
          tradeId: 'mock-trade-1',
          tradeCode: 'GENERAL_WORKER',
          tradeName: 'Buruh Am',
          tradeCategory: 'General',
          resolutionSource: 'TRADE_LIBRARY'
        }
      })
    } as unknown as ITreEngineService;

    const service = new OpenActivityService({
      activityRepository: mockActivityRepo,
      logRepository: mockLogRepo,
      transactionManager: txManager,
      clock,
      logger,
      eventPublisher,
      treEngine: mockTreEngine,
      workforceEngine,
      materialEngine: mockMreNoOp,
    });

    const result = await service.createActivity({
      siteDiaryId: 'diary-integration-1',
      programmeId: 'prog-1',
      activityName: 'Kerja-kerja Konkrit Asas',
      createdBy: 'test-user',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      const activity = result.value;
      expect(activity.tradeInfo).toBeDefined();
      expect(activity.workforceCount).toBeDefined();
    }
  });

  it('skips WRE if caller supplies workforceCount', async () => {
    const workforceEngine = {
      resolveWorkforceRecommendation: async () => ({})
    } as unknown as IWorkforceEngineService;
    
    const mockActivityRepo: IOpenActivityRepository = {
      findById: async () => Success({} as OpenActivity),
      findBySiteDiaryId: async () => Success([]),
      create: async (a: OpenActivity) => Success(a),
      update: async (a: OpenActivity) => Success(a),
      updateStatus: async (_id: string, _status: import('@/types/openActivity').ActivityStatus) => Success({} as OpenActivity),
    };
    const mockLogRepo: IActivityLogRepository = {
      appendLog: async (e: ActivityLogEntry) => Success(e),
      findLogsByActivityId: async () => Success([]),
    };

    const service = new OpenActivityService({
      activityRepository: mockActivityRepo,
      logRepository: mockLogRepo,
      transactionManager: new DatabaseTransactionManager(),
      clock: new SystemClock(),
      logger,
      eventPublisher: new NoopDomainEventPublisher(),
      treEngine: { resolveTradeRecommendation: async () => ({ success: true, value: { tradeId: 'x', tradeCode: 'x', tradeName: 'x', tradeCategory: 'x', resolutionSource: 'MSP_RESOURCE' } }) } as unknown as ITreEngineService,
      workforceEngine,
      materialEngine: mockMreNoOp,
    });

    const result = await service.createActivity({
      siteDiaryId: 'diary-integration-2',
      programmeId: 'prog-1',
      activityName: 'Kerja Am',
      workforceCount: 99,
      createdBy: 'test-user',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      const activity = result.value;
      expect(activity.workforceCount).toBe(99);
    }
  });
});
