export interface OpenActivityResponseDto {
  readonly activity_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly task_id?: string | null;
  readonly subtask: string;
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
  readonly event_type: 'NEW' | 'UPDATE';
  readonly snapshot_data: Record<string, unknown>;
  readonly logged_at: string;
  readonly logged_by: string;
}

export interface CreateActivityRequestDto {
  readonly programme_id: string;
  readonly revision_id: string;
  readonly task_id?: string | undefined;
  readonly subtask: string;
  readonly created_by: string;
}

export interface UpdateActivityRequestDto {
  readonly subtask?: string | undefined;
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
