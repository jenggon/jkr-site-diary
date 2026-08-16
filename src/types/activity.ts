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
 * Activity Domain Model
 *
 * Represents operational execution recorded in the Site Diary.
 * Every Activity has exactly one immutable source: MSP Task OR VO Item.
 */
export interface Activity {
  activity_id: string;
  programme_id: string;
  revision_id: string;

  /** Exclusive operational source type. */
  source_type: ActivitySourceType;

  /** Required only when source_type === MSP. */
  task_id: string | null;

  /** Required only when source_type === VO. */
  vo_item_id: string | null;

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
