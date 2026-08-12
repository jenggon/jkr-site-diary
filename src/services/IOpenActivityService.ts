import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivityDto } from '@/types/openActivity';
import { ActivityLogEntry } from '@/repositories/IActivityLogRepository';

export interface CreateActivityCommand {
  readonly siteDiaryId?: string; // Still accepted for routing or context, but ignored in Activity DB
  readonly programmeId: string;
  readonly revisionId: string;
  readonly taskId: string;
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
  startActivity(activityId: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  completeActivity(activityId: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  suspendActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  cancelActivity(activityId: string, reason: string, actorId: string): Promise<Result<OpenActivityDto, BaseAppError>>;
  
  // NOTE: getActivitiesForDiary is REMOVED because Activity does not own Site Diary.
  // Callers must use SiteDiaryService to fetch SiteDiaries by ID or Date.
  getActivityHistory(activityId: string): Promise<Result<ActivityLogEntry[], BaseAppError>>;
}
