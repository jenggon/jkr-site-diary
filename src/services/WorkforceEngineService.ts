import { Result, Success, Failure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { 
  WorkforceResolutionContext, 
  WorkforceResolution,
  WorkforceResolutionSource,
  WorkforceConfidenceLevel,
  WorkforceRecommendationProvenance,
  WorkforceResolutionObservabilityEvent
} from '@/types/wre';
import { IWorkforceEngineService } from './IWorkforceEngineService';
import { IMspWorkforceRepository } from '@/repositories/IMspWorkforceRepository';
import { ITradeWorkforceLibraryRepository } from '@/repositories/ITradeWorkforceLibraryRepository';
import { IWorkforceRuleRepository } from '@/repositories/IWorkforceRuleRepository';
import { IRuleEvaluatorRegistry } from '@/services/evaluators/IWorkforceEvaluatorRegistry';
import { IClock } from '@/lib/IClock';
import { Logger } from '@/lib/logger';
import { 
  NoWorkforceRecommendationFoundError, 
  InvalidWorkforceContextError, 
  WreEngineError 
} from '@/errors/wreErrors';

import { IProgramKerjaBoundaryService } from './IProgramKerjaBoundaryService';

export interface IWorkforceEngineServiceDependencies {
  readonly mspWorkforceRepository?: IMspWorkforceRepository | undefined;
  readonly programKerjaBoundaryService?: IProgramKerjaBoundaryService | undefined;
  readonly tradeWorkforceLibraryRepository: ITradeWorkforceLibraryRepository;
  readonly workforceRuleRepository: IWorkforceRuleRepository;
  readonly evaluatorRegistry: IRuleEvaluatorRegistry;
  readonly clock: IClock;
  readonly logger: Logger;
}

export class WorkforceEngineService implements IWorkforceEngineService {
  constructor(private readonly deps: IWorkforceEngineServiceDependencies) {}

  public async recommend(ctx: WorkforceResolutionContext): Promise<Result<WorkforceResolution, BaseAppError>> {
    return this.resolveWorkforceRecommendation(ctx);
  }

  public async resolveWorkforceRecommendation(
    ctx: WorkforceResolutionContext
  ): Promise<Result<WorkforceResolution, BaseAppError>> {
    const startTime = this.deps.clock.nowUtcDate().getTime();

    if (!ctx.tradeSelection) {
      return Failure(new InvalidWorkforceContextError('tradeSelection is required for workforce resolution'));
    }

    try {
      // Priority 1: Program Kerja / MSP Resource Assignment
      if (ctx.mspTaskId) {
        if (this.deps.programKerjaBoundaryService) {
          const pkWf = await this.deps.programKerjaBoundaryService.getProgramKerjaWorkforce(
            ctx.programmeId,
            ctx.revisionId ?? '',
            ctx.mspTaskId
          );
          if (pkWf && pkWf.length > 0) {
            const count = pkWf.reduce((sum, item) => sum + item.count, 0);
            return Success(this.buildResolution(ctx, 'MSP_RESOURCE', 'HIGH', {
              repository: 'ProgramKerjaBoundaryService',
              evaluator: null,
              ruleId: null,
              ruleVersion: null,
              matchedPriority: 'MSP_RESOURCE',
              matchedDiscipline: null
            }, startTime, [{ recommendedCount: count }], 'MSP_MATCH', 'Resolved from Program Kerja'));
          }
        } else if (this.deps.mspWorkforceRepository) {
          const mspData = await this.deps.mspWorkforceRepository.findWorkforceByMspTask(ctx.programmeId, ctx.mspTaskId);
          if (mspData && mspData.length > 0) {
            return Success(this.buildResolution(ctx, 'MSP_RESOURCE', 'HIGH', {
              repository: 'MspWorkforceRepository',
              evaluator: null,
              ruleId: null,
              ruleVersion: null,
              matchedPriority: 'MSP_RESOURCE',
              matchedDiscipline: null
            }, startTime, mspData, 'MSP_MATCH', 'Resolved from MSP resource assignment'));
          }
        }
      }

      // Priority 2: Trade Workforce Library
      const tradeData = await this.deps.tradeWorkforceLibraryRepository.getWorkforceCompositionByTrade(ctx.tradeSelection.tradeId);
      if (tradeData && tradeData.length > 0) {
        return Success(this.buildResolution(ctx, 'TRADE_WORKFORCE_LIBRARY', 'MEDIUM', {
            repository: 'TradeWorkforceLibraryRepository',
            evaluator: null,
            ruleId: null,
            ruleVersion: null,
            matchedPriority: 'TRADE_WORKFORCE_LIBRARY',
            matchedDiscipline: null
          }, startTime, tradeData, 'TRADE_LIB_MATCH', 'Resolved from Trade Workforce Library'));
      }

      // Priority 3: Knowledge Workforce Rules
      let evaluatorsAttemptedCount = 0;
      const evaluators = this.deps.evaluatorRegistry.getEvaluatorsForDiscipline(ctx.discipline);
      
      for (const evaluator of evaluators) {
        evaluatorsAttemptedCount++;
        const result = await evaluator.evaluate(ctx);
        if (result && result.items.length > 0) {
          return Success(this.buildResolution(ctx, 'KNOWLEDGE_WORKFORCE_RULE', 'LOW', {
            repository: 'WorkforceRuleRepository',
            evaluator: evaluator.constructor.name,
            ruleId: result.ruleId ?? null,
            ruleVersion: result.ruleVersion ?? null,
            matchedPriority: 'KNOWLEDGE_WORKFORCE_RULE',
            matchedDiscipline: evaluator.discipline
          }, startTime, result.items, result.reasonCode, result.reasonDescription, evaluatorsAttemptedCount));
        }
      }

      // Exhaustion
      const durationMs = this.deps.clock.nowUtcDate().getTime() - startTime;
      this.emitObservability(ctx, null, null, 'ALL_SOURCES_EXHAUSTED', durationMs, 0);
      return Failure(new NoWorkforceRecommendationFoundError());

    } catch (error) {
      const wrappedError = new WreEngineError('Workforce resolution failed due to internal error', { cause: error });
      this.deps.logger.error('WRE Engine Error', { error: wrappedError });
      return Failure(wrappedError);
    }
  }

  private buildResolution(
    ctx: WorkforceResolutionContext,
    source: WorkforceResolutionSource,
    confidence: WorkforceConfidenceLevel,
    provenance: WorkforceRecommendationProvenance,
    startTime: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawItems: readonly any[],
    reasonCode: string,
    reasonDescription: string,
    evaluatorsAttemptedCount: number = 0
  ): WorkforceResolution {
    const durationMs = this.deps.clock.nowUtcDate().getTime() - startTime;
    const generatedAt = this.deps.clock.nowIso();
    
    const items = rawItems.map(r => ({
      roleCode: r.roleCode,
      tradeId: r.tradeId || ctx.tradeSelection.tradeId,
      tradeCode: r.tradeCode || ctx.tradeSelection.tradeCode,
      tradeName: r.tradeName || ctx.tradeSelection.tradeName,
      recommendedCount: r.allocatedCount ?? r.baselineCount ?? r.recommendedCount,
      skillLevel: r.skillLevel || 'UNKNOWN',
      isMandatory: !!r.isMandatory
    }));

    const totalWorkforceCount = items.reduce((sum, item) => sum + item.recommendedCount, 0);

    const resolution: WorkforceResolution = {
      recommendation: {
        items,
        totalWorkforceCount
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
        reasonCode,
        reasonDescription
      },
      metadata: {
        engineVersion: '1.0.0',
        generatedAt,
        executionDurationMs: durationMs,
        platformVersion: '1.0.0'
      }
    };

    this.emitObservability(ctx, source, confidence, source, durationMs, totalWorkforceCount);

    return resolution;
  }

  private emitObservability(
    ctx: WorkforceResolutionContext,
    source: WorkforceResolutionSource | null,
    confidence: WorkforceConfidenceLevel | null,
    stage: 'MSP_RESOURCE' | 'TRADE_WORKFORCE_LIBRARY' | 'KNOWLEDGE_WORKFORCE_RULE' | 'ALL_SOURCES_EXHAUSTED',
    durationMs: number,
    workforceCount: number
  ): void {
    const event: WorkforceResolutionObservabilityEvent = {
      requestId: 'N/A', // Assuming standard request context injects this into logger or context
      activityId: ctx.siteDiaryId, 
      programmeId: ctx.programmeId,
      tradeId: ctx.tradeSelection.tradeId,
      resolutionSource: source,
      confidenceLevel: confidence,
      evaluationStage: stage,
      durationMs,
      workforceCount,
      timestamp: this.deps.clock.nowIso()
    };
    
    if (stage === 'ALL_SOURCES_EXHAUSTED') {
      this.deps.logger.warn('Workforce resolution exhausted', { event });
    } else {
      this.deps.logger.info('Workforce resolution successful', { event });
    }
  }
}
