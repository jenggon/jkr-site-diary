import { SupabaseClient } from '@supabase/supabase-js';
import { generateUuid } from '@/lib/uuid';
import { Progress } from '@/types/progress';
import { IProgressAtomicRepository } from './IProgressAtomicRepository';

export class ProgressAtomicRepository implements IProgressAtomicRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async create(payload: Record<string, unknown>, actorId: string): Promise<Progress> {
    const { data, error } = await this.client.rpc('a27_create_progress_atomic', {
      p_payload: payload,
      p_actor_id: actorId,
      p_progress_id: generateUuid(),
      p_audit_id: generateUuid(),
      p_activity_log_id: generateUuid(),
    });
    if (error) throw new Error(`Atomic progress creation failed: ${error.message}`);
    return data as Progress;
  }

  public async update(progressId: string, payload: Record<string, unknown>, actorId: string): Promise<Progress> {
    const { data, error } = await this.client.rpc('a27_update_progress_atomic', {
      p_progress_id: progressId,
      p_payload: payload,
      p_actor_id: actorId,
      p_audit_id: generateUuid(),
      p_activity_log_id: generateUuid(),
    });
    if (error) throw new Error(`Atomic progress update failed: ${error.message}`);
    return data as Progress;
  }
}
