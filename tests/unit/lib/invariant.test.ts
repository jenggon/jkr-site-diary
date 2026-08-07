import { describe, it, expect } from 'vitest';
import { invariant } from '@/lib/invariant';
import { ValidationError, NotFoundError } from '@/lib/errors';

describe('invariant', () => {
  it('should not throw if condition is truthy', () => {
    expect(() => invariant(true, 'Should pass')).not.toThrow();
    expect(() => invariant(1, 'Should pass')).not.toThrow();
    expect(() => invariant({}, 'Should pass')).not.toThrow();
  });

  it('should throw ValidationError by default when condition is falsy', () => {
    expect(() => invariant(false, 'Condition failed')).toThrow(ValidationError);
    expect(() => invariant(false, 'Condition failed')).toThrow('Condition failed');
  });

  it('should throw provided Error instance when condition is falsy', () => {
    const customErr = new Error('Custom Error');
    expect(() => invariant(false, customErr)).toThrow(customErr);
  });

  it('should throw from errorFactory when condition is falsy', () => {
    expect(() => invariant(false, undefined, () => new NotFoundError('Item missing'))).toThrow(
      NotFoundError
    );
  });
});
