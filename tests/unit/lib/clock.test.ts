import { describe, it, expect } from 'vitest';
import { nowIso, nowUtcDate, toIso8601, isValidIso8601, parseIso8601 } from '@/lib/clock';

describe('clock', () => {
  it('should return current ISO timestamp string', () => {
    const iso = nowIso();
    expect(typeof iso).toBe('string');
    expect(isValidIso8601(iso)).toBe(true);
  });

  it('should return current Date instance', () => {
    const date = nowUtcDate();
    expect(date).toBeInstanceOf(Date);
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('should convert date inputs to ISO8601 format', () => {
    const input = '2026-08-07T12:00:00.000Z';
    expect(toIso8601(input)).toBe(input);
  });

  it('should throw RangeError on invalid date input for toIso8601', () => {
    expect(() => toIso8601('invalid-date')).toThrow(RangeError);
  });

  it('should validate ISO8601 strings', () => {
    expect(isValidIso8601('2026-08-07T12:00:00.000Z')).toBe(true);
    expect(isValidIso8601('not-a-date')).toBe(false);
  });

  it('should parse valid ISO8601 string to Date', () => {
    const iso = '2026-08-07T12:00:00.000Z';
    const date = parseIso8601(iso);
    expect(date.toISOString()).toBe(iso);
  });

  it('should throw RangeError on parseIso8601 with invalid input', () => {
    expect(() => parseIso8601('invalid')).toThrow(RangeError);
  });
});
