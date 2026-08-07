import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { ActivityLogEntry } from '@/types/openActivity';

export type { ActivityLogEntry };

export interface IActivityLogRepository {
  appendLog(entry: ActivityLogEntry): Promise<Result<ActivityLogEntry, BaseAppError>>;
  findLogsByActivityId(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>>;
}
