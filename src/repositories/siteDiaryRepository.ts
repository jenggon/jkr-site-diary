import { SupabaseClient } from '@supabase/supabase-js';
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

export interface ISiteDiaryRepository {
  createSiteDiary(
    data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & {
      site_diary_id?: string;
      submitted_at?: string;
    }
  ): Promise<SiteDiary>;
  getSiteDiaryById(siteDiaryId: string): Promise<SiteDiary | null>;
  getSiteDiaryByActivityAndDate(
    activityId: string,
    activityDate: string
  ): Promise<SiteDiary | null>;
  getSiteDiariesByActivity(activityId: string): Promise<SiteDiary[]>;
  getLatestSiteDiaryByActivity(activityId: string): Promise<SiteDiary | null>;
  getSiteDiariesByRevision(revisionId: string): Promise<SiteDiary[]>;
  updateSiteDiary(
    siteDiaryId: string,
    updates: Partial<SiteDiary>
  ): Promise<SiteDiary>;
}

export type SiteDiaryRepository = ISiteDiaryRepository;

/**
 * Factory for creating client-bound Site Diary Repository instances.
 * Enables request-scoped authenticated clients to be injected for RLS evaluation.
 */
export function createSiteDiaryRepository(client: SupabaseClient = supabase): ISiteDiaryRepository {
  return {
    async createSiteDiary(
      data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & {
        site_diary_id?: string;
        submitted_at?: string;
      }
    ): Promise<SiteDiary> {
      const { data: result, error } = await client
        .from('site_diary')
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create site diary: ${error.message}`);
      }

      return result as SiteDiary;
    },

    async getSiteDiaryById(siteDiaryId: string): Promise<SiteDiary | null> {
      const { data, error } = await client
        .from('site_diary')
        .select('*')
        .eq('site_diary_id', siteDiaryId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get site diary by ID: ${error.message}`);
      }

      return data as SiteDiary | null;
    },

    async getSiteDiaryByActivityAndDate(
      activityId: string,
      activityDate: string
    ): Promise<SiteDiary | null> {
      const { data, error } = await client
        .from('site_diary')
        .select('*')
        .eq('activity_id', activityId)
        .eq('activity_date', activityDate)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to get site diary by activity and date: ${error.message}`);
      }

      return data as SiteDiary | null;
    },

    async getSiteDiariesByActivity(activityId: string): Promise<SiteDiary[]> {
      const { data, error } = await client
        .from('site_diary')
        .select('*')
        .eq('activity_id', activityId)
        .order('activity_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get site diaries by activity: ${error.message}`);
      }

      return (data || []) as SiteDiary[];
    },

    async getSiteDiariesByRevision(revisionId: string): Promise<SiteDiary[]> {
      const { data, error } = await client
        .from('site_diary')
        .select('*')
        .eq('revision_id', revisionId)
        .order('activity_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get site diaries by revision: ${error.message}`);
      }

      return (data || []) as SiteDiary[];
    },

    async updateSiteDiary(
      siteDiaryId: string,
      updates: Partial<SiteDiary>
    ): Promise<SiteDiary> {
      const { data: result, error } = await client
        .from('site_diary')
        .update(updates)
        .eq('site_diary_id', siteDiaryId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update site diary: ${error.message}`);
      }

      return result as SiteDiary;
    },

    async getLatestSiteDiaryByActivity(activityId: string): Promise<SiteDiary | null> {
      const { data, error } = await client
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
    },
  };
}

export const siteDiaryRepository: ISiteDiaryRepository = createSiteDiaryRepository(supabase);

export const createSiteDiary = (
  data: Omit<SiteDiary, 'site_diary_id' | 'submitted_at'> & {
    site_diary_id?: string;
    submitted_at?: string;
  }
) => siteDiaryRepository.createSiteDiary(data);

export const getSiteDiaryById = (siteDiaryId: string) =>
  siteDiaryRepository.getSiteDiaryById(siteDiaryId);

export const getSiteDiaryByActivityAndDate = (
  activityId: string,
  activityDate: string
) => siteDiaryRepository.getSiteDiaryByActivityAndDate(activityId, activityDate);

export const getSiteDiariesByActivity = (activityId: string) =>
  siteDiaryRepository.getSiteDiariesByActivity(activityId);

export const getSiteDiariesByRevision = (revisionId: string) =>
  siteDiaryRepository.getSiteDiariesByRevision(revisionId);

export const updateSiteDiary = (
  siteDiaryId: string,
  updates: Partial<SiteDiary>
) => siteDiaryRepository.updateSiteDiary(siteDiaryId, updates);

export const getLatestSiteDiaryByActivity = (activityId: string) =>
  siteDiaryRepository.getLatestSiteDiaryByActivity(activityId);
