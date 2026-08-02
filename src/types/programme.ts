/**
 * Programme Engine Domain Models
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-011, DB-012
 * ADRs: ADR-004, ADR-009
 * Domain Models: DM-001, DM-002
 * Business Rules: BR-001, BR-002
 */

/**
 * Programme Lifecycle Status
 *
 * Defines the lifecycle state of a Programme or Programme Revision.
 * Status transition: Draft -> Approved -> Archived
 *
 * @see DB-011 (Section: Lifecycle)
 * @see DB-012 (Section: Lifecycle)
 * @see ADR-004 (Programme Revision Lifecycle)
 */
export enum ProgrammeLifecycleStatus {
  Draft = 'Draft',
  Approved = 'Approved',
  Archived = 'Archived',
}

/**
 * Programme Domain Model
 *
 * Programme is the root aggregate of the JKR Site Diary Platform.
 * Every operational entity ultimately belongs to exactly one Programme.
 *
 * @see DB-011 (Programme Schema)
 * @see DM-001 (Programme Domain Model)
 * @see ADR-009 (Programme First Principle)
 * @see BR-001 (Programme Lifecycle)
 */
export interface Programme {
  /** Primary Key (UUID) */
  programme_id: string;

  /** Business Identity - Unique code (e.g. JKR/PLS/2026/001) */
  programme_code: string;

  /** Official project title */
  programme_name: string;

  /** Project owner / Government Agency */
  employer_name: string | null;

  /** Main Contractor */
  contractor_name: string | null;

  /** Supervising Officer responsible for the programme */
  supervising_officer: string | null;

  /** Contract start date (YYYY-MM-DD) */
  contract_start_date: string | null;

  /** Contract completion date (YYYY-MM-DD) */
  contract_completion_date: string | null;

  /** Defect liability end date (YYYY-MM-DD) */
  defect_liability_end: string | null;

  /** Foreign Key referencing programme_revision.revision_id (Current active revision) */
  current_revision_id: string | null;

  /** Lifecycle status (Draft, Approved, Archived) */
  status: ProgrammeLifecycleStatus;

  /** Audit: Timestamp record was created */
  created_at: string;

  /** Audit: User ID who created record */
  created_by: string;

  /** Audit: Timestamp record was updated */
  updated_at: string | null;

  /** Audit: User ID who updated record */
  updated_by: string | null;

  /** Audit: Timestamp record was archived */
  archived_at: string | null;

  /** Audit: User ID who archived record */
  archived_by: string | null;
}

/**
 * Programme Revision Domain Model
 *
 * Represents an approved planning baseline for a Programme.
 * Each revision captures a complete planning snapshot imported from Microsoft Project (MSP).
 *
 * @see DB-012 (Programme Revision Schema)
 * @see DM-002 (Programme Revision Domain Model)
 * @see ADR-004 (Programme Revision Lifecycle)
 * @see BR-002 (Programme Revision)
 */
export interface ProgrammeRevision {
  /** Primary Key (UUID) */
  revision_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Business Identity - Sequential revision number within a Programme */
  revision_no: number;

  /** Optional human-readable revision name (e.g. Original Baseline, Revision A) */
  revision_name: string | null;

  /** Original uploaded MSP/XML filename */
  msp_file_name: string | null;

  /** Timestamp the revision was imported from MSP */
  msp_imported_at: string | null;

  /** User ID responsible for the MSP import */
  msp_imported_by: string | null;

  /** Planning baseline date (YYYY-MM-DD) */
  baseline_date: string | null;

  /** Official approval date (YYYY-MM-DD) */
  approval_date: string | null;

  /** Operational effective date (YYYY-MM-DD) */
  effective_date: string | null;

  /** Lifecycle status (Draft, Approved, Archived) */
  status: ProgrammeLifecycleStatus;

  /** Audit: Timestamp record was created */
  created_at: string;

  /** Audit: User ID who created record */
  created_by: string;

  /** Audit: Timestamp revision was approved */
  approved_at: string | null;

  /** Audit: User ID who approved revision */
  approved_by: string | null;

  /** Audit: Timestamp revision was archived */
  archived_at: string | null;

  /** Audit: User ID who archived revision */
  archived_by: string | null;
}
