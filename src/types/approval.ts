/**
 * Approval Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-020 (Approval Schema)
 * ADRs: ADR-009, ADR-010
 * Domain Models: DM-009
 */

/**
 * Approval Status Enum
 *
 * Defines the operational approval workflow lifecycle states.
 * Spec: DB-020 (Section: Approval Information)
 */
export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Returned = 'Returned',
  Cancelled = 'Cancelled',
}

/**
 * Approval Domain Model
 *
 * Records review and approval decisions for operational records (Site Diary, Progress)
 * in multi-level approval workflows while maintaining full auditability.
 *
 * @see DB-020 (Approval Schema)
 * @see DM-009 (Approval Domain Model)
 */
export interface Approval {
  /** Primary Key (UUID) */
  approval_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id */
  revision_id: string;

  /** Parent Ownership - Foreign Key referencing activity.activity_id */
  activity_id: string;

  /** Parent Ownership - Foreign Key referencing site_diary.site_diary_id (Optional) */
  site_diary_id: string | null;

  /** Parent Ownership - Foreign Key referencing progress.progress_id (Optional) */
  progress_id: string | null;

  /** Approval Information - Approval workflow level (Default: 1) */
  approval_level: number;

  /** Approval Information - Approval workflow status (Pending, Approved, Rejected, Returned, Cancelled) */
  approval_status: ApprovalStatus;

  /** Approval Information - Timestamp when approval decision was made */
  approval_date: string | null;

  /** Approval Information - Approver comment or rejection reason */
  approval_comment: string | null;

  /** Approval Information - User ID of the approver who made decision */
  approved_by: string | null;

  /** Workflow - User ID who requested the approval */
  requested_by: string;

  /** Workflow - Timestamp when approval request was initiated */
  requested_at: string;

  /** Audit - Timestamp record was created */
  created_at: string;

  /** Audit - Timestamp record was updated */
  updated_at: string | null;
}
