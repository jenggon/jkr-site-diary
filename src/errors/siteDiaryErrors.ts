import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class SiteDiaryValidationError extends BaseAppError {
  public readonly errorCode = 'SITE_DIARY_VALIDATION_ERROR';
  public readonly httpStatus = 400;

  constructor(message: string = 'Site diary validation failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class SiteDiaryNotFoundError extends BaseAppError {
  public readonly errorCode = 'SITE_DIARY_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor(message: string = 'Site diary record not found', options?: ErrorOptions) {
    super(message, options);
  }
}

export class SiteDiaryStaleEditError extends BaseAppError {
  public readonly errorCode = 'SITE_DIARY_STALE_EDIT';
  public readonly httpStatus = 409;

  constructor(message: string = 'Site diary was modified by another user', options?: ErrorOptions) {
    super(message, options);
  }
}

export class SiteDiaryRevisionNotApprovedError extends BaseAppError {
  public readonly errorCode = 'SITE_DIARY_REVISION_NOT_APPROVED';
  public readonly httpStatus = 400;

  constructor(message: string = 'Cannot create or edit Site Diary under a non-Approved revision', options?: ErrorOptions) {
    super(message, options);
  }
}

export class InvalidSiteDiaryStateError extends BaseAppError {
  public readonly errorCode = 'INVALID_SITE_DIARY_STATE';
  public readonly httpStatus = 400;

  constructor(message: string = 'Invalid Site Diary state transition', options?: ErrorOptions) {
    super(message, options);
  }
}
