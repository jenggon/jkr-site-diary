import { describe, it, expect, beforeEach } from 'vitest';
import { WorkforceEngineService, IWorkforceEngineServiceDependencies } from '@/services/WorkforceEngineService';
import { WorkforceResolutionContext } from '@/types/wre';
import { IMspWorkforceRepository } from '@/repositories/IMspWorkforceRepository';
import { ITradeWorkforceLibraryRepository } from '@/repositories/ITradeWorkforceLibraryRepository';
import { IWorkforceRuleRepository } from '@/repositories/IWorkforceRuleRepository';
import { IRuleEvaluatorRegistry } from '@/services/evaluators/IWorkforceEvaluatorRegistry';
import { TradeResolutionSource } from '@/types/tre';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { isSuccess, isFailure } from '@/lib/result';
import { NoWorkforceRecommendationFoundError, InvalidWorkforceContextError } from '@/errors/wreErrors';

describe('WorkforceEngineService', () => {
  let mockMspRepo: IMspWorkforceRepository;
  let mockTradeLibRepo: ITradeWorkforceLibraryRepository;
  let mockRuleRepo: IWorkforceRuleRepository;
  let mockRegistry: IRuleEvaluatorRegistry;
  let mockClock: IClock;
  let mockLogger: Logger;
  let service: WorkforceEngineService;
  let mockCtx: WorkforceResolutionContext;

  beforeEach(() => {
    mockMspRepo = {
      findWorkforceByMspTask: async () => null,
    };
    mockTradeLibRepo = {
      getWorkforceCompositionByTrade: async () => null,
    };
    mockRuleRepo = {
      getRulesByDiscipline: async () => [],
    };
    mockRegistry = {
      getEvaluatorsForDiscipline: () => [],
      register: () => {},
    };
    mockClock = {
      nowIso: () => '2026-08-08T12:00:00Z',
      nowUtcDate: () => new Date('2026-08-08T12:00:00Z'),
    };
    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      child: () => mockLogger,
      fatal: () => {},
    } as unknown as Logger;

    const deps: IWorkforceEngineServiceDependencies = {
      mspWorkforceRepository: mockMspRepo,
      tradeWorkforceLibraryRepository: mockTradeLibRepo,
      workforceRuleRepository: mockRuleRepo,
      evaluatorRegistry: mockRegistry,
      clock: mockClock,
      logger: mockLogger,
    };

    service = new WorkforceEngineService(deps);

    mockCtx = {
      siteDiaryId: 'sd-1',
      programmeId: 'prog-1',
      activityName: 'Test Activity',
      tradeSelection: {
        tradeId: 't-1',
        tradeCode: 'T1',
        tradeName: 'Trade 1',
        tradeCategory: null,
        resolutionSource: 'TRADE_LIBRARY' as TradeResolutionSource,
      },
    };
  });

  it('fails if tradeSelection is missing', async () => {
    const invalidCtx = { ...mockCtx, tradeSelection: undefined as unknown as WorkforceResolutionContext['tradeSelection'] };
    const result = await service.resolveWorkforceRecommendation(invalidCtx);
    
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(InvalidWorkforceContextError);
    }
  });

  it('resolves via Priority 1 (MSP) if mspTaskId is present and data found', async () => {
    mockCtx = { ...mockCtx, mspTaskId: 'msp-1' };
    mockMspRepo.findWorkforceByMspTask = async () => [{
      roleCode: 'SUPERVISOR',
      allocatedCount: 2,
      tradeId: 't-1',
      tradeCode: 'T1',
      tradeName: 'Trade 1',
      skillLevel: 'SKILLED',
      isMandatory: true,
    }];

    const result = await service.resolveWorkforceRecommendation(mockCtx);
    
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('MSP_RESOURCE');
      expect(result.value.confidenceLevel).toBe('HIGH');
      expect(result.value.recommendation.totalWorkforceCount).toBe(2);
      expect(result.value.provenance.matchedPriority).toBe('MSP_RESOURCE');
    }
  });

  it('falls back to Priority 2 (Trade Library) if MSP misses', async () => {
    mockCtx = { ...mockCtx, mspTaskId: 'msp-1' };
    mockMspRepo.findWorkforceByMspTask = async () => null; // miss
    mockTradeLibRepo.getWorkforceCompositionByTrade = async () => [{
      roleCode: 'GENERAL',
      baselineCount: 5,
      tradeId: 't-1',
      tradeCode: 'T1',
      tradeName: 'Trade 1',
      skillLevel: 'SEMI_SKILLED',
      isMandatory: false,
    }];

    const result = await service.resolveWorkforceRecommendation(mockCtx);
    
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('TRADE_WORKFORCE_LIBRARY');
      expect(result.value.confidenceLevel).toBe('MEDIUM');
      expect(result.value.recommendation.totalWorkforceCount).toBe(5);
    }
  });

  it('falls back to Priority 3 (Rules) if Priorities 1 and 2 miss', async () => {
    const mockEvaluator = {
      discipline: 'Civil' as const,
      evaluate: async () => ({
        items: [{ 
          roleCode: 'SKILLED', 
          recommendedCount: 3,
          tradeId: 't-1',
          tradeCode: 'T1',
          tradeName: 'Trade 1',
          skillLevel: 'SKILLED',
          isMandatory: false
        }],
        reasonCode: 'RULE_MATCH',
        reasonDescription: 'Rule hit',
      })
    };
    mockRegistry.getEvaluatorsForDiscipline = () => [mockEvaluator];

    const result = await service.resolveWorkforceRecommendation(mockCtx);
    
    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('KNOWLEDGE_WORKFORCE_RULE');
      expect(result.value.confidenceLevel).toBe('LOW');
      expect(result.value.recommendation.totalWorkforceCount).toBe(3);
    }
  });

  it('returns NoWorkforceRecommendationFoundError when all priorities exhausted', async () => {
    const result = await service.resolveWorkforceRecommendation(mockCtx);
    
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(NoWorkforceRecommendationFoundError);
    }
  });
});
