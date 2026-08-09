import { Result, Success, Failure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { 
  MaterialResolutionContext, 
  MaterialResolution,
  MaterialResolutionSource,
  MaterialConfidenceLevel,
  MaterialRecommendationProvenance,
  MaterialResolutionObservabilityEvent,
  MaterialItemRecommendation
} from '@/types/mre';
import { IMaterialEngineService } from './IMaterialEngineService';
import { IMspMaterialRepository } from '@/repositories/IMspMaterialRepository';
import { ITradeMaterialLibraryRepository } from '@/repositories/ITradeMaterialLibraryRepository';
import { IMaterialRuleEvaluatorRegistry } from '@/services/evaluators/MaterialRuleEvaluatorRegistry';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { 
  NoMaterialRecommendationFoundError, 
  InvalidMaterialContextError, 
  MreEngineError 
} from '@/errors/mreErrors';

import { IProgramKerjaBoundaryService } from './IProgramKerjaBoundaryService';

export interface IMaterialEngineServiceDependencies {
  readonly mspMaterialRepository?: IMspMaterialRepository | undefined;
  readonly programKerjaBoundaryService?: IProgramKerjaBoundaryService | undefined;
  readonly tradeMaterialLibraryRepository: ITradeMaterialLibraryRepository;
  readonly evaluatorRegistry: IMaterialRuleEvaluatorRegistry;
  readonly clock: IClock;
  readonly logger: Logger;
}

export class MaterialEngineService implements IMaterialEngineService {
  constructor(private readonly deps: IMaterialEngineServiceDependencies) {}

  public async recommend(ctx: MaterialResolutionContext): Promise<Result<MaterialResolution, BaseAppError>> {
    return this.resolveMaterialRecommendation(ctx);
  }

  public async resolveMaterialRecommendation(
    ctx: MaterialResolutionContext
  ): Promise<Result<MaterialResolution, BaseAppError>> {
    const startTime = this.deps.clock.nowUtcDate().getTime();

    if (!ctx.tradeSelection) {
      return Failure(new InvalidMaterialContextError('tradeSelection is required for material resolution'));
    }

    try {
      // Priority 1: Program Kerja / MSP Resource Assignment
      if (ctx.mspTaskId) {
        if (this.deps.programKerjaBoundaryService) {
          const pkMats = await this.deps.programKerjaBoundaryService.getProgramKerjaMaterials(ctx.programmeId, ctx.mspTaskId);
          if (pkMats && pkMats.length > 0) {
            const items: MaterialItemRecommendation[] = pkMats.map((m) => ({
              materialCode: m.materialCode,
              materialName: m.materialName,
              materialRole: 'MAIN',
              recommendedQuantity: m.quantity,
              unitOfMeasure: m.unit,
              isMandatory: true,
              estimatedWastePercentage: null,
              estimatedCost: m.estimatedCost ?? null,
              estimatedLeadTime: null,
              constraints: [],
              substitutions: [],
            }));
            return Success(this.buildResolution(ctx, 'MSP_MATERIAL', 'HIGH', {
              repository: 'ProgramKerjaBoundaryService',
              evaluator: null,
              ruleId: null,
              ruleVersion: null,
              matchedPriority: 'MSP_MATERIAL',
              matchedTrade: null,
              matchedDiscipline: null
            }, startTime, items, 'MSP_MATCH', 'Resolved from Program Kerja'));
          }
        } else if (this.deps.mspMaterialRepository) {
          const mspData = await this.deps.mspMaterialRepository.findMaterialsByMspTask(ctx.programmeId, ctx.mspTaskId);
          if (mspData && mspData.length > 0) {
            return Success(this.buildResolution(ctx, 'MSP_MATERIAL', 'HIGH', {
              repository: 'MspMaterialRepository',
              evaluator: null,
              ruleId: null,
              ruleVersion: null,
              matchedPriority: 'MSP_MATERIAL',
              matchedTrade: null,
              matchedDiscipline: null
            }, startTime, mspData as unknown as MaterialItemRecommendation[], 'MSP_MATCH', 'Resolved from MSP material assignment'));
          }
        }
      }

      // Priority 2: Trade Material Library
      const tradeData = await this.deps.tradeMaterialLibraryRepository.getMaterialCompositionByTrade(ctx.tradeSelection.tradeId);
      if (tradeData && tradeData.length > 0) {
        return Success(this.buildResolution(ctx, 'TRADE_MATERIAL_LIBRARY', 'MEDIUM', {
            repository: 'TradeMaterialLibraryRepository',
            evaluator: null,
            ruleId: null,
            ruleVersion: null,
            matchedPriority: 'TRADE_MATERIAL_LIBRARY',
            matchedTrade: ctx.tradeSelection.tradeCode,
            matchedDiscipline: null
          }, startTime, tradeData, 'TRADE_LIB_MATCH', 'Resolved from Trade Material Library'));
      }

      // Priority 3: Knowledge Material Rules
      let evaluatorsAttemptedCount = 0;
      const evaluators = this.deps.evaluatorRegistry.getEvaluatorsForDiscipline(ctx.discipline);
      
      for (const evaluator of evaluators) {
        evaluatorsAttemptedCount++;
        const result = await evaluator.evaluate(ctx);
        if (result && result.items.length > 0) {
          return Success(this.buildResolution(ctx, 'KNOWLEDGE_MATERIAL_RULE', 'LOW', {
            repository: 'MaterialRuleRepository',
            evaluator: evaluator.constructor.name,
            ruleId: result.ruleId ?? null,
            ruleVersion: result.ruleVersion ?? null,
            matchedPriority: 'KNOWLEDGE_MATERIAL_RULE',
            matchedTrade: null,
            matchedDiscipline: evaluator.discipline
          }, startTime, result.items, result.reasonCode, result.reasonDescription, evaluatorsAttemptedCount));
        }
      }

      // Exhaustion
      const durationMs = this.deps.clock.nowUtcDate().getTime() - startTime;
      this.emitObservability(ctx, null, null, 'ALL_SOURCES_EXHAUSTED', durationMs, 0, null);
      return Failure(new NoMaterialRecommendationFoundError());

    } catch (error) {
      const wrappedError = new MreEngineError('Material resolution failed due to internal error', { cause: error });
      this.deps.logger.error('MRE Engine Error', { error: wrappedError });
      return Failure(wrappedError);
    }
  }

  private buildResolution(
    ctx: MaterialResolutionContext,
    source: MaterialResolutionSource,
    confidence: MaterialConfidenceLevel,
    provenance: MaterialRecommendationProvenance,
    startTime: number,
    rawItems: readonly MaterialItemRecommendation[],
    overallReasonCode: string,
    overallReasonDescription: string,
    evaluatorsAttemptedCount: number = 0
  ): MaterialResolution {
    const durationMs = this.deps.clock.nowUtcDate().getTime() - startTime;
    const generatedAt = this.deps.clock.nowIso();
    
    // Apply policy filters
    let items = rawItems;
    if (!ctx.policy.includeOptionalMaterials) {
      items = items.filter(i => i.isMandatory);
    }

    if (!ctx.policy.allowSubstitution) {
      items = items.map(i => ({ ...i, substitutions: [] }));
    }

    // Cost and Lead time derived from repository items (which are passed through directly)
    let totalEstimatedCost: number | null = null;
    let maxLeadTime: number | null = null;

    let hasAnyCost = false;
    for (const item of items) {
      if (item.estimatedCost !== null) {
        hasAnyCost = true;
        totalEstimatedCost = (totalEstimatedCost || 0) + item.estimatedCost;
      }
      if (item.estimatedLeadTime !== null) {
        if (maxLeadTime === null || item.estimatedLeadTime > maxLeadTime) {
          maxLeadTime = item.estimatedLeadTime;
        }
      }
    }
    
    if (!hasAnyCost) {
      totalEstimatedCost = null;
    }

    const itemReasons = items.map(item => ({
      materialCode: item.materialCode,
      itemReasonCode: `${overallReasonCode}_ITEM`,
      itemReasonDescription: `Inherited from ${overallReasonDescription}`
    }));

    const resolution: MaterialResolution = {
      recommendation: {
        items,
        totalEstimatedCost,
        maxLeadTime
      },
      resolutionSource: source,
      confidenceLevel: confidence,
      provenance,
      diagnostics: {
        evaluationStage: source,
        durationMs,
        evaluatorsAttemptedCount,
        timestamp: generatedAt
      },
      reasoning: {
        overallReasonCode,
        overallReasonDescription,
        itemReasons
      },
      metadata: {
        engineVersion: '1.0.0',
        generatedAt,
        executionDurationMs: durationMs,
        platformVersion: '1.0.0'
      }
    };

    this.emitObservability(ctx, source, confidence, source, durationMs, items.length, totalEstimatedCost);

    return resolution;
  }

  private emitObservability(
    ctx: MaterialResolutionContext,
    source: MaterialResolutionSource | null,
    confidence: MaterialConfidenceLevel | null,
    stage: 'MSP_MATERIAL' | 'TRADE_MATERIAL_LIBRARY' | 'KNOWLEDGE_MATERIAL_RULE' | 'ALL_SOURCES_EXHAUSTED',
    durationMs: number,
    materialCount: number,
    estimatedCost: number | null
  ): void {
    const event: MaterialResolutionObservabilityEvent = {
      requestId: 'N/A', // Usually injected via AsyncLocalStorage or context
      activityId: ctx.siteDiaryId, 
      programmeId: ctx.programmeId,
      tradeId: ctx.tradeSelection.tradeId,
      resolutionSource: source,
      confidenceLevel: confidence,
      evaluationStage: stage,
      durationMs,
      materialCount,
      estimatedCost,
      timestamp: this.deps.clock.nowIso()
    };
    
    if (stage === 'ALL_SOURCES_EXHAUSTED') {
      this.deps.logger.warn('Material resolution exhausted', { event });
    } else {
      this.deps.logger.info('Material resolution successful', { event });
    }
  }
}
