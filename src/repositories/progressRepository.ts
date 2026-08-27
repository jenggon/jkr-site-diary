import { SupabaseClient } from '@supabase/supabase-js';
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

export interface IProgressRepository {
  createProgress(
    data: Omit<Progress, 'progress_id' | 'created_at'> & {
      progress_id?: string;
      created_at?: string;
    }
  ): Promise<Progress>;
  getProgressById(progressId: string): Promise<Progress | null>;
  getProgressByActivity(activityId: string): Promise<Progress[]>;
  getProgressBySiteDiary(siteDiaryId: string): Promise<Progress[]>;
  getProgressByMeasurementDate(measurementDate: string): Promise<Progress[]>;
  updateProgress(
    progressId: string,
    updates: Partial<Progress>
  ): Promise<Progress>;
}

export type ProgressRepository = IProgressRepository;

/**
 * Factory for creating client-bound Progress Repository instances.
 * Enables request-scoped authenticated clients to be injected for RLS evaluation.
 */
export function createProgressRepository(client: SupabaseClient = supabase): IProgressRepository {
  return {
    async createProgress(
      data: Omit<Progress, 'progress_id' | 'created_at'> & {
        progress_id?: string;
        created_at?: string;
      }
    ): Promise<Progress> {
      const { data: result, error } = await client
        .from('progress')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create progress: ${error.message}`);
      }

      return result as Progress;
    },

    async getProgressById(progressId: string): Promise<Progress | null> {
      const { data, error } = await client
        .from('progress')
        .select('*')
        .eq('progress_id', progressId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get progress by ID: ${error.message}`);
      }

      return data as Progress | null;
    },

    async getProgressByActivity(activityId: string): Promise<Progress[]> {
      const { data, error } = await client
        .from('progress')
        .select('*')
        .eq('activity_id', activityId)
        .order('measurement_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get progress by activity: ${error.message}`);
      }

      return (data || []) as Progress[];
    },

    async getProgressBySiteDiary(siteDiaryId: string): Promise<Progress[]> {
      const { data, error } = await client
        .from('progress')
        .select('*')
        .eq('site_diary_id', siteDiaryId)
        .order('measurement_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get progress by site diary: ${error.message}`);
      }

      return (data || []) as Progress[];
    },

    async getProgressByMeasurementDate(measurementDate: string): Promise<Progress[]> {
      const { data, error } = await client
        .from('progress')
        .select('*')
        .eq('measurement_date', measurementDate)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get progress by measurement date: ${error.message}`);
      }

      return (data || []) as Progress[];
    },

    async updateProgress(
      progressId: string,
      updates: Partial<Progress>
    ): Promise<Progress> {
      const { data: result, error } = await client
        .from('progress')
        .update(updates)
        .eq('progress_id', progressId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update progress: ${error.message}`);
      }

      return result as Progress;
    },
  };
}

export const progressRepository: IProgressRepository = createProgressRepository(supabase);

export const createProgress = (
  data: Omit<Progress, 'progress_id' | 'created_at'> & {
    progress_id?: string;
    created_at?: string;
  }
) => progressRepository.createProgress(data);

export const getProgressById = (progressId: string) =>
  progressRepository.getProgressById(progressId);

export const getProgressByActivity = (activityId: string) =>
  progressRepository.getProgressByActivity(activityId);

export const getProgressBySiteDiary = (siteDiaryId: string) =>
  progressRepository.getProgressBySiteDiary(siteDiaryId);

export const getProgressByMeasurementDate = (measurementDate: string) =>
  progressRepository.getProgressByMeasurementDate(measurementDate);

export const updateProgress = (
  progressId: string,
  updates: Partial<Progress>
) => progressRepository.updateProgress(progressId, updates);
