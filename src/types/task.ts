/**
 * MSP Engine / Task Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-013 (Task Schema)
 * ADRs: ADR-006, ADR-009
 * Domain Models: DM-004
 * Business Rules: BR-004, BR-012
 */

/**
 * Task Domain Model
 *
 * Task represents the imported planning activities from Microsoft Project (MSP).
 * Tasks define the official planning structure for a Programme Revision.
 *
 * @see DB-013 (Task Schema)
 * @see DM-004 (Task Domain Model)
 * @see ADR-006 (Program Kerja Single Source of Truth)
 * @see BR-004 (Task)
 */
export interface Task {
  /** Primary Key (UUID) */
  task_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id */
  revision_id: string;

  /** MSP Identity - Unique task UID imported from MSP (Unique per Revision) */
  task_uid: number;

  /** MSP Identity - Optional GUID imported from MSP */
  task_guid: string | null;

  /** WBS - Work Breakdown Structure string (e.g. 1.1.2) */
  wbs: string | null;

  /** Task Information - Official task name */
  task_name: string;

  /** Task Information - Parent task UID for WBS hierarchy */
  parent_task_uid: number | null;

  /** Task Information - Outline level from MSP */
  outline_level: number | null;

  /** Task Information - Display/Rendering order */
  display_order: number | null;

  /** Planning Dates - Planned start date (YYYY-MM-DD) */
  planned_start: string | null;

  /** Planning Dates - Planned finish date (YYYY-MM-DD) */
  planned_finish: string | null;

  /** Planning Dates - Planned duration in days */
  planned_duration_days: number | null;

  /** Planning Flags - True if task is a milestone */
  is_milestone: boolean | null;

  /** Planning Flags - True if task is on critical path */
  is_critical: boolean | null;

  /** Planning Flags - True if task is a summary task */
  is_summary: boolean | null;

  /** Constraint Information - Constraint type from MSP */
  constraint_type: string | null;

  /** Constraint Information - Constraint date from MSP (YYYY-MM-DD) */
  constraint_date: string | null;

  /** Audit - Timestamp record was created */
  created_at: string;

  /** Audit - User ID who created record */
  created_by: string;
}
