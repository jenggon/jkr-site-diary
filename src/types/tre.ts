/**
 * Trade Recommendation Engine (TRE) Domain Types
 *
 * Project: JKR Site Diary Platform
 * Specs: DEV-024 (TRE Engine Phase 1)
 * ADRs: ADR-014, ADR-020
 */

export type TradeResolutionSource = 'MSP_RESOURCE' | 'KNOWLEDGE_ENGINE' | 'TRADE_LIBRARY';

/** Unified Trade Selection Domain Model */
export interface TradeSelection {
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly tradeCategory: string | null;
  readonly resolutionSource: TradeResolutionSource;
}

/** Input context for TRE evaluation */
export interface TreResolutionContext {
  readonly siteDiaryId: string;
  readonly programmeId: string;
  readonly revisionId: string;
  readonly mspTaskId?: string | undefined;
  readonly activityName: string;
  readonly subtaskName?: string | undefined;
  readonly ahiScore?: number | undefined;
}

/** Priority 1 Source Model */
export interface MspResourceTrade {
  readonly resourceId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly tradeCategory: string | null;
}

/** Priority 2 Source Model (DEV-025 Knowledge Engine Candidate) */
export interface KnowledgeTradeRecommendation {
  readonly recommendedTradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly tradeCategory: string | null;
  readonly rank: number;
}
