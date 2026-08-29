/**
 * Audit Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-021 (Audit Schema)
 * ADRs: ADR-009
 * Domain Models: DM-010
 */

/**
 * Audit Event Type Enum
 *
 * Defines system event classification types for append-only audit trail logging.
 * Spec: DB-021 (Section: Audit Event)
 */
export enum AuditEventType {
  Create = 'Create',
  Update = 'Update',
  DeleteAttempt = 'Delete Attempt',
  Archive = 'Archive',
  Approve = 'Approve',
  Reject = 'Reject',
  Resume = 'Resume',
  CarryForward = 'Carry Forward',
  Complete = 'Complete',
  Import = 'Import',
  Export = 'Export',
  Login = 'Login',
  Logout = 'Logout',
}

/**
 * Audit Domain Model
 *
 * Stores an immutable, append-only history of all significant system events
 * for complete traceability, compliance, investigation, and reporting.
 *
 * @see DB-021 (Audit Schema)
 */
export interface Audit {
  /** Primary Key (UUID) */
  audit_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id (Optional) */
  revision_id: string | null;

  /** Entity Reference - Name of target domain entity (e.g. Activity, Site Diary, Progress, Approval) */
  entity_name: string;

  /** Entity Reference - UUID of target entity record */
  entity_id: string;

  /** Audit Event - Event type classification */
  event_type: AuditEventType;

  /** Audit Event - Timestamp when event occurred */
  event_timestamp: string;

  /** Actor - User ID who performed the action */
  performed_by: string;

  /** Actor - Snapshot of user role at time of event */
  user_role: string | null;

  /** Change Summary - Field name modified (Optional) */
  field_name: string | null;

  /** Change Summary - Value before change (Optional) */
  old_value: string | null;

  /** Change Summary - Value after change (Optional) */
  new_value: string | null;

  /** Change Summary - Justification or reason for change (Optional) */
  change_reason: string | null;

  /** Technical Information - Client IP address (Optional) */
  ip_address: string | null;

  /** Technical Information - Client device user agent / details (Optional) */
  device_information: string | null;

  /** Technical Information - Application version (Optional) */
  application_version: string | null;
}
