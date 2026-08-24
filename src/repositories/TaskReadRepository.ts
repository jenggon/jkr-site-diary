import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/types/task';

/**
 * Request-scoped Task reads. The injected client carries the verified caller
 * context so public.task RLS remains the sole Programme-membership authority.
 */
export class TaskReadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async getTaskById(taskId: string): Promise<Task | null> {
    const { data, error } = await this.client
      .from('task')
      .select('*')
      .eq('task_id', taskId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get task by ID: ${error.message}`);
    }

    return data as Task | null;
  }

  public async getTasksByRevision(revisionId: string): Promise<Task[]> {
    const { data, error } = await this.client
      .from('task')
      .select('*')
      .eq('revision_id', revisionId)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to get tasks by revision: ${error.message}`);
    }

    return (data ?? []) as Task[];
  }
}
