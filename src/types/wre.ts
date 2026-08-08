import { TradeSelection } from '@/types/openActivity';
import { RecommendationMetadata } from '@/types/recommendationEngine';

export type WorkforceResolutionSource =
  | 'MSP_RESOURCE'
  | 'TRADE_WORKFORCE_LIBRARY'
  | 'KNOWLEDGE_WORKFORCE_RULE';

export type WorkforceConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type WorkforceDiscipline =
  | 'Safety'
  | 'Mechanical'
  | 'Electrical'
  | 'Civil'
  | 'Structural'
  | 'Road'
  | 'Bridge'
  | 'Tunnel'
  | 'Marine';

/** Dynamic role abstraction suitable for future JKR role expansion */
export type WorkforceRoleCode = string;

/** Standard JKR Role Code Constants */
export const WORKFORCE_ROLES = {
  SUPERVISOR: 'SUPERVISOR',
  SKILLED: 'SKILLED',
  SEMI_SKILLED: 'SEMI_SKILLED',
  GENERAL: 'GENERAL',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  OPERATOR: 'OPERATOR',
  SPECIALIST: 'SPECIALIST',
} as const;

/** Nested Value Object: Individual Workforce Line Item */
export interface WorkforceItemRecommendation {
  readonly roleCode: WorkforceRoleCode;
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly recommendedCount: number;
  readonly skillLevel: string;
  readonly isMandatory: boolean;
}

/** Nested Value Object: Recommendation Payload */
export interface WorkforceRecommendation {
  readonly items: readonly WorkforceItemRecommendation[];
  readonly totalWorkforceCount: number;
}

/** Value Object: Audit Provenance (no internal code leakage) */
export interface WorkforceRecommendationProvenance {
  readonly repository: string;
  readonly evaluator: string | null;
  readonly ruleId: string | null;
  readonly ruleVersion: number | null;
  readonly matchedPriority: WorkforceResolutionSource;
  readonly matchedDiscipline: WorkforceDiscipline | null;
}

/** Value Object: Diagnostic Information */
export interface WorkforceResolutionDiagnostics {
  readonly evaluationStage:
    | 'MSP_RESOURCE'
    | 'TRADE_WORKFORCE_LIBRARY'
    | 'KNOWLEDGE_WORKFORCE_RULE'
    | 'ALL_SOURCES_EXHAUSTED';
  readonly durationMs: number;
  readonly evaluatorsAttemptedCount: number;
  readonly timestamp: string;
}

/** Value Object: Explainability Reasoning */
export interface WorkforceReasoning {
  readonly reasonCode: string;
  readonly reasonDescription: string;
}

/** Top-Level Immutable Aggregate */
export interface WorkforceResolution {
  readonly recommendation: WorkforceRecommendation;
  readonly resolutionSource: WorkforceResolutionSource;
  readonly confidenceLevel: WorkforceConfidenceLevel;
  readonly provenance: WorkforceRecommendationProvenance;
  readonly diagnostics: WorkforceResolutionDiagnostics;
  readonly reasoning: WorkforceReasoning;
  readonly metadata: RecommendationMetadata;
}

/** Contract for future Site Diary persistence (WRE does NOT persist) */
export interface WorkforceRecommendationSnapshot {
  readonly snapshotId: string;
  readonly activityId: string;
  readonly siteDiaryId: string;
  readonly resolutionSource: WorkforceResolutionSource;
  readonly confidenceLevel: WorkforceConfidenceLevel;
  readonly totalWorkforceCount: number;
  readonly items: readonly WorkforceItemRecommendation[];
  readonly reasonCode: string;
  readonly reasonDescription: string;
  readonly snapshottedAt: string;
}

/** Internal Evaluation Trace (Logging ONLY — NEVER crosses API boundaries) */
export interface WorkforceEvaluationTrace {
  readonly attemptedPriority: number;
  readonly attemptedRepository: string;
  readonly attemptedEvaluator: string | null;
  readonly outcome: 'HIT' | 'MISS' | 'ERROR';
}

/** Input Context */
export interface WorkforceResolutionContext {
  readonly siteDiaryId: string;
  readonly programmeId: string;
  readonly revisionId: string;
  readonly mspTaskId?: string | undefined;
  readonly activityName: string;
  readonly tradeSelection: TradeSelection;
  readonly location?: {
    readonly buildingId?: string | undefined;
    readonly floorLevel?: string | undefined;
    readonly zone?: string | undefined;
    readonly gridReference?: string | undefined;
  } | undefined;
  readonly discipline?: WorkforceDiscipline | undefined;
  readonly workforceCountHint?: number | undefined;
}

export interface WorkforceResolutionObservabilityEvent {
  readonly requestId: string;
  readonly activityId: string | null;
  readonly programmeId: string;
  readonly tradeId: string;
  readonly resolutionSource: WorkforceResolutionSource | null;
  readonly confidenceLevel: WorkforceConfidenceLevel | null;
  readonly evaluationStage:
    | 'MSP_RESOURCE'
    | 'TRADE_WORKFORCE_LIBRARY'
    | 'KNOWLEDGE_WORKFORCE_RULE'
    | 'ALL_SOURCES_EXHAUSTED';
  readonly durationMs: number;
  readonly workforceCount: number;
  readonly timestamp: string;
}
