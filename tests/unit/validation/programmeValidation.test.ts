import { describe, it, expect } from 'vitest';
import {
  validateProgrammeCode,
  validateProgrammeName,
  validateProgrammeShortName,
  validateProgrammeUuid,
  validateDateHierarchy,
} from '@/validation/programmeValidation';
import { ProgrammeValidationError } from '@/errors/programmeErrors';

describe('Programme Validation Schemas & Matrix', () => {
  it('should validate valid programmeCode', () => {
    const code = 'JKR/PLS/2026/001';
    expect(validateProgrammeCode(code)).toBe(code);
  });

  it('should throw ProgrammeValidationError on invalid characters in programmeCode', () => {
    expect(() => validateProgrammeCode('JKR/PLS/2026/001!@#')).toThrow(ProgrammeValidationError);
  });

  it('should throw ProgrammeValidationError on reserved code keywords', () => {
    expect(() => validateProgrammeCode('SYSTEM')).toThrow(ProgrammeValidationError);
    expect(() => validateProgrammeCode('ADMIN')).toThrow(ProgrammeValidationError);
  });

  it('should throw ProgrammeValidationError on whitespace padding', () => {
    expect(() => validateProgrammeCode(' JKR/PLS/2026/001 ')).toThrow(ProgrammeValidationError);
  });

  it('should validate valid programmeName', () => {
    const name = 'Projek Pembinaan Jambatan Sungai Petani';
    expect(validateProgrammeName(name)).toBe(name);
  });

  it('should throw ProgrammeValidationError on short programmeName', () => {
    expect(() => validateProgrammeName('AB')).toThrow(ProgrammeValidationError);
  });

  it('locks project nickname to user-friendly 3-20 character identity', () => {
    expect(validateProgrammeShortName('FPTV UPSI')).toBe('FPTV UPSI');
    expect(validateProgrammeShortName('JALAN-B40')).toBe('JALAN-B40');
    expect(validateProgrammeShortName('Hosp Tapah')).toBe('Hosp Tapah');
  });

  it('rejects invalid or reserved project nicknames', () => {
    expect(() => validateProgrammeShortName('AB')).toThrow(ProgrammeValidationError);
    expect(() => validateProgrammeShortName('THIS PROJECT NAME IS TOO LONG')).toThrow(ProgrammeValidationError);
    expect(() => validateProgrammeShortName('FPTV_UPSI')).toThrow(ProgrammeValidationError);
    expect(() => validateProgrammeShortName(' FPTV UPSI')).toThrow(ProgrammeValidationError);
    expect(() => validateProgrammeShortName('FPTV  UPSI')).toThrow(ProgrammeValidationError);
    expect(() => validateProgrammeShortName('NGAMSOI')).toThrow(ProgrammeValidationError);
  });

  it('should validate valid UUID string', () => {
    expect(() => validateProgrammeUuid('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
  });

  it('should throw ProgrammeValidationError on invalid UUID format', () => {
    expect(() => validateProgrammeUuid('invalid-uuid-string')).toThrow(ProgrammeValidationError);
  });

  it('should validate correct date hierarchy sequence', () => {
    expect(() =>
      validateDateHierarchy('2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z', '2027-12-31T00:00:00.000Z')
    ).not.toThrow();
  });

  it('should throw ProgrammeValidationError when completion date is before start date', () => {
    expect(() =>
      validateDateHierarchy('2026-12-31T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    ).toThrow(ProgrammeValidationError);
  });
});
