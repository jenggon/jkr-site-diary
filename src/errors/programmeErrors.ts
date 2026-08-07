import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class ProgrammeNotFoundError extends BaseAppError {
  public readonly errorCode = 'PROGRAMME_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor(message: string = 'Programme not found', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ProgrammeAlreadyExistsError extends BaseAppError {
  public readonly errorCode = 'PROGRAMME_ALREADY_EXISTS';
  public readonly httpStatus = 409;

  constructor(message: string = 'Programme code already exists', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ProgrammeArchivedError extends BaseAppError {
  public readonly errorCode = 'PROGRAMME_ARCHIVED';
  public readonly httpStatus = 400;

  constructor(message: string = 'Cannot perform operation on an archived programme', options?: ErrorOptions) {
    super(message, options);
  }
}

export class InvalidProgrammeStateError extends BaseAppError {
  public readonly errorCode = 'INVALID_PROGRAMME_STATE';
  public readonly httpStatus = 422;

  constructor(message: string = 'Invalid programme state transition', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ProgrammeLockedError extends BaseAppError {
  public readonly errorCode = 'PROGRAMME_LOCKED';
  public readonly httpStatus = 423;

  constructor(message: string = 'Programme is locked for editing', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ProgrammeValidationError extends BaseAppError {
  public readonly errorCode = 'PROGRAMME_VALIDATION_FAILED';
  public readonly httpStatus = 400;

  constructor(message: string = 'Programme validation failed', options?: ErrorOptions) {
    super(message, options);
  }
}
