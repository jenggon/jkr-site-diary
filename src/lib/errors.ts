export interface ErrorMetadata {
  readonly [key: string]: unknown;
}

export interface ErrorOptions {
  readonly cause?: Error | unknown;
  readonly metadata?: ErrorMetadata;
}

export abstract class BaseAppError extends Error {
  public abstract readonly errorCode: string;
  public abstract readonly httpStatus: number;
  public readonly metadata?: ErrorMetadata | undefined;
  public override readonly cause?: Error | unknown;

  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    if (options?.metadata !== undefined) {
      this.metadata = options.metadata;
    }
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends BaseAppError {
  public readonly errorCode = 'VALIDATION_ERROR';
  public readonly httpStatus = 400;

  constructor(message: string = 'Validation failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class AuthenticationError extends BaseAppError {
  public readonly errorCode = 'AUTHENTICATION_ERROR';
  public readonly httpStatus = 401;

  constructor(message: string = 'Authentication required', options?: ErrorOptions) {
    super(message, options);
  }
}

export class AuthorizationError extends BaseAppError {
  public readonly errorCode = 'AUTHORIZATION_ERROR';
  public readonly httpStatus = 403;

  constructor(message: string = 'Access denied', options?: ErrorOptions) {
    super(message, options);
  }
}

export class NotFoundError extends BaseAppError {
  public readonly errorCode = 'NOT_FOUND_ERROR';
  public readonly httpStatus = 404;

  constructor(message: string = 'Resource not found', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ConflictError extends BaseAppError {
  public readonly errorCode = 'CONFLICT_ERROR';
  public readonly httpStatus = 409;

  constructor(message: string = 'Resource conflict', options?: ErrorOptions) {
    super(message, options);
  }
}

export class InfrastructureError extends BaseAppError {
  public readonly errorCode = 'INFRASTRUCTURE_ERROR';
  public readonly httpStatus = 500;

  constructor(message: string = 'Infrastructure error occurred', options?: ErrorOptions) {
    super(message, options);
  }
}

export class UnknownError extends BaseAppError {
  public readonly errorCode = 'UNKNOWN_ERROR';
  public readonly httpStatus = 500;

  constructor(message: string = 'An unknown error occurred', options?: ErrorOptions) {
    super(message, options);
  }
}
