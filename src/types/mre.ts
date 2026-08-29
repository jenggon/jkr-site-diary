import { TradeSelection } from '@/types/tre';
import { RecommendationMetadata } from '@/types/recommendationEngine';
import { WorkforceResolution } from '@/types/wre';

// We do not have PlantResolution yet, so we define an empty placeholder for future compatibility if it doesn't exist
export interface PlantResolution {}

export type MaterialResolutionSource =
  | 'MSP_MATERIAL'
  | 'TRADE_MATERIAL_LIBRARY'
  | 'KNOWLEDGE_MATERIAL_RULE';

export type MaterialConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type MaterialRuleLifecycle =
  | 'DRAFT'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'ARCHIVED';

export type MaterialRole = string;

export interface MaterialRecommendationPolicy {
  readonly allowSubstitution: boolean;
  readonly allowPartialRecommendation: boolean;
  readonly includeOptionalMaterials: boolean;
  readonly respectRegionalRestriction: boolean;
  readonly respectSupplierRestriction: boolean;
}

export interface MaterialConstraint {
  readonly minimumOrderQuantity?: number;
  readonly packageSize?: number;
  readonly supplierRestriction?: string;
  readonly regionalRestriction?: string;
  readonly storageRequirement?: string;
}

export interface MaterialSubstitution {
  readonly materialCode: string;
  readonly replacementMaterialCode: string;
  readonly reasonCode: string;
  readonly priority: number;
}

export interface MaterialItemRecommendation {
  readonly materialCode: string;
  readonly materialName: string;
  readonly materialRole: MaterialRole;
  readonly recommendedQuantity: number;
  readonly unitOfMeasure: string;
  readonly isMandatory: boolean;
  readonly estimatedWastePercentage: number | null;
  readonly estimatedCost: number | null;
  readonly estimatedLeadTime: number | null;
  readonly constraints: readonly MaterialConstraint[];
  readonly substitutions: readonly MaterialSubstitution[];
}

export interface MaterialRecommendation {
  readonly items: readonly MaterialItemRecommendation[];
  readonly totalEstimatedCost: number | null;
  readonly maxLeadTime: number | null;
}

export interface MaterialRecommendationProvenance {
  readonly repository: string;
  readonly evaluator: string | null;
  readonly ruleId: string | null;
  readonly ruleVersion: number | null;
  readonly matchedPriority: MaterialResolutionSource;
  readonly matchedTrade: string | null;
  readonly matchedDiscipline: string | null;
}

export interface MaterialResolutionDiagnostics {
  readonly evaluationStage: MaterialResolutionSource | 'ALL_SOURCES_EXHAUSTED';
  readonly durationMs: number;
  readonly evaluatorsAttemptedCount: number;
  readonly timestamp: string;
}

export interface MaterialItemReasoning {
  readonly materialCode: string;
  readonly itemReasonCode: string;
  readonly itemReasonDescription: string;
}

export interface MaterialReasoning {
  readonly overallReasonCode: string;
  readonly overallReasonDescription: string;
  readonly itemReasons: readonly MaterialItemReasoning[];
}

export interface MaterialEvaluationTrace {
  readonly attemptedPriority: number;
  readonly attemptedRepository: string;
  readonly attemptedEvaluator: string | null;
  readonly outcome: 'HIT' | 'MISS' | 'ERROR';
}

export interface MaterialSourceBreakdown {
  readonly mspHit: boolean;
  readonly tradeLibraryHit: boolean;
  readonly knowledgeRuleHit: boolean;
  readonly repositoryQueried: string | null;
}

export interface MaterialRecommendationMetadata extends RecommendationMetadata {
  readonly engineVersion: string;
  readonly generatedAt: string;
  readonly executionDurationMs: number;
  readonly platformVersion: string;
}

export interface MaterialResolution {
  readonly recommendation: MaterialRecommendation;
  readonly resolutionSource: MaterialResolutionSource;
  readonly confidenceLevel: MaterialConfidenceLevel;
  readonly provenance: MaterialRecommendationProvenance;
  readonly diagnostics: MaterialResolutionDiagnostics;
  readonly reasoning: MaterialReasoning;
  readonly metadata: MaterialRecommendationMetadata;
}

export interface MaterialRecommendationSnapshot {
  readonly snapshotId: string;
  readonly activityId: string;
  readonly siteDiaryId: string;
  readonly resolutionSource: MaterialResolutionSource;
  readonly confidenceLevel: MaterialConfidenceLevel;
  readonly items: readonly MaterialItemRecommendation[];
  readonly reasonCode: string;
  readonly reasonDescription: string;
  readonly snapshottedAt: string;
}

export interface MaterialResolutionContext {
  readonly siteDiaryId: string;
  readonly programmeId: string;
  readonly revisionId?: string | undefined;
  readonly mspTaskId?: string | undefined;
  readonly activityName: string;
  readonly tradeSelection: TradeSelection;
  readonly discipline?: string | undefined;
  readonly policy: MaterialRecommendationPolicy;
  readonly workforceResolution?: WorkforceResolution | undefined;
  readonly plantResolution?: PlantResolution | undefined;
}

export interface MaterialResolutionObservabilityEvent {
  readonly requestId: string;
  readonly activityId: string | null;
  readonly programmeId: string;
  readonly tradeId: string;
  readonly resolutionSource: MaterialResolutionSource | null;
  readonly confidenceLevel: MaterialConfidenceLevel | null;
  readonly evaluationStage: MaterialResolutionSource | 'ALL_SOURCES_EXHAUSTED';
  readonly durationMs: number;
  readonly materialCount: number;
  readonly estimatedCost: number | null;
  readonly timestamp: string;
}
