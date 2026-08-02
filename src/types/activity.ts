/**
 * Activity Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-014 (Activity Schema)
 * ADRs: ADR-007, ADR-009
 * Domain Models: DM-005
 * Business Rules: BR-005, BR-015
 */

/**
 * Activity Operational Status
 *
 * Defines the operational execution lifecycle states of an Activity.
 * Status transition: New -> In Progress -> Completed
 *
 * @see DB-014 (Section: Operational Status)
 */
export enum ActivityStatus {
  New = 'New',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

/**
 * Activity Weather Session
 *
 * Defines daily weather observation sessions.
 *
 * @see DB-014 (Section: Execution Data)
 */
export enum ActivityWeather {
  Morning = 'Morning',
  Afternoon = 'Afternoon',
  Night = 'Night',
}

/**
 * Activity Domain Model
 *
 * Represents the daily operational execution of a published Task.
 * Created by site operations to record actual work performed.
 *
 * @see DB-014 (Activity Schema)
 * @see DM-005 (Activity Domain Model)
 * @see BR-005 (Activity)
 */
export interface Activity {
  /** Primary Key (UUID) */
  activity_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id */
  revision_id: string;

  /** Parent Ownership - Foreign Key referencing task.task_id */
  task_id: string;

  /** Operational Identity - Unique UUID generated once and preserved across Carry Forward / Resume */
  activity_uid: string;

  /** Activity Context - MSP Outline Number */
  ahi: string | null;

  /** Activity Context - Display-only name for AHI */
  ahi_display_name: string | null;

  /** Activity Context - MSP Work Package name */
  subtask: string;

  /** Activity Context - Display-only name for subtask */
  subtask_display_name: string | null;

  /** Execution Dates - Operational execution date (YYYY-MM-DD) */
  activity_date: string;

  /** Execution Dates - First execution date when status became In Progress (YYYY-MM-DD) */
  actual_start_date: string | null;

  /** Execution Dates - Completion date when status reached Completed (YYYY-MM-DD) */
  completed_date: string | null;

  /** Operational Status - Current execution status (New, In Progress, Completed) */
  status: ActivityStatus;

  /** Execution Data - Weather session observation (Morning, Afternoon, Night) */
  weather: ActivityWeather | null;

  /** Execution Data - Daily execution remarks */
  notes: string;

  /** Ownership - User ID who submitted the record */
  submitted_by: string;

  /** Audit - Timestamp record was created */
  created_at: string;

  /** Audit - Timestamp record was updated */
  updated_at: string | null;
}
