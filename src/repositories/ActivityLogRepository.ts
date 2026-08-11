import { Result, Success, Failure, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { IDatabaseAdapter } from '@/repositories/adapters/IDatabaseAdapter';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { IActivityLogRepository, ActivityLogEntry } from './IActivityLogRepository';

export interface ActivityLogRow {
  readonly log_id: string;
  readonly activity_id: string;
  readonly event_type: 'NEW' | 'UPDATE';
  readonly snapshot_data: Record<string, unknown>;
  readonly logged_at: string;
  readonly logged_by: string;
}

export class ActivityLogRepository implements IActivityLogRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter = new SupabaseDatabaseAdapter()) {
    this.adapter = adapter;
  }

  private mapRowToEntry(row: ActivityLogRow): ActivityLogEntry {
    return {
      logId: row.log_id,
      activityId: row.activity_id,
      eventType: row.event_type,
      snapshotData: row.snapshot_data,
      loggedAt: row.logged_at,
      loggedBy: row.logged_by,
    };
  }

  public async appendLog(entry: ActivityLogEntry): Promise<Result<ActivityLogEntry, BaseAppError>> {
    const row: Record<string, unknown> = {
      log_id: entry.logId,
      activity_id: entry.activityId,
      event_type: entry.eventType,
      snapshot_data: entry.snapshotData,
      logged_at: entry.loggedAt,
      logged_by: entry.loggedBy,
    };

    const res = await this.adapter.insert<ActivityLogRow>('site_diary_logs', row);
    if (isFailure(res)) return Failure(res.error);
    return Success(this.mapRowToEntry(res.value));
  }

  public async findLogsByActivityId(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>> {
    const res = await this.adapter.selectMany<ActivityLogRow>('site_diary_logs', { activity_id: activityId });
    if (isFailure(res)) return Failure(res.error);
    return Success(res.value.map((r) => this.mapRowToEntry(r)));
  }
}
