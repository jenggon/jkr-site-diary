import { Progress, ProgressMeasurementStatus } from '@/types/progress';
import { progressRepository } from '@/repositories/progressRepository';

/**
 * Progress Engine Business Service
 *
 * Specs: DB-016 (progress)
 * ADRs: ADR-007, ADR-009, ADR-010
 * Business Rules: PG-001, PG-002
 *
 * Responsible for Progress Engine business orchestration, lifecycle defaults,
 * and audit metadata population.
 * Operates strictly through progressRepository and performs no direct database or infrastructure operations.
 */

/**
 * Create a new Progress measurement record.
 * Populates created_at audit metadata and default measurement_status = Draft before persistence.
 *
 * Specs: DB-016, PG-001
 */
export async function createProgress(
  data: Omit<Progress, 'progress_id' | 'created_at'> & {
    progress_id?: string;
    created_at?: string;
  }
): Promise<Progress> {
  const createdAt = new Date().toISOString();
  const measurementStatus = data.measurement_status || ProgressMeasurementStatus.Draft;

  return progressRepository.createProgress({
    ...data,
    measurement_status: measurementStatus,
    created_at: createdAt,
  });
}

/**
 * Retrieve a Progress record by its ID.
 * Delegates persistence to progressRepository.
 *
 * Specs: DB-016
 */
export async function getProgressById(progressId: string): Promise<Progress | null> {
  return progressRepository.getProgressById(progressId);
}

/**
 * Retrieve all Progress records belonging to an Activity.
 * Delegates persistence to progressRepository.
 *
 * Specs: DB-016
 */
export async function getProgressByActivity(activityId: string): Promise<Progress[]> {
  return progressRepository.getProgressByActivity(activityId);
}

/**
 * Retrieve all Progress records belonging to a Site Diary entry.
 * Delegates persistence to progressRepository.
 *
 * Specs: DB-016
 */
export async function getProgressBySiteDiary(siteDiaryId: string): Promise<Progress[]> {
  return progressRepository.getProgressBySiteDiary(siteDiaryId);
}

/**
 * Retrieve Progress records by measurement date.
 * Delegates persistence to progressRepository.
 *
 * Specs: DB-016
 */
export async function getProgressByMeasurementDate(measurementDate: string): Promise<Progress[]> {
  return progressRepository.getProgressByMeasurementDate(measurementDate);
}

/**
 * NOTE
 *
 * Atomic execution is required by ADR-010 where business operations require it.
 *
 * The Infrastructure layer is responsible for providing the
 * required atomic execution mechanism during a future
 * implementation task.
 *
 * This Service intentionally contains no infrastructure logic.
 */
export async function updateProgress(
  progressId: string,
  updates: Partial<Progress>
): Promise<Progress> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  const updatedAt = new Date().toISOString();

  return progressRepository.updateProgress(progressId, {
    ...updates,
    updated_at: updatedAt,
  });
}

export const progressService = {
  createProgress,
  getProgressById,
  getProgressByActivity,
  getProgressBySiteDiary,
  getProgressByMeasurementDate,
  updateProgress,
};
