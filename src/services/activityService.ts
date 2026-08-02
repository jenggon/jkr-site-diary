import { Activity, ActivityStatus } from '@/types/activity';
import { activityRepository } from '@/repositories/activityRepository';

/**
 * Activity Engine Business Service
 *
 * Specs: DB-014 (activity)
 * ADRs: ADR-007, ADR-009, ADR-010
 * Business Rules: BR-005, BR-015
 *
 * Responsible for Activity Engine business orchestration, lifecycle defaults,
 * and audit metadata population.
 * Operates strictly through activityRepository and performs no direct database or infrastructure operations.
 */

/**
 * Create a new Activity.
 * Populates created_at audit metadata and default status before persistence via activityRepository.
 *
 * Specs: DB-014, BR-005
 */
export async function createActivity(
  data: Omit<Activity, 'activity_id' | 'created_at'> & {
    activity_id?: string;
    created_at?: string;
  }
): Promise<Activity> {
  const createdAt = new Date().toISOString();
  const status = data.status || ActivityStatus.New;

  return activityRepository.createActivity({
    ...data,
    status,
    created_at: createdAt,
  });
}

/**
 * Retrieve an Activity by its ID.
 * Delegates persistence to activityRepository.
 *
 * Specs: DB-014
 */
export async function getActivityById(activityId: string): Promise<Activity | null> {
  return activityRepository.getActivityById(activityId);
}

/**
 * Retrieve an Activity by its operational UID.
 * Delegates persistence to activityRepository.
 *
 * Specs: DB-014
 */
export async function getActivityByUID(activityUid: string): Promise<Activity | null> {
  return activityRepository.getActivityByUID(activityUid);
}

/**
 * Retrieve all Activities belonging to a Task.
 * Delegates persistence to activityRepository.
 *
 * Specs: DB-014
 */
export async function getActivitiesByTask(taskId: string): Promise<Activity[]> {
  return activityRepository.getActivitiesByTask(taskId);
}

/**
 * Retrieve all Activities belonging to a Programme Revision.
 * Delegates persistence to activityRepository.
 *
 * Specs: DB-014
 */
export async function getActivitiesByRevision(revisionId: string): Promise<Activity[]> {
  return activityRepository.getActivitiesByRevision(revisionId);
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
export async function updateActivity(
  activityId: string,
  updates: Partial<Activity>
): Promise<Activity> {
  // NOTE:
  // ADR-010 requires this business operation to execute atomically.
  // The Infrastructure layer will provide the required implementation.
  // This Service intentionally performs business orchestration only.
  const updatedAt = new Date().toISOString();

  return activityRepository.updateActivity(activityId, {
    ...updates,
    updated_at: updatedAt,
  });
}

export const activityService = {
  createActivity,
  getActivityById,
  getActivityByUID,
  getActivitiesByTask,
  getActivitiesByRevision,
  updateActivity,
};
