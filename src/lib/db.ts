import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from './supabase';
import { Result, Success, Failure } from './result';
import { BaseAppError, InfrastructureError } from './errors';

export interface IDatabaseTransaction {
  readonly id: string;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface IDatabaseClient {
  readonly client: SupabaseClient;
  query<T>(table: string, options?: Record<string, unknown>): Promise<T[]>;
}

class SupabaseDatabaseClient implements IDatabaseClient {
  public readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getSupabaseServerClient()) {
    this.client = client;
  }

  public async query<T>(table: string): Promise<T[]> {
    const { data, error } = await this.client.from(table).select('*');
    if (error) {
      throw new InfrastructureError(`Database query failed: ${error.message}`, { cause: error });
    }
    return (data as T[]) ?? [];
  }
}

export function getDbClient(): IDatabaseClient {
  return new SupabaseDatabaseClient();
}

export async function withTransaction<T>(
  action: (tx: IDatabaseTransaction) => Promise<T>
): Promise<Result<T, BaseAppError>> {
  const dummyTx: IDatabaseTransaction = {
    id: `tx_${Date.now()}`,
    commit: async () => {},
    rollback: async () => {},
  };

  try {
    const value = await action(dummyTx);
    await dummyTx.commit();
    return Success(value);
  } catch (err: unknown) {
    await dummyTx.rollback();
    if (err instanceof BaseAppError) {
      return Failure(err);
    }
    const message = err instanceof Error ? err.message : 'Transaction failed';
    return Failure(new InfrastructureError(message, { cause: err }));
  }
}
