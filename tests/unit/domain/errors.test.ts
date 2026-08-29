import { describe, it, expect } from 'vitest';
import {
  ProgrammeNotFoundError,
  ProgrammeAlreadyExistsError,
  ProgrammeArchivedError,
  InvalidProgrammeStateError,
  ProgrammeLockedError,
  ProgrammeValidationError,
} from '@/errors/programmeErrors';

describe('Programme Error Catalogue', () => {
  it('should create ProgrammeNotFoundError with correct status and error code', () => {
    const err = new ProgrammeNotFoundError();
    expect(err.errorCode).toBe('PROGRAMME_NOT_FOUND');
    expect(err.httpStatus).toBe(404);
  });

  it('should create ProgrammeAlreadyExistsError correctly', () => {
    const err = new ProgrammeAlreadyExistsError();
    expect(err.errorCode).toBe('PROGRAMME_ALREADY_EXISTS');
    expect(err.httpStatus).toBe(409);
  });

  it('should create ProgrammeArchivedError correctly', () => {
    const err = new ProgrammeArchivedError();
    expect(err.errorCode).toBe('PROGRAMME_ARCHIVED');
    expect(err.httpStatus).toBe(400);
  });

  it('should create InvalidProgrammeStateError correctly', () => {
    const err = new InvalidProgrammeStateError();
    expect(err.errorCode).toBe('INVALID_PROGRAMME_STATE');
    expect(err.httpStatus).toBe(422);
  });

  it('should create ProgrammeLockedError correctly', () => {
    const err = new ProgrammeLockedError();
    expect(err.errorCode).toBe('PROGRAMME_LOCKED');
    expect(err.httpStatus).toBe(423);
  });

  it('should create ProgrammeValidationError correctly', () => {
    const err = new ProgrammeValidationError();
    expect(err.errorCode).toBe('PROGRAMME_VALIDATION_FAILED');
    expect(err.httpStatus).toBe(400);
  });
});
