/**
 * Knowledge Recommendation Engine (KRE) Domain Types
 *
 * Project: JKR Site Diary Platform
 * Specs: DEV-025 (Knowledge Recommendation Engine)
 * ADRs: Reserved ADR-022, ADR-014, ADR-020
 */

export type RuleCategory =
  | 'TASK'
  | 'BUILDING'
  | 'DISCIPLINE'
  | 'HISTORY'
  | 'SAFETY'
  | 'QUALITY'
  | 'BIM'
  | 'GIS'
  | 'WEATHER'
  | 'RISK';

export type RuleLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED';

export interface KnowledgeRuleGovernance {
  readonly owner: string;
  readonly createdBy: string;
  readonly approvedBy: string | null;
  readonly lastReviewedAt: string | null;
  readonly reviewIntervalDays: number;
}

export interface KnowledgeRule {
  readonly ruleId: string;
  readonly ruleCode: string;
  readonly ruleName: string;
  readonly version: number;
  readonly priority: number;
  readonly category: RuleCategory;
  readonly conditions: Record<string, unknown>;
  readonly recommendedTradeCode: string;
  readonly reasonCode: string;
  readonly reasonDescription: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
  readonly status: RuleLifecycleStatus;
  readonly governance: KnowledgeRuleGovernance;
}

export interface MatchedRuleDetail {
  readonly ruleId: string;
  readonly ruleCode: string;
  readonly version: number;
  readonly priority: number;
  readonly specificityScore: number;
  readonly reasonCode: string;
  readonly reasonDescription: string;
  readonly recommendedTradeCode: string;
}

export interface KnowledgeRecommendation {
  readonly recommendedTradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly tradeCategory: string | null;
  readonly reasonCode: string;
  readonly reasonDescription: string;
  readonly matchedRules: readonly MatchedRuleDetail[];
  readonly source: 'KNOWLEDGE_ENGINE';
}

export interface KnowledgeEvaluationContext {
  readonly siteDiaryId: string;
  readonly programmeId: string;
  readonly mspTaskId?: string | undefined;
  readonly activityName: string;
  readonly subtaskName?: string | undefined;
  readonly buildingType?: string | undefined;
  readonly disciplineCode?: string | undefined;
  readonly historicalTradeCodes?: readonly string[] | undefined;
}

export interface KnowledgeEvaluationDiagnostics {
  readonly rulesLoaded: number;
  readonly rulesEvaluated: number;
  readonly rulesMatched: number;
  readonly selectedRuleId: string | null;
  readonly selectedRuleVersion: number | null;
  readonly executionDurationMs: number;
}
