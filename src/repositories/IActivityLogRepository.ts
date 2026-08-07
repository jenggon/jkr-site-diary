import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';

export interface ActivityLogEntry {
  readonly logId: string;
  readonly activityId: string;
  readonly siteDiaryId: string;
  readonly eventType: 'NEW' | 'UPDATE';
  readonly snapshotData: Record<string, unknown>;
  readonly loggedAt: string;
  readonly loggedBy: string;
}

export interface IActivityLogRepository {
  appendLog(entry: ActivityLogEntry): Promise<Result<ActivityLogEntry, BaseAppError>>;
  findLogsByActivityId(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>>;
}
