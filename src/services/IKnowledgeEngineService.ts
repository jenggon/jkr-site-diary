import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { KnowledgeRecommendation, KnowledgeEvaluationContext } from '@/types/knowledge';

export interface IKnowledgeEngineService {
  /**
   * Evaluates candidate knowledge rules and returns an explainable recommendation.
   */
  evaluate(
    ctx: KnowledgeEvaluationContext
  ): Promise<Result<KnowledgeRecommendation | null, BaseAppError>>;
}
