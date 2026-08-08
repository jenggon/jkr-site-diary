import { MaterialItemRecommendation } from '@/types/mre';

export interface ITradeMaterialLibraryRepository {
  getMaterialCompositionByTrade(
    tradeId: string
  ): Promise<readonly MaterialItemRecommendation[] | null>;
}
