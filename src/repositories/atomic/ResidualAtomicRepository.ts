import { SupabaseClient } from '@supabase/supabase-js';
import { generateUuid } from '@/lib/uuid';
import { Programme } from '@/types/programme';
import { ProgrammeRevision } from '@/types/programmeRevision';
import { Task } from '@/types/task';
import { Activity } from '@/types/activity';
import { Workforce } from '@/types/workforce';
import { SiteDiary } from '@/types/siteDiary';
import { ProgrammeRowMapper } from '@/repositories/mappers/ProgrammeRowMapper';
import { ProgrammeRow, ProgrammeRevisionRow } from '@/repositories/types/programmeRow';

export class ResidualAtomicRepository {
  private readonly programmeMapper = new ProgrammeRowMapper();
  public constructor(private readonly client: SupabaseClient) {}

  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw new Error(`${name} failed: ${error.message}`);
    return data as T;
  }

  async createProgramme(payload: Record<string, unknown>, actorId: string, programmeId: string, revisionId: string): Promise<Programme> {
    const row = await this.rpc<ProgrammeRow>('a27_create_programme_atomic', { p_payload: payload, p_actor_id: actorId, p_programme_id: programmeId, p_revision_id: revisionId, p_audit_id: generateUuid() });
    return this.programmeMapper.toDomain(row);
  }

  async approveRevision(revisionId: string, actorId: string): Promise<ProgrammeRevision> {
    const row = await this.rpc<ProgrammeRevisionRow>('a27_approve_revision_atomic', { p_revision_id: revisionId, p_actor_id: actorId, p_audit_id: generateUuid() });
    return this.programmeMapper.toRevisionDomain(row, revisionId);
  }

  async ingestMsp(revision: Record<string, unknown>, tasks: Task[], actorId: string): Promise<ProgrammeRevision> {
    const row = await this.rpc<ProgrammeRevisionRow>('a27_ingest_msp_atomic', { p_revision: revision, p_tasks: tasks, p_actor_id: actorId, p_audit_id: generateUuid() });
    return this.programmeMapper.toRevisionDomain(row);
  }

  createActivity(payload: Record<string, unknown>, actorId: string, activityId: string): Promise<Activity> {
    return this.rpc('a27_create_activity_atomic', { p_payload: payload, p_actor_id: actorId, p_activity_id: activityId, p_log_id: generateUuid() });
  }

  updateActivity(activityId: string, payload: Record<string, unknown>, actorId: string): Promise<Activity> {
    return this.rpc('a27_update_activity_atomic', { p_activity_id: activityId, p_payload: payload, p_actor_id: actorId, p_log_id: generateUuid() });
  }

  transitionActivity(activityId: string, action: 'start' | 'complete', actorId: string): Promise<Activity> {
    return this.rpc(`a27_${action}_activity_atomic`, { p_activity_id: activityId, p_actor_id: actorId, p_log_id: generateUuid() });
  }

  createWorkforce(payload: Record<string, unknown>, actorId: string): Promise<Workforce> {
    return this.rpc('a27_create_workforce_atomic', { p_payload: payload, p_actor_id: actorId, p_workforce_id: generateUuid(), p_audit_id: generateUuid() });
  }

  updateWorkforce(workforceId: string, payload: Record<string, unknown>, actorId: string): Promise<Workforce> {
    return this.rpc('a27_update_workforce_atomic', { p_workforce_id: workforceId, p_payload: payload, p_actor_id: actorId, p_audit_id: generateUuid() });
  }

  createSiteDiary(payload: Record<string, unknown>, actorId: string): Promise<SiteDiary> {
    return this.rpc('f1_create_site_diary_with_workforce_atomic', {
      p_payload: payload,
      p_actor_id: actorId,
      p_site_diary_id: generateUuid(),
      p_log_id: generateUuid(),
      p_audit_id: generateUuid(),
    });
  }

  updateSiteDiary(siteDiaryId: string, payload: Record<string, unknown>, actorId: string): Promise<SiteDiary> {
    return this.rpc('a27_update_site_diary_atomic', { p_site_diary_id: siteDiaryId, p_payload: payload, p_actor_id: actorId, p_log_id: generateUuid(), p_audit_id: generateUuid() });
  }

  archiveProgramme(programmeId: string, actorId: string): Promise<Programme> {
    return this.rpc('a27_archive_programme', { p_programme_id: programmeId, p_actor_id: actorId });
  }

  updateTask(taskId: string, payload: Record<string, unknown>, actorId: string): Promise<Task> {
    return this.rpc('a27_update_task', { p_task_id: taskId, p_payload: payload, p_actor_id: actorId });
  }
}
