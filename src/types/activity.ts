/**
 * Activity Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-014 v1.1 (Activity Schema)
 * ADRs: ADR-007, ADR-009, ADR-F1-001
 * Domain Models: DM-005 v1.1
 * Business Rules: BR-005 v1.1, BR-015
 */

export enum ActivityStatus {
  New = 'New',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export enum ActivityWeather {
  Morning = 'Morning',
  Afternoon = 'Afternoon',
  Night = 'Night',
}

export enum ActivitySourceType {
  MSP = 'MSP',
  VO = 'VO',
}

/**
 * Activity Domain Model.
 *
 * DB-014 v1.1 requires source_type in persistence. The optional marker here is
 * deliberately backward-compatible with pre-F1 in-memory fixtures; service and
 * persistence boundaries normalize an omitted source_type to MSP.
 */
export interface Activity {
  activity_id: string;
  programme_id: string;
  revision_id: string;
  source_type?: ActivitySourceType;
  task_id: string | null;
  vo_item_id?: string | null;
  activity_uid: string;
  ahi: string | null;
  ahi_display_name: string | null;
  subtask: string;
  subtask_display_name: string | null;
  activity_date: string;
  actual_start_date: string | null;
  completed_date: string | null;
  status: ActivityStatus;
  weather: ActivityWeather | null;
  notes: string;
  submitted_by: string;
  created_at: string;
  updated_at: string | null;
}
