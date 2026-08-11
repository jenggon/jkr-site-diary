import { supabase } from '@/lib/supabase';
import { SiteDiary } from '@/types/siteDiary';

/**
 * Site Diary Engine Repository
 *
 * Spec: DB-015 (site_diary)
 * Bounded Context: Zon Operasi / Site Diary Engine / Operation Engine
 * Primary Owner: Operation Engine
 *
 * Provides low-level persistence operations (create, read, update) for SiteDiary entities.
 * Contains no business logic, lifecycle transitions, audit timestamp generation, or validation rules.
 */

// ============================================================
// Site Diary Persistence Operations
// ============================================================

/**
 * Create a new Site Diary record in database.
 * Spec: DB-015
 */
export async function createSiteDiary(
  data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & {
    site_diary_id?: string;
    submitted_at?: string;
  }
): Promise<SiteDiary> {
  const { data: result, error } = await supabase
    .from('site_diary')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create site diary: ${error.message}`);
  }

  return result as SiteDiary;
}

/**
 * Retrieve a Site Diary record by its primary key (site_diary_id).
 * Spec: DB-015
 */
export async function getSiteDiaryById(siteDiaryId: string): Promise<SiteDiary | null> {
  const { data, error } = await supabase
    .from('site_diary')
    .select('*')
    .eq('site_diary_id', siteDiaryId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get site diary by ID: ${error.message}`);
  }

  return data as SiteDiary | null;
}

/**
 * Retrieve a Site Diary record by unique composite key (activity_id, activity_date).
 * Spec: DB-015
 */
export async function getSiteDiaryByActivityAndDate(
  activityId: string,
  activityDate: string
): Promise<SiteDiary | null> {
  const { data, error } = await supabase
    .from('site_diary')
    .select('*')
    .eq('activity_id', activityId)
    .eq('activity_date', activityDate)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get site diary by activity and date: ${error.message}`);
  }

  return data as SiteDiary | null;
}

/**
 * Retrieve all Site Diary records belonging to an Activity.
 * Spec: DB-015
 */
export async function getSiteDiariesByActivity(activityId: string): Promise<SiteDiary[]> {
  const { data, error } = await supabase
    .from('site_diary')
    .select('*')
    .eq('activity_id', activityId)
    .order('activity_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get site diaries by activity: ${error.message}`);
  }

  return (data || []) as SiteDiary[];
}

/**
 * Retrieve all Site Diary records belonging to a Programme Revision.
 * Spec: DB-015
 */
export async function getSiteDiariesByRevision(revisionId: string): Promise<SiteDiary[]> {
  const { data, error } = await supabase
    .from('site_diary')
    .select('*')
    .eq('revision_id', revisionId)
    .order('activity_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to get site diaries by revision: ${error.message}`);
  }

  return (data || []) as SiteDiary[];
}

/**
 * Update an existing Site Diary record.
 * Spec: DB-015
 */
export async function updateSiteDiary(
  siteDiaryId: string,
  updates: Partial<SiteDiary>
): Promise<SiteDiary> {
  const { data: result, error } = await supabase
    .from('site_diary')
    .update(updates)
    .eq('site_diary_id', siteDiaryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update site diary: ${error.message}`);
  }

  return result as SiteDiary;
}

/**
 * Retrieve the most recent Site Diary record belonging to an Activity.
 * Spec: F-02 (Manpower Copy)
 */
export async function getLatestSiteDiaryByActivity(activityId: string): Promise<SiteDiary | null> {
  const { data, error } = await supabase
    .from('site_diary')
    .select('*')
    .eq('activity_id', activityId)
    .order('activity_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get latest site diary by activity: ${error.message}`);
  }

  return data as SiteDiary | null;
}

export const siteDiaryRepository = {
  createSiteDiary,
  getSiteDiaryById,
  getSiteDiaryByActivityAndDate,
  getSiteDiariesByActivity,
  getLatestSiteDiaryByActivity,
  getSiteDiariesByRevision,
  updateSiteDiary,
};
