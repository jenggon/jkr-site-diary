import { supabase } from '@/lib/supabase';
import { Activity } from '@/types/activity';

/**
 * Activity Engine Repository
 *
 * Spec: DB-014 (activity)
 * Bounded Context: Zon Operasi / Activity Engine
 * Primary Owner: Activity Engine (AE)
 *
 * Provides low-level persistence operations (create, read, update) for Activity entities.
 * Contains no business logic, state machine transitions, audit timestamp generation, or validation rules.
 */

// ============================================================
// Activity Persistence Operations
// ============================================================

/**
 * Create a new Activity record in database.
 * Spec: DB-014
 */
export async function createActivity(
  data: Omit<Activity, 'activity_id' | 'created_at'> & {
    activity_id?: string;
    created_at?: string;
  }
): Promise<Activity> {
  const { data: result, error } = await supabase
    .from('activity')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create activity: ${error.message}`);
  }

  return result as Activity;
}

/**
 * Retrieve an Activity by its primary key (activity_id).
 * Spec: DB-014
 */
export async function getActivityById(activityId: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('activity_id', activityId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get activity by ID: ${error.message}`);
  }

  return data as Activity | null;
}

/**
 * Retrieve an Activity by its unique operational UID (activity_uid).
 * Spec: DB-014
 */
export async function getActivityByUID(activityUid: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('activity_uid', activityUid)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get activity by UID: ${error.message}`);
  }

  return data as Activity | null;
}

/**
 * Retrieve all Activity records belonging to a Task.
 * Spec: DB-014
 */
export async function getActivitiesByTask(taskId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('task_id', taskId)
    .order('activity_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get activities by task: ${error.message}`);
  }

  return (data || []) as Activity[];
}

/**
 * Retrieve all Activity records belonging to a Programme Revision.
 * Spec: DB-014
 */
export async function getActivitiesByRevision(revisionId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('revision_id', revisionId)
    .order('activity_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get activities by revision: ${error.message}`);
  }

  return (data || []) as Activity[];
}

/**
 * Update an existing Activity record.
 * Spec: DB-014
 */
export async function updateActivity(
  activityId: string,
  updates: Partial<Activity>
): Promise<Activity> {
  const { data: result, error } = await supabase
    .from('activity')
    .update(updates)
    .eq('activity_id', activityId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update activity: ${error.message}`);
  }

  return result as Activity;
}

export const activityRepository = {
  createActivity,
  getActivityById,
  getActivityByUID,
  getActivitiesByTask,
  getActivitiesByRevision,
  updateActivity,
};
