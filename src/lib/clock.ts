import { IClock } from './IClock';

export function nowIso(): string {
  return new Date().toISOString();
}

export function nowUtcDate(): Date {
  return new Date();
}

export class SystemClock implements IClock {
  public nowIso(): string {
    return nowIso();
  }

  public nowUtcDate(): Date {
    return nowUtcDate();
  }
}

export function toIso8601(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) {
    throw new RangeError('Invalid date input provided to toIso8601');
  }
  return date.toISOString();
}

export function isValidIso8601(isoString: string): boolean {
  if (typeof isoString !== 'string' || isoString.trim() === '') {
    return false;
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return false;
  }
  return date.toISOString() === isoString || !isNaN(Date.parse(isoString));
}

export function parseIso8601(isoString: string): Date {
  if (!isValidIso8601(isoString)) {
    throw new RangeError('Invalid ISO8601 string');
  }
  return new Date(isoString);
}
