import { SupabaseClient } from '@supabase/supabase-js';
import { Approval } from '@/types/approval';

export class ApprovalReviewReadError extends Error {
  public constructor(
    public readonly status: 403 | 404 | 500,
    message: string
  ) {
    super(message);
    this.name = 'ApprovalReviewReadError';
  }
}

export interface IApprovalReviewReadRepository {
  getExact(approvalId: string): Promise<Approval>;
}

export class ApprovalReviewReadRepository implements IApprovalReviewReadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async getExact(approvalId: string): Promise<Approval> {
    const { data, error } = await this.client.rpc('f24_get_site_diary_approval_review', {
      p_approval_id: approvalId,
    });

    if (error) {
      if (error.code === 'PT403' || error.message?.includes('F24_UNAUTHORIZED_CAPABILITY')) {
        throw new ApprovalReviewReadError(403, 'F24_UNAUTHORIZED_CAPABILITY');
      }
      if (error.code === 'PT404' || error.message?.includes('F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND')) {
        throw new ApprovalReviewReadError(404, 'F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND');
      }
      throw new ApprovalReviewReadError(500, 'F24_SITE_DIARY_APPROVAL_REVIEW_FAILED');
    }

    const rows = (data || []) as Approval[];
    const approval = rows[0];
    if (rows.length !== 1 || !approval || approval.approval_id !== approvalId) {
      throw new ApprovalReviewReadError(404, 'F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND');
    }
    return approval;
  }
}
