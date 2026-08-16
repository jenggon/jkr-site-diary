import { SupabaseClient } from '@supabase/supabase-js';
import { generateUuid } from '@/lib/uuid';
import { Approval } from '@/types/approval';
import { IApprovalAtomicRepository } from './IApprovalAtomicRepository';

export class ApprovalAtomicRepository implements IApprovalAtomicRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async create(payload: Record<string, unknown>, actorId: string): Promise<Approval> {
    const { data, error } = await this.client.rpc('a27_create_approval_atomic', {
      p_payload: payload,
      p_actor_id: actorId,
      p_approval_id: generateUuid(),
      p_audit_id: generateUuid(),
    });
    if (error) throw new Error(`Atomic approval creation failed: ${error.message}`);
    return data as Approval;
  }

  public async update(approvalId: string, payload: Record<string, unknown>, actorId: string): Promise<Approval> {
    const { data, error } = await this.client.rpc('a27_update_approval_atomic', {
      p_approval_id: approvalId,
      p_payload: payload,
      p_actor_id: actorId,
      p_audit_id: generateUuid(),
    });
    if (error) throw new Error(`Atomic approval update failed: ${error.message}`);
    return data as Approval;
  }
}
