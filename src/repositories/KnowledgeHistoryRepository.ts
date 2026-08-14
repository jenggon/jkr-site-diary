import { Result, Success, Failure } from '@/lib/result';
import { InfrastructureError, BaseAppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export interface KnowledgeHistoryRecord {
  readonly subtask: string;
  readonly created_at: string;
  readonly manpower: Array<{ trade_name?: string }>;
}

export interface IKnowledgeHistoryRepository {
  /**
   * Fetches historical manpower allocations for a specific AHI (Activity ID/outline number).
   */
  getHistoryByAhi(ahi: string): Promise<Result<KnowledgeHistoryRecord[], BaseAppError>>;
}

export class KnowledgeHistoryRepository implements IKnowledgeHistoryRepository {
  public async getHistoryByAhi(ahi: string): Promise<Result<KnowledgeHistoryRecord[], BaseAppError>> {
    try {
      const { data, error } = await supabase
        .from('site_diary_logs')
        .select('manpower, subtask, created_at')
        .eq('ahi', ahi);

      if (error) {
        return Failure(new InfrastructureError(error.message));
      }

      return Success((data as KnowledgeHistoryRecord[]) || []);
    } catch (err: unknown) {
      return Failure(new InfrastructureError(err instanceof Error ? err.message : 'Unknown error'));
    }
  }
}
