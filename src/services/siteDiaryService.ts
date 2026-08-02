import { SiteDiary } from '@/types/siteDiary';
import { siteDiaryRepository } from '@/repositories/siteDiaryRepository';

/**
 * Site Diary Engine Business Service
 *
 * Specs: DB-015 (site_diary)
 * ADRs: ADR-007, ADR-009, ADR-010
 * Business Rules: SD-001, SD-002, SD-003, SD-005
 *
 * Responsible for Site Diary Engine business orchestration and audit metadata population.
 * Operates strictly through siteDiaryRepository and performs no direct database or infrastructure operations.
 */

/**
 * Create a new Site Diary entry.
 * Populates submitted_at audit metadata before persistence via siteDiaryRepository.
 *
 * Specs: DB-015, SD-001
 */
export async function createSiteDiary(
  data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & {
    site_diary_id?: string;
    submitted_at?: string;
  }
): Promise<SiteDiary> {
  const submittedAt = new Date().toISOString();

  return siteDiaryRepository.createSiteDiary({
    ...data,
    submitted_at: submittedAt,
  });
}

/**
 * Retrieve a Site Diary record by its ID.
 * Delegates persistence to siteDiaryRepository.
 *
 * Specs: DB-015
 */
export async function getSiteDiaryById(siteDiaryId: string): Promise<SiteDiary | null> {
  return siteDiaryRepository.getSiteDiaryById(siteDiaryId);
}

/**
 * Retrieve a Site Diary record by Activity ID and operational activity date.
 * Delegates persistence to siteDiaryRepository.
 *
 * Specs: DB-015, SD-005
 */
export async function getSiteDiaryByActivityAndDate(
  activityId: string,
  activityDate: string
): Promise<SiteDiary | null> {
  return siteDiaryRepository.getSiteDiaryByActivityAndDate(activityId, activityDate);
}

/**
 * Retrieve all Site Diary records belonging to an Activity.
 * Delegates persistence to siteDiaryRepository.
 *
 * Specs: DB-015
 */
export async function getSiteDiariesByActivity(activityId: string): Promise<SiteDiary[]> {
  return siteDiaryRepository.getSiteDiariesByActivity(activityId);
}

/**
 * Retrieve all Site Diary records belonging to a Programme Revision.
 * Delegates persistence to siteDiaryRepository.
 *
 * Specs: DB-015
 */
export async function getSiteDiariesByRevision(revisionId: string): Promise<SiteDiary[]> {
  return siteDiaryRepository.getSiteDiariesByRevision(revisionId);
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
export async function updateSiteDiary(
  siteDiaryId: string,
  updates: Partial<SiteDiary>
): Promise<SiteDiary> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  const updatedAt = new Date().toISOString();

  return siteDiaryRepository.updateSiteDiary(siteDiaryId, {
    ...updates,
    updated_at: updatedAt,
  });
}

export const siteDiaryService = {
  createSiteDiary,
  getSiteDiaryById,
  getSiteDiaryByActivityAndDate,
  getSiteDiariesByActivity,
  getSiteDiariesByRevision,
  updateSiteDiary,
};
