import { SupabaseClient } from '@supabase/supabase-js';
import { generateUuid } from '@/lib/uuid';
import { AuthorizationError } from '@/lib/errors';
import { Approval } from '@/types/approval';
import { IApprovalAtomicRepository } from './IApprovalAtomicRepository';
import {
  ApprovalStaleSiteDiaryError,
  ApprovalContextChangedError,
  ApprovalTerminalStateError,
  ApprovalNotFoundError,
  ApprovalValidationError,
} from '@/errors/approvalErrors';
import { SiteDiaryNotFoundError } from '@/errors/siteDiaryErrors';

export class ApprovalAtomicRepository implements IApprovalAtomicRepository {
  public constructor(private readonly client: SupabaseClient) {}

  private handleRpcError(rpcName: string, error: { code?: string; message?: string }): never {
    if (error.code === 'PT403') {
      throw new AuthorizationError(error.message || 'Unauthorized capability');
    }
    if (error.code === 'PT409') {
      if (error.message === 'F24_SITE_DIARY_STALE') {
        throw new ApprovalStaleSiteDiaryError('Site diary has been modified since it was loaded');
      }
      if (error.message === 'F24_APPROVAL_CONTEXT_CHANGED') {
        throw new ApprovalContextChangedError('Approval context has changed concurrently');
      }
      throw new ApprovalStaleSiteDiaryError(error.message || 'Concurrent modification conflict');
    }
    if (error.message === 'A27_APPROVAL_TERMINAL_STATE') {
      throw new ApprovalTerminalStateError('Approval is already in a terminal state');
    }
    if (error.message === 'A27_APPROVAL_NOT_FOUND') {
      throw new ApprovalNotFoundError('Approval record not found');
    }
    if (error.message === 'A27_SITE_DIARY_NOT_FOUND') {
      throw new SiteDiaryNotFoundError('Linked site diary record not found');
    }
    if (error.code === '22007' || error.message === 'F24_EXPECTED_LAST_MODIFIED_REQUIRED') {
      throw new ApprovalValidationError('expected_site_diary_last_modified_at is required for Site Diary approvals.');
    }
    throw new Error(`${rpcName} failed: ${error.message}`);
  }

  public async create(payload: Record<string, unknown>, actorId: string, expectedSiteDiaryLastModifiedAt?: string): Promise<Approval> {
    const { data, error } = await this.client.rpc('a27_create_approval_atomic', {
      p_payload: payload,
      p_actor_id: actorId,
      p_approval_id: generateUuid(),
      p_audit_id: generateUuid(),
      p_expected_sd_last_modified_at: expectedSiteDiaryLastModifiedAt || null,
    });
    if (error) this.handleRpcError('a27_create_approval_atomic', error);
    return data as Approval;
  }

  public async update(approvalId: string, payload: Record<string, unknown>, actorId: string, expectedSiteDiaryLastModifiedAt?: string): Promise<Approval> {
    const { data, error } = await this.client.rpc('a27_update_approval_atomic', {
      p_approval_id: approvalId,
      p_payload: payload,
      p_actor_id: actorId,
      p_audit_id: generateUuid(),
      p_expected_sd_last_modified_at: expectedSiteDiaryLastModifiedAt || null,
    });
    if (error) this.handleRpcError('a27_update_approval_atomic', error);
    return data as Approval;
  }
}
