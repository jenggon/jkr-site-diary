import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivity, ActivityStatus, ActivityLocation, TradeSelection } from '@/types/openActivity';
import { ActivityNotFoundError } from '@/errors/activityErrors';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { IOpenActivityRepository } from './IOpenActivityRepository';

export interface OpenActivityRow {
  readonly id: string;
  readonly site_diary_id: string;
  readonly programme_id: string;
  readonly task_id?: string | null;
  readonly activity_name: string;
  readonly location?: Record<string, unknown> | null;
  readonly trade_info?: Record<string, unknown> | null;
  readonly workforce_count?: number | null;
  readonly status: ActivityStatus;
  readonly is_locked: boolean;
  readonly created_at: string;
  readonly created_by: string;
  readonly updated_at?: string | null;
  readonly updated_by?: string | null;
}

export class OpenActivityRepository implements IOpenActivityRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter()) {
    this.adapter = adapter;
  }

  private mapRowToDomain(row: OpenActivityRow): OpenActivity {
    return {
      activityId: row.id,
      siteDiaryId: row.site_diary_id,
      programmeId: row.programme_id,
      taskId: row.task_id ?? undefined,
      activityName: row.activity_name,
      location: (row.location as unknown as ActivityLocation) ?? undefined,
      tradeInfo: (row.trade_info as unknown as TradeSelection) ?? undefined,
      workforceCount: row.workforce_count ?? undefined,
      status: row.status,
      isLocked: row.is_locked,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at ?? undefined,
      updatedBy: row.updated_by ?? undefined,
    };
  }

  private mapDomainToRow(activity: OpenActivity): Record<string, unknown> {
    return {
      id: activity.activityId,
      site_diary_id: activity.siteDiaryId,
      programme_id: activity.programmeId,
      task_id: activity.taskId ?? null,
      activity_name: activity.activityName,
      location: activity.location ?? null,
      trade_info: activity.tradeInfo ?? null,
      workforce_count: activity.workforceCount ?? null,
      status: activity.status,
      is_locked: activity.isLocked,
      created_at: activity.createdAt,
      created_by: activity.createdBy,
      updated_at: activity.updatedAt ?? null,
      updated_by: activity.updatedBy ?? null,
    };
  }

  public async findById(activityId: string): Promise<Result<OpenActivity | null, BaseAppError>> {
    const res = await this.adapter.selectOne<OpenActivityRow>('site_diary', { id: activityId });
    if (isFailure(res)) return Failure(res.error);
    if (!res.value) return Success(null);
    return Success(this.mapRowToDomain(res.value));
  }

  public async findBySiteDiaryId(siteDiaryId: string): Promise<Result<OpenActivity[], BaseAppError>> {
    const res = await this.adapter.selectMany<OpenActivityRow>('site_diary', { site_diary_id: siteDiaryId });
    if (isFailure(res)) return Failure(res.error);
    return Success(res.value.map((r) => this.mapRowToDomain(r)));
  }

  public async create(activity: OpenActivity): Promise<Result<OpenActivity, BaseAppError>> {
    const row = this.mapDomainToRow(activity);
    const res = await this.adapter.insert<OpenActivityRow>('site_diary', row);
    if (isFailure(res)) return Failure(res.error);
    return Success(this.mapRowToDomain(res.value));
  }

  public async update(activity: OpenActivity): Promise<Result<OpenActivity, BaseAppError>> {
    const row = this.mapDomainToRow(activity);
    const res = await this.adapter.update<OpenActivityRow>('site_diary', { id: activity.activityId }, row);
    if (isFailure(res)) return Failure(res.error);
    return Success(this.mapRowToDomain(res.value));
  }

  public async updateStatus(
    activityId: string,
    status: ActivityStatus,
    actorId: string
  ): Promise<Result<OpenActivity, BaseAppError>> {
    const existingRes = await this.findById(activityId);
    if (isFailure(existingRes)) return Failure(existingRes.error);
    if (!existingRes.value) return Failure(new ActivityNotFoundError('Activity not found'));

    const updated: OpenActivity = {
      ...existingRes.value,
      status,
      updatedBy: actorId,
    };

    return this.update(updated);
  }
}
