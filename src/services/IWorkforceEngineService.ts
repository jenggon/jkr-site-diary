import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { IRecommendationEngine } from '@/types/recommendationEngine';
import { WorkforceResolutionContext, WorkforceResolution } from '@/types/wre';

export interface IWorkforceEngineService
  extends IRecommendationEngine<WorkforceResolutionContext, WorkforceResolution, BaseAppError> {
  resolveWorkforceRecommendation(
    ctx: WorkforceResolutionContext
  ): Promise<Result<WorkforceResolution, BaseAppError>>;
}
