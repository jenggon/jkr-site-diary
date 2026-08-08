import { KnowledgeTradeRecommendation, TreResolutionContext } from '@/types/tre';
import { IKnowledgeEngineAdapter } from './IKnowledgeEngineAdapter';

/**
 * Fallback Knowledge Engine Adapter for DEV-024 TRE Phase 1.
 * Returns null until DEV-025 Knowledge Engine is fully implemented.
 */
export class KnowledgeEngineAdapter implements IKnowledgeEngineAdapter {
  public async getTopRecommendation(
    _ctx: TreResolutionContext
  ): Promise<KnowledgeTradeRecommendation | null> {
    // DEV-025 Integration Point: Will invoke DEV-025 Knowledge Engine service
    return null;
  }
}
