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
import { SiteDiaryStaleEditError, SiteDiarySealedError } from '@/errors/siteDiaryErrors';
import { ProgrammeNotFoundError, ProgrammeArchivedError, ProgrammeLockedError, ProgrammeValidationError } from '@/errors/programmeErrors';

export class ResidualAtomicRepository {
  private readonly programmeMapper = new ProgrammeRowMapper();
  public constructor(private readonly client: SupabaseClient) {}

  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error?.code === 'PT409') {
      if (error.message === 'F24_SITE_DIARY_SEALED') {
        throw new SiteDiarySealedError('Site diary is sealed by an active approval and cannot be modified');
      }
      throw new SiteDiaryStaleEditError('Site diary was modified by another user');
    }
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
    return this.rpc('f1_create_site_diary_full_atomic', {
      p_payload: payload,
      p_actor_id: actorId,
      p_site_diary_id: generateUuid(),
      p_log_id: generateUuid(),
      p_audit_id: generateUuid(),
    });
  }

  updateSiteDiary(
    siteDiaryId: string,
    payload: Record<string, unknown>,
    actorId: string,
    expectedLastModifiedAt: string
  ): Promise<SiteDiary> {
    return this.rpc('f1_update_site_diary_full_atomic', {
      p_site_diary_id: siteDiaryId,
      p_payload: payload,
      p_actor_id: actorId,
      p_log_id: generateUuid(),
      p_audit_id: generateUuid(),
      p_expected_last_modified_at: expectedLastModifiedAt,
    });
  }

  archiveProgramme(programmeId: string, actorId: string): Promise<Programme> {
    return this.rpc('a27_archive_programme', { p_programme_id: programmeId, p_actor_id: actorId });
  }

  async updateProgramme(programmeId: string, payload: Record<string, unknown>, actorId: string): Promise<Programme> {
    const { data, error } = await this.client.rpc('c06_update_programme_atomic', {
      p_programme_id: programmeId,
      p_payload: payload,
      p_actor_id: actorId,
      p_audit_id: generateUuid()
    });

    if (error) {
      if (error.code === 'PT403' || error.code === 'PT404') {
        throw new ProgrammeNotFoundError('Programme not found');
      }
      if (error.code === 'PT409') {
        if (error.message === 'C06_PROGRAMME_ARCHIVED') {
          throw new ProgrammeArchivedError('Cannot update archived programme');
        }
        if (error.message === 'C06_PROGRAMME_LOCKED') {
          throw new ProgrammeLockedError('Cannot update locked programme');
        }
      }
      if (error.code === 'PT400') {
         throw new ProgrammeValidationError(`Programme update failed: ${error.message}`);
      }
      throw new Error('Programme update failed'); // safe generic message for all other db errors
    }

    return this.programmeMapper.toDomain(data as ProgrammeRow);
  }

  updateTask(taskId: string, payload: Record<string, unknown>, actorId: string): Promise<Task> {
    return this.rpc('a27_update_task', { p_task_id: taskId, p_payload: payload, p_actor_id: actorId });
  }
}
