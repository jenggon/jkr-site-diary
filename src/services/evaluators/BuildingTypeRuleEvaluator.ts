import { KnowledgeRule, KnowledgeEvaluationContext, MatchedRuleDetail } from '@/types/knowledge';
import { IRuleEvaluator } from './IRuleEvaluator';

export class BuildingTypeRuleEvaluator implements IRuleEvaluator {
  public readonly category = 'BUILDING' as const;

  public evaluate(rule: KnowledgeRule, ctx: KnowledgeEvaluationContext): MatchedRuleDetail | null {
    if (rule.category !== 'BUILDING') return null;

    const { building_type } = rule.conditions;
    if (building_type && typeof building_type === 'string') {
      if (ctx.buildingType && ctx.buildingType.toLowerCase() === building_type.toLowerCase()) {
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
