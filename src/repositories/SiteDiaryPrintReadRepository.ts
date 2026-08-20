import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityStatus, ActivityWeather } from '@/types/activity';
import { SiteDiaryContractorScope, SiteDiaryManpower, SiteDiaryPrintContext } from '@/types/siteDiary';
import {
  SiteDiaryPrintContextDto,
  SiteDiaryPrintDto,
  SiteDiaryPrintManpowerItem,
} from '@/types/siteDiaryPrint';

export class SiteDiaryPrintReadError extends Error {
  public constructor(
    public readonly status: 400 | 401 | 403 | 404 | 500,
    message: string
  ) {
    super(message);
    this.name = 'SiteDiaryPrintReadError';
  }
}


export interface RawPrintDiaryRow {
  readonly site_diary_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly activity_id: string;
  readonly activity_date: string;
  readonly weather: ActivityWeather | null;
  readonly notes: string | null;
  readonly status: ActivityStatus | null;
  readonly manpower: SiteDiaryManpower[] | null;
  readonly print_context: SiteDiaryPrintContext | null;
  readonly submitted_by: string;
  readonly submitted_at: string;
  readonly updated_at: string | null;
  readonly activity: {
    readonly activity_id: string;
    readonly source_type: 'MSP' | 'VO' | null;
    readonly task_id: string | null;
    readonly vo_item_id: string | null;
    readonly subtask: string | null;
    readonly subtask_display_name: string | null;
    readonly status: ActivityStatus | null;
    readonly actual_start_date: string | null;
    readonly completed_date: string | null;
    readonly task: {
      readonly task_id: string;
      readonly task_name: string;
      readonly task_uid: number;
      readonly wbs: string | null;
      readonly outline_number: string | null;
      readonly is_critical: boolean | null;
    } | null;
    readonly vo_item: {
      readonly vo_item_id: string;
      readonly vo_reference: string;
      readonly line_item: string;
      readonly description: string | null;
    } | null;
  } | null;
  readonly programme: {
    readonly programme_id: string;
    readonly programme_code: string;
    readonly programme_name: string;
    readonly current_revision_id: string | null;
    readonly created_by: string | null;
  } | null;
  readonly programme_revision: {
    readonly revision_id: string;
    readonly revision_no: number;
    readonly revision_title: string;
    readonly status: string;
  } | null;
}

export function mapRawRowToPrintDto(row: RawPrintDiaryRow): SiteDiaryPrintDto {
  const activity = row.activity;
  const programme = row.programme;
  const revision = row.programme_revision;

  const isCurrentRevision = Boolean(
    programme && revision && programme.current_revision_id === revision.revision_id
  );
  const isHistorical = !isCurrentRevision;

  let sourceType: 'MSP' | 'VO' = 'MSP';
  let wbs = '';
  let taskName = '';
  let isCritical = false;

  if (activity?.source_type === 'VO') {
    sourceType = 'VO';
    wbs = activity.vo_item?.vo_reference || 'VO';
    taskName =
      activity.subtask_display_name ||
      activity.subtask ||
      activity.vo_item?.description ||
      activity.vo_item?.line_item ||
      'VO Item';
    isCritical = false;
  } else {
    sourceType = 'MSP';
    wbs =
      activity?.task?.wbs ||
      activity?.task?.outline_number ||
      (activity?.task?.task_uid !== undefined && activity?.task?.task_uid !== null
        ? String(activity.task.task_uid)
        : '');
    taskName =
      activity?.task?.task_name ||
      activity?.subtask_display_name ||
      activity?.subtask ||
      'Activity';
    isCritical = Boolean(activity?.task?.is_critical);
  }

  // Explicit fail-closed validation for print context
  const rawCtx = row.print_context;
  if (!rawCtx || typeof rawCtx !== 'object') {
    throw new SiteDiaryPrintReadError(500, 'Malformed print_context in database record');
  }
  
  const contractorScope = typeof rawCtx.contractor_scope === 'string' 
    ? rawCtx.contractor_scope 
    : 'CONTRACTOR';
    
  if (contractorScope !== 'CONTRACTOR' && contractorScope !== 'NSC') {
     throw new SiteDiaryPrintReadError(500, `Invalid contractor_scope: ${contractorScope}`);
  }

  const printContext: SiteDiaryPrintContextDto = {
    location: typeof rawCtx.location === 'string' ? rawCtx.location : '',
    workStartTime: typeof rawCtx.work_start_time === 'string' ? rawCtx.work_start_time : null,
    workEndTime: typeof rawCtx.work_end_time === 'string' ? rawCtx.work_end_time : null,
    weatherCondition: rawCtx.weather_condition ?? null,
    rainStartTime: typeof rawCtx.rain_start_time === 'string' ? rawCtx.rain_start_time : null,
    rainEndTime: typeof rawCtx.rain_end_time === 'string' ? rawCtx.rain_end_time : null,
    contractorScope: contractorScope as SiteDiaryContractorScope,
  };

  const manpower: SiteDiaryPrintManpowerItem[] = Array.isArray(row.manpower)
    ? row.manpower
        .filter((item): item is SiteDiaryManpower => Boolean(item && typeof item.trade_name === 'string'))
        .map((item) => ({
          tradeName: item.trade_name.trim(),
          bumiCount: Number(item.bumi_count ?? 0),
          nonBumiCount: Number(item.non_bumi_count ?? 0),
          foreignCount: Number(item.foreign_count ?? 0),
        }))
    : [];

  return {
    siteDiaryId: row.site_diary_id,
    activityId: row.activity_id,
    programmeId: row.programme_id,
    programmeName: programme?.programme_name || '',
    programmeCode: programme?.programme_code || '',
    revisionId: row.revision_id,
    revisionNumber: revision?.revision_no ?? 0,
    revisionTitle: revision?.revision_title || '',
    revisionStatus: revision?.status || '',
    isCurrentRevision,
    isHistorical,
    activityDate: row.activity_date,
    diaryStatus: row.status,
    activityStatus: activity?.status ?? row.status ?? null,
    sourceType,
    wbs,
    taskName,
    isCritical,
    weather: row.weather,
    notes: typeof row.notes === 'string' ? row.notes : '',
    printContext,
    manpower,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

export class SiteDiaryPrintReadRepository {
  public constructor(private readonly client: SupabaseClient) {}

  public async getExact(siteDiaryId: string, _actorId: string): Promise<SiteDiaryPrintDto> {
    const { data, error } = await this.client
      .rpc('f25_get_site_diary_print_read', { p_site_diary_id: siteDiaryId })
      .maybeSingle();

    if (error) {
      if (
        error.code === 'PT403' || 
        error.message?.includes('UNAUTHORIZED') || 
        error.message?.includes('FORBIDDEN') ||
        error.message?.includes('CANONICAL_CONTEXT_MISMATCH') ||
        (error.code === 'P0001' && error.message?.includes('CANONICAL_CONTEXT_MISMATCH'))
      ) {
        throw new SiteDiaryPrintReadError(403, 'Forbidden: Not authorized for programme or context mismatch');
      }
      if (error.code === 'PT404' || error.message?.includes('NOT_FOUND') || error.message?.includes('PT404_SITE_DIARY_NOT_FOUND')) {
        throw new SiteDiaryPrintReadError(404, 'Site diary record not found');
      }
      throw new SiteDiaryPrintReadError(500, `Failed to retrieve Site Diary print record`);
    }

    if (!data) {
      throw new SiteDiaryPrintReadError(404, 'Site diary record not found');
    }

    const row = data as unknown as RawPrintDiaryRow;
    return mapRawRowToPrintDto(row);
  }
}
