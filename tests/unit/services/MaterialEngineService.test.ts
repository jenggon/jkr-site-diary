import { describe, it, expect, vi } from 'vitest';
import { MaterialEngineService } from '@/services/MaterialEngineService';
import { IProgramKerjaBoundaryService } from '@/services/IProgramKerjaBoundaryService';
import { ITradeMaterialLibraryRepository } from '@/repositories/ITradeMaterialLibraryRepository';
import { MaterialRuleEvaluatorRegistry } from '@/services/evaluators/MaterialRuleEvaluatorRegistry';
import { IMaterialRuleEvaluator } from '@/services/evaluators/MaterialRuleEvaluatorRegistry';
import { SystemClock } from '@/lib/clock';
import { Logger } from '@/lib/logger';
import { MaterialResolutionContext, MaterialItemRecommendation } from '@/types/mre';
import { ProgramKerjaMaterialDTO } from '@/dto/programKerjaDto';
import { isSuccess, isFailure, Success } from '@/lib/result';

describe('MaterialEngineService', () => {
  const mockClock = new SystemClock();
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger;

  const mockItem: MaterialItemRecommendation = {
    materialCode: 'M1',
    materialName: 'Test Material',
    materialRole: 'Base',
    recommendedQuantity: 10,
    unitOfMeasure: 'kg',
    isMandatory: true,
    estimatedWastePercentage: null,
    estimatedCost: 100,
    estimatedLeadTime: 2,
    constraints: [],
    substitutions: [{ materialCode: 'M1', replacementMaterialCode: 'M2', reasonCode: 'R', priority: 1 }]
  };

  const mockPkItem: ProgramKerjaMaterialDTO = {
    materialCode: 'M1',
    materialName: 'Test Material',
    materialRole: 'Base',
    recommendedQuantity: 10,
    unitOfMeasure: 'kg',
    isMandatory: true,
    estimatedWastePercentage: null,
    estimatedCost: 100,
    estimatedLeadTime: 2,
  };

  const createCtx = (policyOverrides = {}): MaterialResolutionContext => ({
    siteDiaryId: 'd1',
    programmeId: 'p1',
    revisionId: 'rev-approved-1',
    activityName: 'a1',
    tradeSelection: { tradeId: 't1', tradeCode: 't1', tradeName: 't1', source: 'MSPResource' },
    policy: {
      allowSubstitution: true,
      allowPartialRecommendation: true,
      includeOptionalMaterials: true,
      respectRegionalRestriction: true,
      respectSupplierRestriction: true,
      ...policyOverrides
    }
  });

  it('resolves via Priority 1: Program Kerja Boundary Material', async () => {
    const pkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: async () => Success(null),
      getProgramKerjaWorkforce: async () => Success(null),
      getProgramKerjaMaterials: async () => Success([mockPkItem]),
    };
    const tradeRepo: ITradeMaterialLibraryRepository = { getMaterialCompositionByTrade: async () => null };
    const registry = new MaterialRuleEvaluatorRegistry();

    const service = new MaterialEngineService({
      programKerjaBoundaryService: pkBoundary,
      tradeMaterialLibraryRepository: tradeRepo,
      evaluatorRegistry: registry,
      clock: mockClock,
      logger: mockLogger
    });

    const ctx = createCtx();
    const result = await service.resolveMaterialRecommendation({ ...ctx, mspTaskId: 'task1' });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('MSP_MATERIAL');
      expect(result.value.confidenceLevel).toBe('HIGH');
      expect(result.value.recommendation.items.length).toBe(1);
      expect(result.value.recommendation.totalEstimatedCost).toBe(100);
      expect(result.value.recommendation.maxLeadTime).toBe(2);
    }
  });

  it('filters substitutions and optional materials based on policy', async () => {
    const pkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: async () => Success(null),
      getProgramKerjaWorkforce: async () => Success(null),
      getProgramKerjaMaterials: async () => Success([mockPkItem, { ...mockPkItem, isMandatory: false }]),
    };
    const tradeRepo: ITradeMaterialLibraryRepository = { getMaterialCompositionByTrade: async () => null };
    const registry = new MaterialRuleEvaluatorRegistry();

    const service = new MaterialEngineService({
      programKerjaBoundaryService: pkBoundary,
      tradeMaterialLibraryRepository: tradeRepo,
      evaluatorRegistry: registry,
      clock: mockClock,
      logger: mockLogger
    });

    const ctx = createCtx({ allowSubstitution: false, includeOptionalMaterials: false });
    const result = await service.resolveMaterialRecommendation({ ...ctx, mspTaskId: 'task1' });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.recommendation.items.length).toBe(1); // Optional removed
      expect(result.value.recommendation.items[0]?.substitutions.length).toBe(0); // Substitutions removed
    }
  });

  it('resolves via Priority 2: Trade Library', async () => {
    const pkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: async () => Success(null),
      getProgramKerjaWorkforce: async () => Success(null),
      getProgramKerjaMaterials: async () => Success(null),
    };
    const tradeRepo: ITradeMaterialLibraryRepository = { getMaterialCompositionByTrade: async () => [mockItem] };
    const registry = new MaterialRuleEvaluatorRegistry();

    const service = new MaterialEngineService({
      programKerjaBoundaryService: pkBoundary,
      tradeMaterialLibraryRepository: tradeRepo,
      evaluatorRegistry: registry,
      clock: mockClock,
      logger: mockLogger
    });

    const ctx = createCtx();
    const result = await service.resolveMaterialRecommendation(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('TRADE_MATERIAL_LIBRARY');
      expect(result.value.confidenceLevel).toBe('MEDIUM');
    }
  });

  it('resolves via Priority 3: Rules', async () => {
    const pkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: async () => Success(null),
      getProgramKerjaWorkforce: async () => Success(null),
      getProgramKerjaMaterials: async () => Success(null),
    };
    const tradeRepo: ITradeMaterialLibraryRepository = { getMaterialCompositionByTrade: async () => null };
    const registry = new MaterialRuleEvaluatorRegistry();
    registry.register({
      discipline: 'ALL',
      evaluate: async () => ({
        items: [mockItem],
        ruleId: 'r1',
        ruleVersion: 1,
        reasonCode: 'R1',
        reasonDescription: 'R1Desc'
      })
    } as IMaterialRuleEvaluator);

    const service = new MaterialEngineService({
      programKerjaBoundaryService: pkBoundary,
      tradeMaterialLibraryRepository: tradeRepo,
      evaluatorRegistry: registry,
      clock: mockClock,
      logger: mockLogger
    });

    const ctx = createCtx();
    const result = await service.resolveMaterialRecommendation(ctx);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.resolutionSource).toBe('KNOWLEDGE_MATERIAL_RULE');
      expect(result.value.confidenceLevel).toBe('LOW');
    }
  });

  it('returns soft failure on exhaustion', async () => {
    const pkBoundary: IProgramKerjaBoundaryService = {
      getProgramKerjaTrade: async () => Success(null),
      getProgramKerjaWorkforce: async () => Success(null),
      getProgramKerjaMaterials: async () => Success(null),
    };
    const tradeRepo: ITradeMaterialLibraryRepository = { getMaterialCompositionByTrade: async () => null };
    const registry = new MaterialRuleEvaluatorRegistry();

    const service = new MaterialEngineService({
      programKerjaBoundaryService: pkBoundary,
      tradeMaterialLibraryRepository: tradeRepo,
      evaluatorRegistry: registry,
      clock: mockClock,
      logger: mockLogger
    });

    const ctx = createCtx();
    const result = await service.resolveMaterialRecommendation(ctx);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('NO_MATERIAL_RECOMMENDATION_FOUND');
    }
  });
});
