import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class ApprovalValidationError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_VALIDATION_ERROR';
  public readonly httpStatus = 400;

  constructor(message: string = 'Approval validation failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ApprovalNotFoundError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_NOT_FOUND';
  public readonly httpStatus = 404;

  constructor(message: string = 'Approval record not found', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ApprovalStaleSiteDiaryError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_STALE_SITE_DIARY';
  public readonly httpStatus = 409;

  constructor(message: string = 'Site diary has been modified since it was loaded', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ApprovalContextChangedError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_CONTEXT_CHANGED';
  public readonly httpStatus = 409;

  constructor(message: string = 'Approval context has changed concurrently', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ApprovalTerminalStateError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_TERMINAL_STATE';
  public readonly httpStatus = 409;

  constructor(message: string = 'Approval is already in a terminal state', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ApprovalPendingExistsError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_PENDING_EXISTS';
  public readonly httpStatus = 409;

  constructor(
    message: string = 'A Pending approval already exists for this Site Diary',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class ApprovalApprovedExistsError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_APPROVED_EXISTS';
  public readonly httpStatus = 409;

  constructor(
    message: string = 'This Site Diary already has an Approved approval',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class ApprovalReturnedRequiresResubmissionError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_RETURNED_REQUIRES_RESUBMISSION';
  public readonly httpStatus = 409;

  constructor(
    message: string = 'The Returned approval must be resubmitted using its existing approval ID',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}

export class ApprovalTransitionConflictError extends BaseAppError {
  public readonly errorCode = 'APPROVAL_TRANSITION_CONFLICT';
  public readonly httpStatus = 409;

  constructor(
    message: string = 'The requested Approval transition is not valid from its current state',
    options?: ErrorOptions
  ) {
    super(message, options);
  }
}
