import { isSuccess } from '@/lib/result';
import { KnowledgeRule, KnowledgeEvaluationContext } from '@/types/knowledge';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { IKnowledgeRuleRepository } from './IKnowledgeRuleRepository';

export interface KnowledgeRuleRow {
  readonly rule_id: string;
  readonly rule_code: string;
  readonly rule_name: string;
  readonly version: number;
  readonly priority: number;
  readonly category: string;
  readonly conditions: Record<string, unknown>;
  readonly recommended_trade_code: string;
  readonly reason_code: string;
  readonly reason_description: string;
  readonly effective_from: string;
  readonly effective_until?: string | null;
  readonly status: string;
  readonly owner: string;
  readonly created_by: string;
  readonly approved_by?: string | null;
  readonly last_reviewed_at?: string | null;
  readonly review_interval_days: number;
}

export class KnowledgeRuleRepository implements IKnowledgeRuleRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter()) {
    this.adapter = adapter;
  }

  public async findCandidateRules(ctx: KnowledgeEvaluationContext): Promise<KnowledgeRule[]> {
    const result = await this.adapter.selectMany<KnowledgeRuleRow>('knowledge_rules', {
      status: 'ACTIVE',
    });

    if (!isSuccess(result) || !result.value) {
      return [];
    }

    return result.value
      .map((row) => this.mapRowToDomain(row))
      .filter((rule) => this.isApplicableCandidate(rule, ctx));
  }

  private isApplicableCandidate(rule: KnowledgeRule, ctx: KnowledgeEvaluationContext): boolean {
    if (rule.status !== 'ACTIVE') return false;

    if (rule.category === 'TASK' && rule.conditions.task_code) {
      if (ctx.mspTaskId && rule.conditions.task_code !== ctx.mspTaskId) {
        return false;
      }
    }

    if (rule.category === 'BUILDING' && rule.conditions.building_type) {
      if (ctx.buildingType && rule.conditions.building_type !== ctx.buildingType) {
        return false;
      }
    }

    if (rule.category === 'DISCIPLINE' && rule.conditions.discipline_code) {
      if (ctx.disciplineCode && rule.conditions.discipline_code !== ctx.disciplineCode) {
        return false;
      }
    }

    return true;
  }

  private mapRowToDomain(row: KnowledgeRuleRow): KnowledgeRule {
    return {
      ruleId: row.rule_id,
      ruleCode: row.rule_code,
      ruleName: row.rule_name,
      version: row.version,
      priority: row.priority,
      category: row.category as KnowledgeRule['category'],
      conditions: row.conditions ?? {},
      recommendedTradeCode: row.recommended_trade_code,
      reasonCode: row.reason_code,
      reasonDescription: row.reason_description,
      effectiveFrom: row.effective_from,
      effectiveUntil: row.effective_until ?? null,
      status: row.status as KnowledgeRule['status'],
      governance: {
        owner: row.owner,
        createdBy: row.created_by,
        approvedBy: row.approved_by ?? null,
        lastReviewedAt: row.last_reviewed_at ?? null,
        reviewIntervalDays: row.review_interval_days ?? 30,
      },
    };
  }
}
