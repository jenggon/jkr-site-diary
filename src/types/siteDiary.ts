import { ActivityStatus, ActivityWeather } from '@/types/activity';

/**
 * Site Diary Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-015 (Site Diary Schema)
 * ADRs: ADR-007, ADR-009
 * Business Rules: SD-001, SD-002, SD-003, SD-005
 */

/**
 * Resource Snapshot - Manpower Entry
 *
 * Represents a single workforce trade breakdown recorded in Site Diary.
 * Spec: DB-015 (manpower JSONB)
 */
export interface SiteDiaryManpower {
  trade_name: string;
  bumi_count: number;
  non_bumi_count: number;
  foreign_count: number;
}

/**
 * Site Diary Domain Model
 *
 * Represents the daily operational execution log for an Activity.
 * One record represents one Activity on one operational day.
 *
 * @see DB-015 (Site Diary Schema)
 * @see SD-001 (Site Diary Domain Model)
 */
export interface SiteDiary {
  /** Primary Key (UUID) */
  site_diary_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id */
  revision_id: string;

  /** Parent Ownership - Foreign Key referencing activity.activity_id */
  activity_id: string;

  /** Diary Date - Operational execution date (YYYY-MM-DD) */
  activity_date: string;

  /** Daily Information - Weather session observation (Morning, Afternoon, Night) */
  weather: ActivityWeather | null;

  /** Daily Information - Required daily remarks */
  notes: string;

  /** Daily Status Snapshot - Work status snapshot (New, In Progress, Completed) */
  status: ActivityStatus | null;

  /** Resource Snapshot - Workforce manpower breakdown JSONB array */
  manpower: SiteDiaryManpower[] | null;

  /** Submission - User ID who submitted the record */
  submitted_by: string;

  /** Submission - Timestamp record was submitted */
  submitted_at: string;

  /** Audit - Timestamp record was updated */
  updated_at: string | null;
}
