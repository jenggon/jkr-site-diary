export interface ActivityLocationDto {
  readonly building_id?: string | null;
  readonly floor_level?: string | null;
  readonly zone?: string | null;
  readonly grid_reference?: string | null;
}

export interface TradeSelectionDto {
  readonly trade_id: string;
  readonly trade_code: string;
  readonly trade_name: string;
  readonly source: 'MSPResource' | 'KnowledgeEngine' | 'TradeLibrary';
}

export interface OpenActivityResponseDto {
  readonly activity_id: string;
  readonly site_diary_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly task_id?: string | null;
  readonly activity_name: string;
  readonly location?: ActivityLocationDto | null;
  readonly trade_info?: TradeSelectionDto | null;
  readonly workforce_count?: number | null;
  readonly status: string;
  readonly is_locked: boolean;
  readonly created_at: string;
  readonly created_by: string;
  readonly updated_at?: string | null;
  readonly updated_by?: string | null;
}

export interface ActivityLogEntryResponseDto {
  readonly log_id: string;
  readonly activity_id: string;
  readonly site_diary_id: string;
  readonly event_type: 'NEW' | 'UPDATE';
  readonly snapshot_data: Record<string, unknown>;
  readonly logged_at: string;
  readonly logged_by: string;
}

export interface CreateActivityRequestDto {
  readonly programme_id: string;
  readonly revision_id: string;
  readonly task_id?: string | undefined;
  readonly activity_name: string;
  readonly location?: {
    readonly building_id?: string | undefined;
    readonly floor_level?: string | undefined;
    readonly zone?: string | undefined;
    readonly grid_reference?: string | undefined;
  } | undefined;
  readonly trade_info?: {
    readonly trade_id: string;
    readonly trade_code: string;
    readonly trade_name: string;
    readonly source: 'MSPResource' | 'KnowledgeEngine' | 'TradeLibrary';
  } | undefined;
  readonly workforce_count?: number | undefined;
  readonly created_by: string;
}

export interface UpdateActivityRequestDto {
  readonly activity_name?: string | undefined;
  readonly location?: CreateActivityRequestDto['location'];
  readonly trade_info?: CreateActivityRequestDto['trade_info'];
  readonly workforce_count?: number | undefined;
  readonly updated_by: string;
}

export interface SuspendActivityRequestDto {
  readonly reason: string;
  readonly suspended_by: string;
}

export interface CancelActivityRequestDto {
  readonly reason: string;
  readonly cancelled_by: string;
}

export interface StartActivityRequestDto {
  readonly started_by: string;
}

export interface CompleteActivityRequestDto {
  readonly completed_by: string;
}
