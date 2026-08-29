import { KnowledgeRule, KnowledgeEvaluationContext, MatchedRuleDetail } from '@/types/knowledge';
import { IRuleEvaluator } from './IRuleEvaluator';

export class DisciplineRuleEvaluator implements IRuleEvaluator {
  public readonly category = 'DISCIPLINE' as const;

  public evaluate(rule: KnowledgeRule, ctx: KnowledgeEvaluationContext): MatchedRuleDetail | null {
    if (rule.category !== 'DISCIPLINE') return null;

    const { discipline_code } = rule.conditions;
    if (discipline_code && typeof discipline_code === 'string') {
      if (ctx.disciplineCode && ctx.disciplineCode.toLowerCase() === discipline_code.toLowerCase()) {
        return {
          ruleId: rule.ruleId,
          ruleCode: rule.ruleCode,
          version: rule.version,
          priority: rule.priority,
          specificityScore: 1,
          reasonCode: rule.reasonCode,
          reasonDescription: rule.reasonDescription,
          recommendedTradeCode: rule.recommendedTradeCode,
        };
      }
    }

    return null;
  }
}
