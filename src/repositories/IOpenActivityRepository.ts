import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { OpenActivity, ActivityStatus } from '@/types/openActivity';

export interface IOpenActivityRepository {
  findById(activityId: string): Promise<Result<OpenActivity | null, BaseAppError>>;
  findBySiteDiaryId(siteDiaryId: string): Promise<Result<OpenActivity[], BaseAppError>>;
  findByRevisionId(revisionId: string): Promise<Result<OpenActivity[], BaseAppError>>;
  create(activity: OpenActivity): Promise<Result<OpenActivity, BaseAppError>>;
  update(activity: OpenActivity): Promise<Result<OpenActivity, BaseAppError>>;
  updateStatus(activityId: string, status: ActivityStatus, actorId: string): Promise<Result<OpenActivity, BaseAppError>>;
}
