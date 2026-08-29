export interface TradeWorkforceCompositionRecord {
  readonly roleCode: string;
  readonly tradeId: string;
  readonly tradeCode: string;
  readonly tradeName: string;
  readonly baselineCount: number;
  readonly skillLevel: string;
  readonly isMandatory: boolean;
}

export interface ITradeWorkforceLibraryRepository {
  getWorkforceCompositionByTrade(tradeId: string): Promise<readonly TradeWorkforceCompositionRecord[] | null>;
}
