import { KnowledgeRule, KnowledgeEvaluationContext, MatchedRuleDetail } from '@/types/knowledge';
import { IRuleEvaluator } from './IRuleEvaluator';

export class TaskRuleEvaluator implements IRuleEvaluator {
  public readonly category = 'TASK' as const;

  public evaluate(rule: KnowledgeRule, ctx: KnowledgeEvaluationContext): MatchedRuleDetail | null {
    if (rule.category !== 'TASK') return null;

    let specificity = 0;
    const { task_code, activity_keyword } = rule.conditions;

    if (task_code && typeof task_code === 'string') {
      if (ctx.mspTaskId && ctx.mspTaskId.toLowerCase() === task_code.toLowerCase()) {
        specificity += 1;
      } else {
        return null;
      }
    }

    if (activity_keyword && typeof activity_keyword === 'string') {
      if (ctx.activityName.toLowerCase().includes(activity_keyword.toLowerCase())) {
        specificity += 1;
      } else {
        return null;
      }
    }

    if (specificity === 0) {
      return null;
    }

    return {
      ruleId: rule.ruleId,
      ruleCode: rule.ruleCode,
      version: rule.version,
      priority: rule.priority,
      specificityScore: specificity,
      reasonCode: rule.reasonCode,
      reasonDescription: rule.reasonDescription,
      recommendedTradeCode: rule.recommendedTradeCode,
    };
  }
}
