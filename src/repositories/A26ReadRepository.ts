import { getSupabaseServerClient } from '@/lib/supabase';
import { Activity } from '@/types/activity';
import { SiteDiary } from '@/types/siteDiary';
import { Task } from '@/types/task';
import { A26ProgrammeReadModel, IA26ReadRepository } from './IA26ReadRepository';

type QueryError = { message: string } | null;

function assertQuerySucceeded(error: QueryError, operation: string): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}

export class A26ReadRepository implements IA26ReadRepository {
  public async findProgramme(programmeId: string): Promise<A26ProgrammeReadModel | null> {
    const { data, error } = await getSupabaseServerClient()
      .from('programme').select('programme_id, current_revision_id')
      .eq('programme_id', programmeId).maybeSingle();
    assertQuerySucceeded(error, 'Failed to read programme');
    if (!data?.current_revision_id) return null;
    return { programmeId: data.programme_id, currentRevisionId: data.current_revision_id };
  }

  public async findTasksByRevision(revisionId: string): Promise<Task[]> {
    const { data, error } = await getSupabaseServerClient()
      .from('task').select('*').eq('revision_id', revisionId)
      .order('display_order', { ascending: true, nullsFirst: false });
    assertQuerySucceeded(error, 'Failed to read tasks');
    return (data ?? []) as Task[];
  }

  public async findSiteDiariesByDate(activityDate: string): Promise<SiteDiary[]> {
    const { data, error } = await getSupabaseServerClient()
      .from('site_diary').select('*').eq('activity_date', activityDate)
      .order('submitted_at', { ascending: false });
    assertQuerySucceeded(error, 'Failed to read daily reports');
    return (data ?? []) as SiteDiary[];
  }

  public async findActivitiesByIds(activityIds: string[]): Promise<Activity[]> {
    if (activityIds.length === 0) return [];
    const { data, error } = await getSupabaseServerClient()
      .from('activity').select('*').in('activity_id', activityIds);
    assertQuerySucceeded(error, 'Failed to read report activities');
    return (data ?? []) as Activity[];
  }
}
