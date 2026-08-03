/**
 * Workforce Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-017 (Workforce Schema)
 * ADRs: ADR-007, ADR-009
 * Business Rules: WF-001, WF-002, WF-003
 */

/**
 * Workforce Domain Model
 *
 * Records the structured manpower assigned to an Activity for a specific Site Diary entry.
 * Replaces embedded manpower JSON storage by storing each trade as an individual record.
 *
 * @see DB-017 (Workforce Schema)
 * @see WF-001 (Workforce Engine)
 */
export interface Workforce {
  /** Primary Key (UUID) */
  workforce_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id */
  revision_id: string;

  /** Parent Ownership - Foreign Key referencing activity.activity_id */
  activity_id: string;

  /** Parent Ownership - Foreign Key referencing site_diary.site_diary_id */
  site_diary_id: string;

  /** Trade Reference - Foreign Key referencing trade_library.trade_id */
  trade_id: string;

  /** Trade - Snapshot value of trade name for historical preservation */
  trade_name: string | null;

  /** Workforce Quantity - Bumiputera worker count */
  bumiputera_count: number;

  /** Workforce Quantity - Non-Bumiputera worker count */
  non_bumiputera_count: number;

  /** Workforce Quantity - Foreign worker count */
  foreign_count: number;

  /** Workforce Quantity - Total calculated worker count (bumiputera + non_bumiputera + foreign) */
  total_count: number;

  /** Audit - Timestamp record was created */
  created_at: string;

  /** Audit - Timestamp record was updated */
  updated_at: string | null;
}
