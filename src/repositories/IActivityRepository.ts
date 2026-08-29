import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { Activity, ActivityStatus } from '@/types/activity';

export interface IActivityRepository {
  findById(activityId: string): Promise<Result<Activity | null, BaseAppError>>;
  findByRevisionId(revisionId: string): Promise<Result<Activity[], BaseAppError>>;
  findByTaskId(taskId: string): Promise<Result<Activity[], BaseAppError>>;
  findOpenActivitiesByProgramme(programmeId: string, revisionId?: string): Promise<Result<Activity[], BaseAppError>>;
  create(activity: Activity): Promise<Result<Activity, BaseAppError>>;
  update(activity: Activity): Promise<Result<Activity, BaseAppError>>;
  updateStatus(activityId: string, status: ActivityStatus, actorId: string): Promise<Result<Activity, BaseAppError>>;
}
