import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class MreEngineError extends BaseAppError {
  public readonly errorCode = 'MRE_ENGINE_ERROR';
  public readonly httpStatus = 500;

  constructor(message: string = 'Material Recommendation Engine Error', options?: ErrorOptions) {
    super(message, options);
  }
}

export class NoMaterialRecommendationFoundError extends BaseAppError {
  public readonly errorCode = 'NO_MATERIAL_RECOMMENDATION_FOUND';
  public readonly httpStatus = 404;

  constructor(
    message: string = 'No material recommendation found across all resolution priorities',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class InvalidMaterialContextError extends BaseAppError {
  public readonly errorCode = 'INVALID_MATERIAL_CONTEXT';
  public readonly httpStatus = 400;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
