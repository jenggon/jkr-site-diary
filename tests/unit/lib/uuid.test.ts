import { describe, it, expect } from 'vitest';
import { generateUuid, isValidUuid, NIL_UUID } from '@/lib/uuid';

describe('uuid', () => {
  it('should generate valid UUID v4', () => {
    const id = generateUuid();
    expect(typeof id).toBe('string');
    expect(isValidUuid(id)).toBe(true);
  });

  it('should validate NIL_UUID as valid', () => {
    expect(isValidUuid(NIL_UUID)).toBe(true);
  });

  it('should return false for invalid UUID strings', () => {
    expect(isValidUuid('invalid-uuid')).toBe(false);
    expect(isValidUuid('1234')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });
});
