import { SupabaseClient } from '@supabase/supabase-js';

export interface SiteDiaryLogRow {
  readonly log_id: string;
  readonly site_diary_id: string;
  readonly event_type: string;
  readonly snapshot_data: unknown;
  readonly logged_at: string;
  readonly logged_by: string | null;
}

export class SiteDiaryHistoryRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async diaryExists(siteDiaryId: string): Promise<boolean> {
    const { data, error } = await this.client.from('site_diary')
      .select('site_diary_id').eq('site_diary_id', siteDiaryId).maybeSingle();
    if (error) throw new Error(`Failed to verify Site Diary history access: ${error.message}`);
    return Boolean(data);
  }

  public async findBySiteDiaryId(siteDiaryId: string): Promise<SiteDiaryLogRow[]> {
    const { data, error } = await this.client.from('site_diary_logs')
      .select('log_id, site_diary_id, event_type, snapshot_data, logged_at, logged_by')
      .eq('site_diary_id', siteDiaryId)
      .order('logged_at', { ascending: true })
      .order('log_id', { ascending: true });
    if (error) throw new Error(`Failed to retrieve Site Diary history: ${error.message}`);
    return (data ?? []) as unknown as SiteDiaryLogRow[];
  }
}
