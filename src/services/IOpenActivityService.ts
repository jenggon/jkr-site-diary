import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivity, ActivityLocation, TradeSelection } from '@/types/openActivity';
import { ActivityLogEntry } from '@/repositories/IActivityLogRepository';

export interface CreateActivityCommand {
  readonly siteDiaryId: string;
  readonly programmeId: string;
  readonly taskId?: string | undefined;
  readonly activityName: string;
  readonly location?: ActivityLocation | undefined;
  readonly tradeSelection?: TradeSelection | undefined;
  readonly workforceCount?: number | undefined;
  readonly createdBy: string;
}

export interface UpdateActivityCommand {
  readonly activityId: string;
  readonly activityName?: string | undefined;
  readonly location?: ActivityLocation | undefined;
  readonly tradeSelection?: TradeSelection | undefined;
  readonly workforceCount?: number | undefined;
  readonly updatedBy: string;
}

export interface IOpenActivityService {
  createActivity(cmd: CreateActivityCommand): Promise<Result<OpenActivity, BaseAppError>>;
  updateActivity(cmd: UpdateActivityCommand): Promise<Result<OpenActivity, BaseAppError>>;
  startActivity(activityId: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>>;
  suspendActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>>;
  completeActivity(activityId: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>>;
  cancelActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivity, BaseAppError>>;
  getActivitiesForDiary(siteDiaryId: string): Promise<Result<OpenActivity[], BaseAppError>>;
  getActivityHistory(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>>;
}
