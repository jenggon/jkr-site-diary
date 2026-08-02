/**
 * Progress Engine Domain Model
 *
 * Project: JKR Site Diary Platform
 * Specs: DB-016 (Progress Schema)
 * ADRs: ADR-007, ADR-009
 * Business Rules: PG-001, PG-002
 */

/**
 * Progress Measurement Type
 *
 * Defines the unit classification of physical progress measurement.
 * Spec: DB-016 (Section: Measurement)
 */
export enum ProgressMeasurementType {
  Percentage = 'Percentage',
  Quantity = 'Quantity',
  Length = 'Length',
  Area = 'Area',
  Volume = 'Volume',
  Weight = 'Weight',
  Item = 'Item',
}

/**
 * Progress Measurement Status
 *
 * Defines the approval lifecycle state of a progress record.
 * Status transition: Draft -> Verified -> Approved
 *
 * Spec: DB-016 (Section: Status)
 */
export enum ProgressMeasurementStatus {
  Draft = 'Draft',
  Verified = 'Verified',
  Approved = 'Approved',
}

/**
 * Progress Domain Model
 *
 * Represents the measured achievement and work completed for an Activity.
 *
 * @see DB-016 (Progress Schema)
 * @see PG-001 (Progress Engine)
 */
export interface Progress {
  /** Primary Key (UUID) */
  progress_id: string;

  /** Parent Ownership - Foreign Key referencing programme.programme_id */
  programme_id: string;

  /** Parent Ownership - Foreign Key referencing programme_revision.revision_id */
  revision_id: string;

  /** Parent Ownership - Foreign Key referencing activity.activity_id */
  activity_id: string;

  /** Parent Ownership - Foreign Key referencing site_diary.site_diary_id */
  site_diary_id: string;

  /** Measurement Date - Date when progress was measured (YYYY-MM-DD) */
  measurement_date: string;

  /** Measurement - Measurement classification type */
  progress_type: ProgressMeasurementType | null;

  /** Measurement - Target planned quantity */
  planned_quantity: number | null;

  /** Measurement - Actual measured quantity completed */
  actual_quantity: number;

  /** Measurement - Measurement unit text (e.g. %, m, m², m³, nos, kg) */
  unit: string | null;

  /** Measurement - Calculated or entered progress percentage (0.00 - 100.00) */
  progress_percentage: number | null;

  /** Status - Approval lifecycle status (Draft, Verified, Approved) */
  measurement_status: ProgressMeasurementStatus;

  /** Verification - User ID who verified progress measurement */
  verified_by: string | null;

  /** Verification - Timestamp when progress measurement was verified */
  verified_at: string | null;

  /** Verification - User ID who approved progress measurement */
  approved_by: string | null;

  /** Verification - Timestamp when progress measurement was approved */
  approved_at: string | null;

  /** Audit - Timestamp record was created */
  created_at: string;

  /** Audit - Timestamp record was updated */
  updated_at: string | null;
}
