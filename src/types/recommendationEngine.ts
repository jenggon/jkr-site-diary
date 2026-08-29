import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';

export interface IRecommendationEngine<TContext, TResult, TError extends BaseAppError = BaseAppError> {
  recommend(ctx: TContext): Promise<Result<TResult, TError>>;
}

export interface RecommendationMetadata {
  readonly engineVersion: string;
  readonly generatedAt: string;        // ISO 8601 UTC timestamp
  readonly executionDurationMs: number;
  readonly platformVersion: string;
}
