import { describe, it, expect } from 'vitest';
import { Success, Failure, isSuccess, isFailure, unwrap, unwrapOr } from '@/lib/result';

describe('result', () => {
  it('should handle Success result correctly', () => {
    const res = Success(42);
    expect(isSuccess(res)).toBe(true);
    expect(isFailure(res)).toBe(false);
    expect(unwrap(res)).toBe(42);
    expect(unwrapOr(res, 0)).toBe(42);
  });

  it('should handle Failure result correctly', () => {
    const error = new Error('Something went wrong');
    const res = Failure(error);
    expect(isSuccess(res)).toBe(false);
    expect(isFailure(res)).toBe(true);
    expect(() => unwrap(res)).toThrow('Something went wrong');
    expect(unwrapOr(res, 100)).toBe(100);
  });

  it('should throw stringified error if Failure is not Error instance on unwrap', () => {
    const res = Failure('custom failure message');
    expect(() => unwrap(res)).toThrow('custom failure message');
  });
});
