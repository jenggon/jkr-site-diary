import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class ActivityNotFoundError extends BaseAppError {
  public readonly errorCode = 'ACTIVITY_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor(message: string = 'Activity not found', options?: ErrorOptions) {
    super(message, options);
  }
}

export class InvalidActivityStateError extends BaseAppError {
  public readonly errorCode = 'INVALID_ACTIVITY_STATE';
  public readonly httpStatus = 400;

  constructor(message: string = 'Invalid activity state transition', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ActivityValidationError extends BaseAppError {
  public readonly errorCode = 'ACTIVITY_VALIDATION_ERROR';
  public readonly httpStatus = 400;

  constructor(message: string = 'Activity validation failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ActivityLockedError extends BaseAppError {
  public readonly errorCode = 'ACTIVITY_LOCKED';
  public readonly httpStatus = 423;

  constructor(message: string = 'Activity is locked for editing', options?: ErrorOptions) {
    super(message, options);
  }
}
