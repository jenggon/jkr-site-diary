import { ITradeWorkforceLibraryRepository, TradeWorkforceCompositionRecord } from './ITradeWorkforceLibraryRepository';

export class TradeWorkforceLibraryRepository implements ITradeWorkforceLibraryRepository {
  public async getWorkforceCompositionByTrade(_tradeId: string): Promise<readonly TradeWorkforceCompositionRecord[] | null> {
    // DEV-027 placeholder implementation.
    // In a real application, this would query the Trade Workforce Library.
    // We return null to simulate a miss so it falls through to lower priorities.
    return null;
  }
}
