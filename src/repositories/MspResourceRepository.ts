import { isSuccess } from '@/lib/result';
import { MspResourceTrade } from '@/types/tre';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { IMspResourceRepository } from './IMspResourceRepository';

export interface MspResourceRow {
  readonly resource_id: string;
  readonly programme_id: string;
  readonly task_id: string;
  readonly trade_code: string;
  readonly trade_name: string;
  readonly trade_category?: string | null;
}

export class MspResourceRepository implements IMspResourceRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter()) {
    this.adapter = adapter;
  }

  public async findResourceTradeByMspTask(
    programmeId: string,
    mspTaskId: string
  ): Promise<MspResourceTrade | null> {
    const result = await this.adapter.selectOne<MspResourceRow>('msp_resources', {
      programme_id: programmeId,
      task_id: mspTaskId,
    });

    if (isSuccess(result) && result.value !== null) {
      return {
        resourceId: result.value.resource_id,
        tradeCode: result.value.trade_code,
        tradeName: result.value.trade_name,
        tradeCategory: result.value.trade_category ?? null,
      };
    }

    return null;
  }
}
