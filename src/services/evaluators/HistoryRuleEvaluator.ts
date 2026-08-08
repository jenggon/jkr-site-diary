import { KnowledgeRule, KnowledgeEvaluationContext, MatchedRuleDetail } from '@/types/knowledge';
import { IRuleEvaluator } from './IRuleEvaluator';

export class HistoryRuleEvaluator implements IRuleEvaluator {
  public readonly category = 'HISTORY' as const;

  public evaluate(rule: KnowledgeRule, ctx: KnowledgeEvaluationContext): MatchedRuleDetail | null {
    if (rule.category !== 'HISTORY') return null;

    const { target_trade_code } = rule.conditions;
    if (target_trade_code && typeof target_trade_code === 'string') {
      if (ctx.historicalTradeCodes && ctx.historicalTradeCodes.includes(target_trade_code)) {
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
