import { KnowledgeTradeRecommendation, TreResolutionContext } from '@/types/tre';

export interface IKnowledgeEngineAdapter {
  /**
   * Resolves Priority 2 source-specific Knowledge Engine recommendation model.
   * DEV-025 integration point.
   */
  getTopRecommendations(ctx: TreResolutionContext): Promise<KnowledgeTradeRecommendation[]>;
}
