import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class WreEngineError extends BaseAppError {
  public readonly errorCode = 'WRE_ENGINE_ERROR';
  public readonly httpStatus = 500;

  constructor(message: string = 'WRE workforce recommendation failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class NoWorkforceRecommendationFoundError extends BaseAppError {
  public readonly errorCode = 'NO_WORKFORCE_RECOMMENDATION_FOUND';
  public readonly httpStatus = 404;

  constructor(
    message: string = 'Unable to resolve workforce recommendation across all priorities',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class InvalidWorkforceContextError extends BaseAppError {
  public readonly errorCode = 'INVALID_WORKFORCE_CONTEXT';
  public readonly httpStatus = 400;

  constructor(message: string = 'Invalid context provided for workforce evaluation', options?: ErrorOptions) {
    super(message, options);
  }
}
