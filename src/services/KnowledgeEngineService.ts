import { Result, Success, Failure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { IClock } from '@/lib/IClock';
import {
  KnowledgeRecommendation,
  KnowledgeEvaluationContext,
  MatchedRuleDetail,
  KnowledgeEvaluationDiagnostics,
} from '@/types/knowledge';
import { KnowledgeEngineError } from '@/errors/knowledgeErrors';
import { IKnowledgeRuleRepository } from '@/repositories/IKnowledgeRuleRepository';
import { IRuleEvaluatorRegistry } from '@/services/evaluators/IRuleEvaluatorRegistry';
import { IKnowledgeEngineService } from './IKnowledgeEngineService';

export interface IKnowledgeEngineServiceDependencies {
  readonly ruleRepository: IKnowledgeRuleRepository;
  readonly evaluatorRegistry: IRuleEvaluatorRegistry;
  readonly clock: IClock;
  readonly logger: Logger;
}

/**
 * Knowledge Recommendation Engine (KRE) Service
 *
 * Enforces:
 * - Targeted Candidate Retrieval (via IKnowledgeRuleRepository.findCandidateRules)
 * - Priority -> Specificity -> Version -> RuleId Precedence Order
 * - 100% Deterministic Rule Execution
 * - Zero Caching, Zero Persistence, Zero Transactions, Zero Domain Events
 * - Explainable Recommendation Result with Diagnostic Logging
 */
export class KnowledgeEngineService implements IKnowledgeEngineService {
  private readonly ruleRepo: IKnowledgeRuleRepository;
  private readonly registry: IRuleEvaluatorRegistry;
  private readonly clock: IClock;
  private readonly logger: Logger;

  constructor(deps: IKnowledgeEngineServiceDependencies) {
    this.ruleRepo = deps.ruleRepository;
    this.registry = deps.evaluatorRegistry;
    this.clock = deps.clock;
    this.logger = deps.logger;
  }

  public async evaluate(
    ctx: KnowledgeEvaluationContext
  ): Promise<Result<KnowledgeRecommendation | null, BaseAppError>> {
    const startTime = Date.now();

    try {
      this.logger.info('Evaluating Knowledge Recommendation Engine rules', {
        siteDiaryId: ctx.siteDiaryId,
        programmeId: ctx.programmeId,
        activityName: ctx.activityName,
        timestamp: this.clock.nowIso(),
      });

      // 1. Candidate Rule Retrieval (Targeted DB / Cache-less query)
      const candidateRules = await this.ruleRepo.findCandidateRules(ctx);
      const evaluators = this.registry.getAllEvaluators();

      const matchedRules: MatchedRuleDetail[] = [];
      let rulesEvaluatedCount = 0;

      // 2. Pluggable Evaluator Pipeline Execution
      for (const rule of candidateRules) {
        rulesEvaluatedCount += 1;
        for (const evaluator of evaluators) {
          if (evaluator.category === rule.category) {
            const match = evaluator.evaluate(rule, ctx);
            if (match) {
              matchedRules.push(match);
              break; // Matched rule for category
            }
          }
        }
      }

      // 3. Precedence Sorting: Priority -> Specificity -> Version -> RuleId
      matchedRules.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (b.specificityScore !== a.specificityScore) return b.specificityScore - a.specificityScore;
        if (b.version !== a.version) return b.version - a.version;
        return a.ruleId.localeCompare(b.ruleId);
      });

      const durationMs = Date.now() - startTime;
      const topMatch = matchedRules.length > 0 ? matchedRules[0] : null;

      // 4. Record Internal Observability Diagnostics
      const diagnostics: KnowledgeEvaluationDiagnostics = {
        rulesLoaded: candidateRules.length,
        rulesEvaluated: rulesEvaluatedCount,
        rulesMatched: matchedRules.length,
        selectedRuleId: topMatch ? topMatch.ruleId : null,
        selectedRuleVersion: topMatch ? topMatch.version : null,
        executionDurationMs: durationMs,
      };

      this.logger.info('KRE evaluation completed', { diagnostics });

      if (!topMatch) {
        return Success(null);
      }

      // 5. Construct Explainable Knowledge Recommendation Result
      const recommendation: KnowledgeRecommendation = {
        recommendedTradeId: topMatch.ruleId,
        tradeCode: topMatch.recommendedTradeCode,
        tradeName: topMatch.recommendedTradeCode,
        tradeCategory: null,
        reasonCode: topMatch.reasonCode,
        reasonDescription: topMatch.reasonDescription,
        matchedRules: matchedRules,
        source: 'KNOWLEDGE_ENGINE',
      };

      return Success(recommendation);
    } catch (err: unknown) {
      this.logger.error('Unhandled exception during Knowledge Engine evaluation', { error: err });
      if (err instanceof BaseAppError) {
        return Failure(err);
      }
      return Failure(
        new KnowledgeEngineError(
          err instanceof Error ? err.message : 'Knowledge evaluation failed',
          { cause: err }
        )
      );
    }
  }
}
