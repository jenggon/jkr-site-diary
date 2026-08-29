import { KnowledgeRule, KnowledgeEvaluationContext } from '@/types/knowledge';

export interface IKnowledgeRuleRepository {
  /**
   * Narrows candidate rules using indexed context attributes.
   * Evaluates ONLY ACTIVE rules within effective date range.
   */
  findCandidateRules(ctx: KnowledgeEvaluationContext): Promise<KnowledgeRule[]>;
}
