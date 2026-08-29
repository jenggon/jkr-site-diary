import { SupabaseClient } from '@supabase/supabase-js';
import { ApprovalStatus } from '@/types/approval';

export interface ApprovalQueueRow {
  readonly approval_id: string;
  readonly site_diary_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly activity_id: string;
  readonly approval_status: ApprovalStatus;
  readonly approval_level: number;
  readonly requested_at: string;
  readonly requested_by: string;
  readonly requester_name: string | null;
  readonly activity_name: string | null;
  readonly activity_date: string;
  readonly approval_date: string | null;
  readonly approved_by: string | null;
  readonly approver_name: string | null;
}

export class ApprovalQueueReadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async getQueue(programmeId: string): Promise<ApprovalQueueRow[]> {
    const { data, error } = await this.client.rpc('f24_get_site_diary_approval_queue', {
      p_programme_id: programmeId,
    });

    if (error) {
      if (error.code === 'PT403' || error.message?.includes('F24_UNAUTHORIZED_CAPABILITY')) {
        throw new Error('F24_UNAUTHORIZED_CAPABILITY');
      }
      throw new Error(`Failed to retrieve approval queue: ${error.message}`);
    }

    return (data || []) as ApprovalQueueRow[];
  }
}
