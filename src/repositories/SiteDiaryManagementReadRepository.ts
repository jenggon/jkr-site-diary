import { SupabaseClient } from '@supabase/supabase-js';
import { ProgrammeRevisionStatus } from '@/types/programmeRevision';
import { SiteDiaryContractorScope } from '@/types/siteDiary';

export interface ManagementRevisionRow {
  readonly revision_id: string;
  readonly programme_id: string;
  readonly revision_no: number;
  readonly revision_title: string;
  readonly status: ProgrammeRevisionStatus;
  readonly programme: { current_revision_id: string | null } | null;
}

export interface ManagementDiaryRow {
  readonly site_diary_id: string;
  readonly activity_id: string;
  readonly activity_date: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly status: import('@/types/activity').ActivityStatus | null;
  readonly print_context: {
    readonly location?: string | null;
    readonly contractor_scope?: SiteDiaryContractorScope | null;
  } | null;
  readonly submitted_at: string;
  readonly updated_at: string | null;
  readonly activity: {
    readonly activity_id: string;
    readonly source_type: 'MSP' | 'VO';
    readonly task_id: string | null;
    readonly vo_item_id: string | null;
    readonly subtask: string | null;
    readonly subtask_display_name: string | null;
    readonly status: import('@/types/activity').ActivityStatus;
    readonly task: { task_name: string; task_uid: number; wbs: string | null } | null;
    readonly vo_item: { vo_reference: string; line_item: string; description: string | null } | null;
  } | null;
}

const DIARY_PROJECTION = `
  site_diary_id, activity_id, activity_date, programme_id, revision_id,
  status, print_context, submitted_at, updated_at,
  activity (
    activity_id, source_type, task_id, vo_item_id, subtask,
    subtask_display_name, status,
    task (task_name, task_uid, wbs),
    vo_item (vo_reference, line_item, description)
  )
`;

export class SiteDiaryManagementReadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async findRevision(programmeId: string, revisionId: string): Promise<ManagementRevisionRow | null> {
    const { data, error } = await this.client
      .from('programme_revision')
      .select('revision_id, programme_id, revision_no, revision_title, status, programme(current_revision_id)')
      .eq('programme_id', programmeId)
      .eq('revision_id', revisionId)
      .maybeSingle();
    if (error) throw new Error(`Failed to resolve Programme Revision: ${error.message}`);
    return data as unknown as ManagementRevisionRow | null;
  }

  public async findRevisions(programmeId: string): Promise<ManagementRevisionRow[]> {
    const { data, error } = await this.client
      .from('programme_revision')
      .select('revision_id, programme_id, revision_no, revision_title, status, programme(current_revision_id)')
      .eq('programme_id', programmeId)
      .order('revision_no', { ascending: false });
    if (error) throw new Error(`Failed to retrieve Programme Revisions: ${error.message}`);
    return (data ?? []) as unknown as ManagementRevisionRow[];
  }

  public async findDiaries(programmeId: string, revisionId: string): Promise<ManagementDiaryRow[]> {
    const { data, error } = await this.client
      .from('site_diary')
      .select(DIARY_PROJECTION)
      .eq('programme_id', programmeId)
      .eq('revision_id', revisionId)
      .order('activity_date', { ascending: false })
      .order('site_diary_id', { ascending: true });
    if (error) throw new Error(`Failed to retrieve Site Diary management projection: ${error.message}`);
    return (data ?? []) as unknown as ManagementDiaryRow[];
  }
}
