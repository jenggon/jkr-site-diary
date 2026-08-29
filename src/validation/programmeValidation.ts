import { z } from 'zod';
import { isValidUuid } from '@/lib/uuid';
import { isValidIso8601 } from '@/lib/clock';
import { invariant } from '@/lib/invariant';
import { ProgrammeValidationError } from '@/errors/programmeErrors';

const RESERVED_CODES = new Set(['SYSTEM', 'ADMIN', 'NULL', 'TEMP']);

export const programmeCodeSchema = z
  .string()
  .min(3, 'programmeCode must be at least 3 characters')
  .max(50, 'programmeCode must not exceed 50 characters')
  .regex(/^[A-Z0-9\/_-]+$/, 'programmeCode must contain only uppercase letters, numbers, slash, underscore, or hyphen')
  .refine((val) => val === val.trim(), 'programmeCode must not contain leading or trailing whitespace')
  .refine((val) => !RESERVED_CODES.has(val.toUpperCase()), 'programmeCode contains a reserved keyword');

export const programmeNameSchema = z
  .string()
  .min(3, 'programmeName must be at least 3 characters')
  .max(100, 'programmeName must not exceed 100 characters')
  .refine((val) => val === val.trim(), 'programmeName must not contain leading or trailing whitespace');

export function validateProgrammeCode(code: string): string {
  const parseResult = programmeCodeSchema.safeParse(code);
  invariant(
    parseResult.success,
    parseResult.success ? '' : parseResult.error.errors[0]?.message ?? 'Invalid programmeCode',
    () => new ProgrammeValidationError(parseResult.success ? '' : parseResult.error.errors[0]?.message)
  );
  return parseResult.data;
}

export function validateProgrammeName(name: string): string {
  const parseResult = programmeNameSchema.safeParse(name);
  invariant(
    parseResult.success,
    parseResult.success ? '' : parseResult.error.errors[0]?.message ?? 'Invalid programmeName',
    () => new ProgrammeValidationError(parseResult.success ? '' : parseResult.error.errors[0]?.message)
  );
  return parseResult.data;
}

export function validateProgrammeUuid(id: string, fieldName: string = 'programmeId'): void {
  invariant(
    isValidUuid(id),
    `Invalid UUID format for ${fieldName}`,
    () => new ProgrammeValidationError(`Invalid UUID format for ${fieldName}`)
  );
}

export function validateDateHierarchy(
  startDate?: string,
  completionDate?: string,
  defectLiabilityEnd?: string
): void {
  if (startDate) {
    invariant(isValidIso8601(startDate), 'Invalid start date format', () => new ProgrammeValidationError('Invalid start date format'));
  }
  if (completionDate) {
    invariant(isValidIso8601(completionDate), 'Invalid completion date format', () => new ProgrammeValidationError('Invalid completion date format'));
  }
  if (defectLiabilityEnd) {
    invariant(isValidIso8601(defectLiabilityEnd), 'Invalid defect liability end date format', () => new ProgrammeValidationError('Invalid defect liability end date format'));
  }

  if (startDate && completionDate) {
    const start = new Date(startDate).getTime();
    const completion = new Date(completionDate).getTime();
    invariant(
      completion >= start,
      'Contract completion date must be on or after contract start date',
      () => new ProgrammeValidationError('Contract completion date must be on or after contract start date')
    );
  }

  if (completionDate && defectLiabilityEnd) {
    const completion = new Date(completionDate).getTime();
    const defect = new Date(defectLiabilityEnd).getTime();
    invariant(
      defect >= completion,
      'Defect liability end date must be on or after contract completion date',
      () => new ProgrammeValidationError('Defect liability end date must be on or after contract completion date')
    );
  }
}
