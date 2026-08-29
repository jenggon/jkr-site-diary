import { KnowledgeRule, KnowledgeEvaluationContext, MatchedRuleDetail, RuleCategory } from '@/types/knowledge';

export interface IRuleEvaluator {
  readonly category: RuleCategory;
  evaluate(rule: KnowledgeRule, ctx: KnowledgeEvaluationContext): MatchedRuleDetail | null;
}
