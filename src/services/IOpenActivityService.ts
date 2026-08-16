import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivityDto } from '@/types/openActivity';
import { ActivityLogEntry } from '@/repositories/IActivityLogRepository';
import { ActivitySourceType } from '@/types/activity';

export interface CreateActivityCommand {
  readonly siteDiaryId?: string;
  readonly programmeId: string;
  readonly revisionId: string;
  readonly sourceType?: ActivitySourceType;
  readonly taskId?: string | undefined;
  readonly voItemId?: string | undefined;
  readonly activityName: string;
  readonly createdBy: string;
}

export interface UpdateActivityCommand {
  readonly activityId: string;
  readonly activityName?: string | undefined;
  readonly updatedBy: string;
}

export interface IOpenActivityService {
  createActivity(cmd: CreateActivityCommand): Promise<Result<OpenActivityDto, BaseAppError>>;
  updateActivity(cmd: UpdateActivityCommand): Promise<Result<OpenActivityDto, BaseAppError>>;
  getOpenActivities(programmeId: string): Promise<Result<OpenActivityDto[], BaseAppError>>;
  startActivity(activityId: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  completeActivity(activityId: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  suspendActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  cancelActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  getActivityHistory(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>>;
}
