import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityStatus, ActivityWeather } from '@/types/activity';
import {
  SiteDiaryContractorScope,
  SiteDiaryManpower,
  SiteDiaryPrintContext,
  SiteDiaryWeatherCondition,
} from '@/types/siteDiary';
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
    readonly revision_name: string | null;
    readonly status: string;
  } | null;
}

export function mapRawRowToPrintDto(row: RawPrintDiaryRow): SiteDiaryPrintDto {
  const activity = row.activity;
  const programme = row.programme;
  const revision = row.programme_revision;

  if (!programme || !programme.programme_id) {
    throw new SiteDiaryPrintReadError(500, 'Canonical context missing: programme');
  }
  if (programme.programme_id !== row.programme_id) {
    throw new SiteDiaryPrintReadError(500, 'Canonical context mismatch: programme_id');
  }

  if (!revision || !revision.revision_id) {
    throw new SiteDiaryPrintReadError(500, 'Canonical context missing: revision');
  }
  if (revision.revision_id !== row.revision_id) {
    throw new SiteDiaryPrintReadError(500, 'Canonical context mismatch: revision_id');
  }
  if (typeof revision.revision_no !== 'number') {
    throw new SiteDiaryPrintReadError(500, 'Canonical context malformed: revision_no');
  }
  if (typeof revision.status !== 'string') {
    throw new SiteDiaryPrintReadError(500, 'Canonical context malformed: revision status');
  }

  if (!activity || !activity.activity_id) {
    throw new SiteDiaryPrintReadError(500, 'Canonical context missing: activity');
  }
  if (activity.activity_id !== row.activity_id) {
    throw new SiteDiaryPrintReadError(500, 'Canonical context mismatch: activity_id');
  }
  if (activity.source_type !== 'MSP' && activity.source_type !== 'VO') {
    throw new SiteDiaryPrintReadError(500, `Canonical context invalid: activity source_type`);
  }

  const isCurrentRevision = Boolean(programme.current_revision_id === revision.revision_id);
  const isHistorical = !isCurrentRevision;

  let sourceType: 'MSP' | 'VO' = activity.source_type;
  let wbs = '';
  let taskName = '';
  let isCritical = false;

  if (sourceType === 'VO') {
    if (!activity.vo_item || !activity.vo_item.vo_item_id) {
      throw new SiteDiaryPrintReadError(500, 'Canonical context missing: vo_item');
    }
    wbs = activity.vo_item.vo_reference || '';
    taskName =
      activity.subtask_display_name ||
      activity.subtask ||
      activity.vo_item.description ||
      activity.vo_item.line_item ||
      '';
      
    if (taskName.trim() === '' && wbs.trim() === '' && (!activity.vo_item.line_item || activity.vo_item.line_item.trim() === '')) {
      throw new SiteDiaryPrintReadError(500, 'Canonical context missing: VO has no usable identity');
    }
    
    // Fallback if taskName is totally empty but we have some identity
    if (taskName.trim() === '') {
      taskName = activity.vo_item.line_item || wbs;
    }

    isCritical = false;
  } else {
    if (!activity.task || !activity.task.task_id) {
      throw new SiteDiaryPrintReadError(500, 'Canonical context missing: task');
    }
    wbs =
      activity.task.wbs ||
      activity.task.outline_number ||
      (activity.task.task_uid !== undefined && activity.task.task_uid !== null
        ? String(activity.task.task_uid)
        : '');
    taskName =
      activity.task.task_name ||
      activity.subtask_display_name ||
      activity.subtask ||
      '';
      
    if (taskName.trim() === '') {
      throw new SiteDiaryPrintReadError(500, 'Canonical context missing: MSP task has no usable identity');
    }

    isCritical = Boolean(activity.task.is_critical);
  }

  // Explicit fail-closed validation for print context
  const rawCtx = row.print_context;
  if (!rawCtx || typeof rawCtx !== 'object' || Array.isArray(rawCtx)) {
    throw new SiteDiaryPrintReadError(500, 'Malformed print_context in database record');
  }
  
  const ctxRecord = rawCtx as unknown as Record<string, unknown>;

  const validateStringOptional = (field: keyof SiteDiaryPrintContext, defaultValue: string): string => {
    if (!(field in ctxRecord) || ctxRecord[field] === undefined) {
      return defaultValue;
    }
    if (typeof ctxRecord[field] !== 'string') {
      throw new SiteDiaryPrintReadError(500, `Malformed print_context: ${field} must be string`);
    }
    return ctxRecord[field] as string;
  };

  const validateTimeOptional = (field: keyof SiteDiaryPrintContext): string | null => {
    if (!(field in ctxRecord) || ctxRecord[field] === undefined) {
      return null;
    }
    const val = ctxRecord[field];
    if (val === null) return null;
    if (typeof val !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
      throw new SiteDiaryPrintReadError(500, `Malformed print_context: ${field} has invalid format`);
    }
    return val;
  };

  const validateWeatherOptional = (field: keyof SiteDiaryPrintContext): SiteDiaryWeatherCondition | null => {
    if (!(field in ctxRecord) || ctxRecord[field] === undefined) {
      return null;
    }
    const val = ctxRecord[field];
    if (val === null) return null;
    if (val !== 'ELOK' && val !== 'HUJAN' && val !== 'MENDUNG' && val !== 'RIBUT') {
      throw new SiteDiaryPrintReadError(500, `Malformed print_context: ${field} has invalid format`);
    }
    return val as SiteDiaryWeatherCondition;
  };

  const contractorScopeRaw = validateStringOptional('contractor_scope', 'CONTRACTOR');
  if (contractorScopeRaw !== 'CONTRACTOR' && contractorScopeRaw !== 'NSC') {
    throw new SiteDiaryPrintReadError(500, `Invalid contractor_scope: ${contractorScopeRaw}`);
  }

  const printContext: SiteDiaryPrintContextDto = {
    location: validateStringOptional('location', ''),
    workStartTime: validateTimeOptional('work_start_time'),
    workEndTime: validateTimeOptional('work_end_time'),
    weatherCondition: validateWeatherOptional('weather_condition'),
    rainStartTime: validateTimeOptional('rain_start_time'),
    rainEndTime: validateTimeOptional('rain_end_time'),
    contractorScope: contractorScopeRaw as SiteDiaryContractorScope,
  };

  // Explicit fail-closed validation for manpower
  let manpower: SiteDiaryPrintManpowerItem[] = [];
  if (row.manpower !== null && row.manpower !== undefined) {
    if (!Array.isArray(row.manpower)) {
      throw new SiteDiaryPrintReadError(500, 'Canonical context malformed: manpower is not an array');
    }
    manpower = row.manpower.map((item) => {
      if (!item || typeof item !== 'object' || typeof item.trade_name !== 'string' || item.trade_name.trim() === '') {
        throw new SiteDiaryPrintReadError(500, 'Canonical context malformed: manpower trade_name missing');
      }
      if (typeof item.bumi_count !== 'number' || typeof item.non_bumi_count !== 'number' || typeof item.foreign_count !== 'number') {
        throw new SiteDiaryPrintReadError(500, 'Canonical context malformed: manpower count missing or invalid');
      }
      return {
        tradeName: item.trade_name.trim(),
        bumiCount: item.bumi_count,
        nonBumiCount: item.non_bumi_count,
        foreignCount: item.foreign_count,
      };
    });
  }

  return {
    siteDiaryId: row.site_diary_id,
    activityId: row.activity_id,
    programmeId: row.programme_id,
    programmeName: programme.programme_name,
    programmeCode: programme.programme_code,
    revisionId: row.revision_id,
    revisionNumber: revision.revision_no,
    revisionTitle: revision.revision_name || '',
    revisionStatus: revision.status,
    isCurrentRevision,
    isHistorical,
    activityDate: row.activity_date,
    diaryStatus: row.status,
    activityStatus: activity.status ?? null,
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
        error.message?.includes('FORBIDDEN')
      ) {
        throw new SiteDiaryPrintReadError(403, 'Forbidden: Not authorized for programme');
      }
      if (error.code === 'PT404' || error.message?.includes('NOT_FOUND') || error.message?.includes('PT404_SITE_DIARY_NOT_FOUND')) {
        throw new SiteDiaryPrintReadError(404, 'Site diary record not found');
      }
      if (error.code === 'P0001' && error.message?.includes('CANONICAL_CONTEXT_MISMATCH')) {
        throw new SiteDiaryPrintReadError(500, 'Internal Server Error: Canonical Context Mismatch');
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
