import { describe, it, expect } from 'vitest';
import {
  BaseAppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InfrastructureError,
  UnknownError,
} from '@/lib/errors';

describe('errors', () => {
  it('should instantiate ValidationError with correct status and code', () => {
    const err = new ValidationError('Invalid input', { metadata: { field: 'email' } });
    expect(err).toBeInstanceOf(BaseAppError);
    expect(err.message).toBe('Invalid input');
    expect(err.errorCode).toBe('VALIDATION_ERROR');
    expect(err.httpStatus).toBe(400);
    expect(err.metadata).toEqual({ field: 'email' });
  });

  it('should instantiate AuthenticationError correctly', () => {
    const err = new AuthenticationError();
    expect(err.errorCode).toBe('AUTHENTICATION_ERROR');
    expect(err.httpStatus).toBe(401);
  });

  it('should instantiate AuthorizationError correctly', () => {
    const err = new AuthorizationError();
    expect(err.errorCode).toBe('AUTHORIZATION_ERROR');
    expect(err.httpStatus).toBe(403);
  });

  it('should instantiate NotFoundError correctly', () => {
    const err = new NotFoundError();
    expect(err.errorCode).toBe('NOT_FOUND_ERROR');
    expect(err.httpStatus).toBe(404);
  });

  it('should instantiate ConflictError correctly', () => {
    const err = new ConflictError();
    expect(err.errorCode).toBe('CONFLICT_ERROR');
    expect(err.httpStatus).toBe(409);
  });

  it('should instantiate InfrastructureError with cause', () => {
    const cause = new Error('DB Connection Timeout');
    const err = new InfrastructureError('Database error', { cause });
    expect(err.errorCode).toBe('INFRASTRUCTURE_ERROR');
    expect(err.httpStatus).toBe(500);
    expect(err.cause).toBe(cause);
  });

  it('should instantiate UnknownError correctly', () => {
    const err = new UnknownError();
    expect(err.errorCode).toBe('UNKNOWN_ERROR');
    expect(err.httpStatus).toBe(500);
  });
});
