import { TradeLibrary } from '@/types/tradeLibrary';

export interface ITradeLibraryRepository {
  /**
   * Resolves Priority 3 source-specific master trade library fallback record.
   */
  getDefaultTrade(): Promise<TradeLibrary | null>;
  getTradeByCode(tradeCode: string): Promise<TradeLibrary | null>;
  getTradeById(tradeId: string): Promise<TradeLibrary | null>;
}
