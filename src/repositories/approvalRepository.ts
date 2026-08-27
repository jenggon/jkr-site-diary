import { SupabaseClient } from '@supabase/supabase-js';
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

export interface IApprovalRepository {
  createApproval(
    data: Omit<Approval, 'approval_id' | 'created_at'> & {
      approval_id?: string;
      created_at?: string;
    }
  ): Promise<Approval>;
  getApprovalById(approvalId: string): Promise<Approval | null>;
  getApprovalsByActivity(activityId: string): Promise<Approval[]>;
  getApprovalsBySiteDiary(siteDiaryId: string): Promise<Approval[]>;
  getApprovalsByProgress(progressId: string): Promise<Approval[]>;
  updateApproval(
    approvalId: string,
    updates: Partial<Approval>
  ): Promise<Approval>;
}

export type ApprovalRepository = IApprovalRepository;

/**
 * Factory for creating client-bound Approval Repository instances.
 * Enables request-scoped authenticated clients to be injected for RLS evaluation.
 */
export function createApprovalRepository(client: SupabaseClient = supabase): IApprovalRepository {
  return {
    async createApproval(
      data: Omit<Approval, 'approval_id' | 'created_at'> & {
        approval_id?: string;
        created_at?: string;
      }
    ): Promise<Approval> {
      const { data: result, error } = await client
        .from('approval')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create approval record: ${error.message}`);
      }

      return result as Approval;
    },

    async getApprovalById(approvalId: string): Promise<Approval | null> {
      const { data, error } = await client
        .from('approval')
        .select('*')
        .eq('approval_id', approvalId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get approval record by ID: ${error.message}`);
      }

      return data as Approval | null;
    },

    async getApprovalsByActivity(activityId: string): Promise<Approval[]> {
      const { data, error } = await client
        .from('approval')
        .select('*')
        .eq('activity_id', activityId)
        .order('requested_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get approval records by activity: ${error.message}`);
      }

      return (data || []) as Approval[];
    },

    async getApprovalsBySiteDiary(siteDiaryId: string): Promise<Approval[]> {
      const { data, error } = await client
        .from('approval')
        .select('*')
        .eq('site_diary_id', siteDiaryId)
        .order('requested_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get approval records by site diary: ${error.message}`);
      }

      return (data || []) as Approval[];
    },

    async getApprovalsByProgress(progressId: string): Promise<Approval[]> {
      const { data, error } = await client
        .from('approval')
        .select('*')
        .eq('progress_id', progressId)
        .order('requested_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get approval records by progress: ${error.message}`);
      }

      return (data || []) as Approval[];
    },

    async updateApproval(
      approvalId: string,
      updates: Partial<Approval>
    ): Promise<Approval> {
      const { data: result, error } = await client
        .from('approval')
        .update(updates)
        .eq('approval_id', approvalId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update approval record: ${error.message}`);
      }

      return result as Approval;
    },
  };
}

export const approvalRepository: IApprovalRepository = createApprovalRepository(supabase);

export const createApproval = (
  data: Omit<Approval, 'approval_id' | 'created_at'> & {
    approval_id?: string;
    created_at?: string;
  }
) => approvalRepository.createApproval(data);

export const getApprovalById = (approvalId: string) =>
  approvalRepository.getApprovalById(approvalId);

export const getApprovalsByActivity = (activityId: string) =>
  approvalRepository.getApprovalsByActivity(activityId);

export const getApprovalsBySiteDiary = (siteDiaryId: string) =>
  approvalRepository.getApprovalsBySiteDiary(siteDiaryId);

export const getApprovalsByProgress = (progressId: string) =>
  approvalRepository.getApprovalsByProgress(progressId);

export const updateApproval = (
  approvalId: string,
  updates: Partial<Approval>
) => approvalRepository.updateApproval(approvalId, updates);
