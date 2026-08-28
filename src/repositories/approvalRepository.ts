import { supabase } from '@/lib/supabase';
import { Approval } from '@/types/approval';

/**
 * Approval Engine Repository
 *
 * Spec: DB-020 (approval)
 * Bounded Context: Zon Operasi / Approval Engine
 * Primary Owner: Approval Engine (AP)
 *
 * Provides low-level persistence operations (create, read, update) for Approval entities.
 * Contains no business logic, approval workflow logic, status transition validation, or audit timestamp generation.
 */

// ============================================================
// Approval Persistence Operations
// ============================================================

/**
 * Create a new Approval record in database.
 * Spec: DB-020
 */
export async function createApproval(
  data: Omit<Approval, 'approval_id' | 'created_at'> & {
    approval_id?: string;
    created_at?: string;
  }
): Promise<Approval> {
  const { data: result, error } = await supabase
    .from('approval')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create approval record: ${error.message}`);
  }

  return result as Approval;
}

/**
 * Retrieve an Approval record by its primary key (approval_id).
 * Spec: DB-020
 */
export async function getApprovalById(approvalId: string): Promise<Approval | null> {
  const { data, error } = await supabase
    .from('approval')
    .select('*')
    .eq('approval_id', approvalId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get approval record by ID: ${error.message}`);
  }

  return data as Approval | null;
}

/**
 * Retrieve all Approval records belonging to an Activity.
 * Spec: DB-020
 */
export async function getApprovalsByActivity(activityId: string): Promise<Approval[]> {
  const { data, error } = await supabase
    .from('approval')
    .select('*')
    .eq('activity_id', activityId)
    .order('requested_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get approval records by activity: ${error.message}`);
  }

  return (data || []) as Approval[];
}

/**
 * Retrieve all Approval records belonging to a Site Diary entry.
 * Spec: DB-020
 */
export async function getApprovalsBySiteDiary(siteDiaryId: string): Promise<Approval[]> {
  const { data, error } = await supabase
    .from('approval')
    .select('*')
    .eq('site_diary_id', siteDiaryId)
    .order('requested_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get approval records by site diary: ${error.message}`);
  }

  return (data || []) as Approval[];
}

/**
 * Retrieve all Approval records belonging to a Progress measurement record.
 * Spec: DB-020
 */
export async function getApprovalsByProgress(progressId: string): Promise<Approval[]> {
  const { data, error } = await supabase
    .from('approval')
    .select('*')
    .eq('progress_id', progressId)
    .order('requested_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get approval records by progress: ${error.message}`);
  }

  return (data || []) as Approval[];
}

/**
 * Update an existing Approval record.
 * Spec: DB-020
 */
export async function updateApproval(
  approvalId: string,
  updates: Partial<Approval>
): Promise<Approval> {
  const { data: result, error } = await supabase
    .from('approval')
    .update(updates)
    .eq('approval_id', approvalId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update approval record: ${error.message}`);
  }

  return result as Approval;
}

export const approvalRepository = {
  createApproval,
  getApprovalById,
  getApprovalsByActivity,
  getApprovalsBySiteDiary,
  getApprovalsByProgress,
  updateApproval,
};
