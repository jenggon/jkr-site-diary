import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { MaterialResolutionContext, MaterialResolution } from '@/types/mre';
import { IRecommendationEngine } from '@/types/recommendationEngine';

export interface IMaterialEngineService
  extends IRecommendationEngine<MaterialResolutionContext, MaterialResolution, BaseAppError> {
  resolveMaterialRecommendation(
    ctx: MaterialResolutionContext
  ): Promise<Result<MaterialResolution, BaseAppError>>;
}
