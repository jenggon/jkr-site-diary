import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { TradeSelection, TreResolutionContext } from '@/types/tre';

export interface ITreEngineService {
  /**
   * Resolves trade recommendation using Priority 1 -> Priority 2 -> Priority 3 fallback chain.
   */
  resolveTradeRecommendation(
    ctx: TreResolutionContext
  ): Promise<Result<TradeSelection, BaseAppError>>;
}
