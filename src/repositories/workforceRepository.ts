import { supabase } from '@/lib/supabase';
import { Workforce } from '@/types/workforce';

/**
 * Workforce Engine Repository
 *
 * Spec: DB-017 (workforce)
 * Bounded Context: Zon Operasi / Workforce Engine
 * Primary Owner: Workforce Engine (WF)
 *
 * Provides low-level persistence operations (create, read, update) for Workforce entities.
 * Contains no business logic, manpower calculations, audit timestamp generation, or validation rules.
 */

// ============================================================
// Workforce Persistence Operations
// ============================================================

/**
 * Create a new Workforce record in database.
 * Spec: DB-017
 */
export async function createWorkforce(
  data: Omit<Workforce, 'workforce_id' | 'created_at' | 'total_count'> & {
    workforce_id?: string;
    created_at?: string;
    total_count?: number;
  }
): Promise<Workforce> {
  const { data: result, error } = await supabase
    .from('workforce')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create workforce record: ${error.message}`);
  }

  return result as Workforce;
}

/**
 * Retrieve a Workforce record by its primary key (workforce_id).
 * Spec: DB-017
 */
export async function getWorkforceById(workforceId: string): Promise<Workforce | null> {
  const { data, error } = await supabase
    .from('workforce')
    .select('*')
    .eq('workforce_id', workforceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get workforce record by ID: ${error.message}`);
  }

  return data as Workforce | null;
}

/**
 * Retrieve all Workforce records belonging to a Site Diary entry.
 * Spec: DB-017
 */
export async function getWorkforceBySiteDiary(siteDiaryId: string): Promise<Workforce[]> {
  const { data, error } = await supabase
    .from('workforce')
    .select('*')
    .eq('site_diary_id', siteDiaryId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get workforce records by site diary: ${error.message}`);
  }

  return (data || []) as Workforce[];
}

/**
 * Retrieve all Workforce records belonging to an Activity.
 * Spec: DB-017
 */
export async function getWorkforceByActivity(activityId: string): Promise<Workforce[]> {
  const { data, error } = await supabase
    .from('workforce')
    .select('*')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get workforce records by activity: ${error.message}`);
  }

  return (data || []) as Workforce[];
}

/**
 * Update an existing Workforce record.
 * Spec: DB-017
 */
export async function updateWorkforce(
  workforceId: string,
  updates: Partial<Workforce>
): Promise<Workforce> {
  const { data: result, error } = await supabase
    .from('workforce')
    .update(updates)
    .eq('workforce_id', workforceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update workforce record: ${error.message}`);
  }

  return result as Workforce;
}

export const workforceRepository = {
  createWorkforce,
  getWorkforceById,
  getWorkforceBySiteDiary,
  getWorkforceByActivity,
  updateWorkforce,
};
