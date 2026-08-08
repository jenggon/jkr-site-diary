import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class InvalidProgramKerjaContextError extends BaseAppError {
  public readonly errorCode = 'INVALID_PROGRAM_KERJA_CONTEXT';
  public readonly httpStatus = 400;

  constructor(message: string = 'Invalid Program Kerja context', options?: ErrorOptions) {
    super(message, options);
  }
}

export class ProgramKerjaBoundaryError extends BaseAppError {
  public readonly errorCode = 'PROGRAM_KERJA_BOUNDARY_ERROR';
  public readonly httpStatus = 422;

  constructor(message: string = 'Program Kerja boundary error', options?: ErrorOptions) {
    super(message, options);
  }
}
