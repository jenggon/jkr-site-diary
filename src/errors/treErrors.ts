import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class TreEngineError extends BaseAppError {
  public readonly errorCode = 'TRE_ENGINE_ERROR';
  public readonly httpStatus = 500;

  constructor(message: string = 'TRE resolution failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class NoTradeRecommendationFoundError extends BaseAppError {
  public readonly errorCode = 'NO_TRADE_RECOMMENDATION_FOUND';
  public readonly httpStatus = 404;

  constructor(
    message: string = 'Unable to resolve trade recommendation across all priorities',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}
