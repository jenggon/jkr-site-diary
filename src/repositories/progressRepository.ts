import { supabase } from '@/lib/supabase';
import { Progress } from '@/types/progress';

/**
 * Progress Engine Repository
 *
 * Spec: DB-016 (progress)
 * Bounded Context: Zon Operasi / Progress Engine / Open Activities Engine
 * Primary Owner: Progress Engine (PG)
 *
 * Provides low-level persistence operations (create, read, update) for Progress entities.
 * Contains no business logic, approval transitions, audit timestamp generation, or validation rules.
 */

// ============================================================
// Progress Persistence Operations
// ============================================================

/**
 * Create a new Progress record in database.
 * Spec: DB-016
 */
export async function createProgress(
  data: Omit<Progress, 'progress_id' | 'created_at'> & {
    progress_id?: string;
    created_at?: string;
  }
): Promise<Progress> {
  const { data: result, error } = await supabase
    .from('progress')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create progress: ${error.message}`);
  }

  return result as Progress;
}

/**
 * Retrieve a Progress record by its primary key (progress_id).
 * Spec: DB-016
 */
export async function getProgressById(progressId: string): Promise<Progress | null> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('progress_id', progressId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get progress by ID: ${error.message}`);
  }

  return data as Progress | null;
}

/**
 * Retrieve all Progress records belonging to an Activity.
 * Spec: DB-016
 */
export async function getProgressByActivity(activityId: string): Promise<Progress[]> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('activity_id', activityId)
    .order('measurement_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get progress by activity: ${error.message}`);
  }

  return (data || []) as Progress[];
}

/**
 * Retrieve all Progress records belonging to a Site Diary entry.
 * Spec: DB-016
 */
export async function getProgressBySiteDiary(siteDiaryId: string): Promise<Progress[]> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('site_diary_id', siteDiaryId)
    .order('measurement_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get progress by site diary: ${error.message}`);
  }

  return (data || []) as Progress[];
}

/**
 * Retrieve Progress records filtered by measurement date.
 * Spec: DB-016
 */
export async function getProgressByMeasurementDate(measurementDate: string): Promise<Progress[]> {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('measurement_date', measurementDate)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get progress by measurement date: ${error.message}`);
  }

  return (data || []) as Progress[];
}

/**
 * Update an existing Progress record.
 * Spec: DB-016
 */
export async function updateProgress(
  progressId: string,
  updates: Partial<Progress>
): Promise<Progress> {
  const { data: result, error } = await supabase
    .from('progress')
    .update(updates)
    .eq('progress_id', progressId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update progress: ${error.message}`);
  }

  return result as Progress;
}

export const progressRepository = {
  createProgress,
  getProgressById,
  getProgressByActivity,
  getProgressBySiteDiary,
  getProgressByMeasurementDate,
  updateProgress,
};
