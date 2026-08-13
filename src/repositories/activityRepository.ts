import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Activity, ActivityStatus, ActivityWeather } from '@/types/activity';
import { ActivityNotFoundError } from '@/errors/activityErrors';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { IActivityRepository } from './IActivityRepository';

export interface ActivityRow {
  readonly activity_id: string;
  readonly programme_id: string;
  readonly revision_id: string;
  readonly task_id: string;
  readonly activity_uid: string;
  readonly ahi: string | null;
  readonly ahi_display_name: string | null;
  readonly subtask: string;
  readonly subtask_display_name: string | null;
  readonly activity_date: string;
  readonly actual_start_date: string | null;
  readonly completed_date: string | null;
  readonly status: ActivityStatus;
  readonly weather: ActivityWeather | null;
  readonly notes: string;
  readonly submitted_by: string;
  readonly created_at: string;
  readonly updated_at: string | null;
}

export class ActivityRepository implements IActivityRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter()) {
    this.adapter = adapter;
  }

  private mapRowToDomain(row: ActivityRow): Activity {
    return {
      activity_id: row.activity_id,
      programme_id: row.programme_id,
      revision_id: row.revision_id,
      task_id: row.task_id,
      activity_uid: row.activity_uid,
      ahi: row.ahi,
      ahi_display_name: row.ahi_display_name,
      subtask: row.subtask,
      subtask_display_name: row.subtask_display_name,
      activity_date: row.activity_date,
      actual_start_date: row.actual_start_date,
      completed_date: row.completed_date,
      status: row.status,
      weather: row.weather,
      notes: row.notes,
      submitted_by: row.submitted_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapDomainToRow(activity: Activity): Record<string, unknown> {
    return {
      activity_id: activity.activity_id,
      programme_id: activity.programme_id,
      revision_id: activity.revision_id,
      task_id: activity.task_id,
      activity_uid: activity.activity_uid,
      ahi: activity.ahi,
      ahi_display_name: activity.ahi_display_name,
      subtask: activity.subtask,
      subtask_display_name: activity.subtask_display_name,
      activity_date: activity.activity_date,
      actual_start_date: activity.actual_start_date,
      completed_date: activity.completed_date,
      status: activity.status,
      weather: activity.weather,
      notes: activity.notes,
      submitted_by: activity.submitted_by,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
    };
  }

  public async findById(activityId: string): Promise<Result<Activity | null, BaseAppError>> {
    const res = await this.adapter.selectOne<ActivityRow>('activity', { activity_id: activityId });
    if (isFailure(res)) return Failure(res.error);
    if (!res.value) return Success(null);
    return Success(this.mapRowToDomain(res.value));
  }

  public async findByRevisionId(revisionId: string): Promise<Result<Activity[], BaseAppError>> {
    const res = await this.adapter.selectMany<ActivityRow>('activity', { revision_id: revisionId });
    if (isFailure(res)) return Failure(res.error);
    return Success(res.value.map((r) => this.mapRowToDomain(r)));
  }

  public async findByTaskId(taskId: string): Promise<Result<Activity[], BaseAppError>> {
    const res = await this.adapter.selectMany<ActivityRow>('activity', { task_id: taskId });
    if (isFailure(res)) return Failure(res.error);
    return Success(res.value.map((r) => this.mapRowToDomain(r)));
  }

  public async findOpenActivitiesByProgramme(programmeId: string): Promise<Result<Activity[], BaseAppError>> {
    const res = await this.adapter.selectMany<ActivityRow>('activity', {
      programme_id: programmeId,
      status: [ActivityStatus.New, ActivityStatus.InProgress]
    });
    if (isFailure(res)) return Failure(res.error);
    return Success(res.value.map((r) => this.mapRowToDomain(r)));
  }

  public async create(activity: Activity): Promise<Result<Activity, BaseAppError>> {
    const row = this.mapDomainToRow(activity);
    const res = await this.adapter.insert<ActivityRow>('activity', row);
    if (isFailure(res)) return Failure(res.error);
    return Success(this.mapRowToDomain(res.value));
  }

  public async update(activity: Activity): Promise<Result<Activity, BaseAppError>> {
    const row = this.mapDomainToRow(activity);
    const res = await this.adapter.update<ActivityRow>('activity', { activity_id: activity.activity_id }, row);
    if (isFailure(res)) return Failure(res.error);
    return Success(this.mapRowToDomain(res.value));
  }

  public async updateStatus(
    activityId: string,
    status: ActivityStatus,
    _actorId: string
  ): Promise<Result<Activity, BaseAppError>> {
    const existingRes = await this.findById(activityId);
    if (isFailure(existingRes)) return Failure(existingRes.error);
    if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));

    const updated: Activity = {
      ...existingRes.value,
      status,
      updated_at: new Date().toISOString(), // Fallback if adapter doesn't auto-set
    };

    return this.update(updated);
  }
}
