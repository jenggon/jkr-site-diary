import { isSuccess } from '@/lib/result';
import { TradeLibrary } from '@/types/tradeLibrary';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { ITradeLibraryRepository } from './ITradeLibraryRepository';

export class TradeLibraryRepository implements ITradeLibraryRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter()) {
    this.adapter = adapter;
  }

  public async getDefaultTrade(): Promise<TradeLibrary | null> {
    const result = await this.adapter.selectOne<TradeLibrary>('trade_library', {
      is_active: true,
    });
    if (isSuccess(result)) {
      return result.value;
    }
    return null;
  }

  public async getTradeByCode(tradeCode: string): Promise<TradeLibrary | null> {
    const result = await this.adapter.selectOne<TradeLibrary>('trade_library', {
      trade_code: tradeCode,
      is_active: true,
    });
    if (isSuccess(result)) {
      return result.value;
    }
    return null;
  }

  public async getTradeById(tradeId: string): Promise<TradeLibrary | null> {
    const result = await this.adapter.selectOne<TradeLibrary>('trade_library', {
      trade_id: tradeId,
    });
    if (isSuccess(result)) {
      return result.value;
    }
    return null;
  }
}
