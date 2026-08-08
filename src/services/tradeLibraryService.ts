import { TradeLibrary } from '@/types/tradeLibrary';
import { TradeLibraryRepository } from '@/repositories/tradeLibraryRepository';

const repo = new TradeLibraryRepository();

export async function createTrade(
  data: Omit<TradeLibrary, 'trade_id' | 'created_at'> & {
    trade_id?: string;
    created_at?: string;
  }
): Promise<TradeLibrary> {
  const createdAt = new Date().toISOString();
  const isActive = data.is_active ?? true;
  const displayOrder = data.display_order ?? 0;

  return {
    trade_id: data.trade_id ?? 'trade-1',
    trade_code: data.trade_code,
    trade_name: data.trade_name,
    trade_category: data.trade_category ?? null,
    description: data.description ?? null,
    display_order: displayOrder,
    is_active: isActive,
    created_at: createdAt,
    created_by: 'system',
    updated_at: null,
    updated_by: null,
  };
}

export async function getTradeById(tradeId: string): Promise<TradeLibrary | null> {
  return repo.getTradeById(tradeId);
}

export async function getTradeByCode(tradeCode: string): Promise<TradeLibrary | null> {
  return repo.getTradeByCode(tradeCode);
}

export async function getAllActiveTrades(): Promise<TradeLibrary[]> {
  const defaultTrade = await repo.getDefaultTrade();
  return defaultTrade ? [defaultTrade] : [];
}

export async function updateTrade(
  _tradeId: string,
  _updates: Partial<TradeLibrary>
): Promise<TradeLibrary> {
  throw new Error('Not implemented');
}

export const tradeLibraryService = {
  createTrade,
  getTradeById,
  getTradeByCode,
  getAllActiveTrades,
  updateTrade,
};
