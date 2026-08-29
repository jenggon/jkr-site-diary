import { describe, it, expect } from 'vitest';
import { getDbClient, withTransaction } from '@/lib/db';
import { isSuccess, isFailure } from '@/lib/result';
import { BaseAppError, ValidationError } from '@/lib/errors';

describe('db', () => {
  it('should instantiate db client', () => {
    const db = getDbClient();
    expect(db).toBeDefined();
    expect(db.client).toBeDefined();
  });

  it('should execute transaction successfully', async () => {
    const result = await withTransaction(async (tx) => {
      expect(tx.id).toBeDefined();
      return 100;
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(100);
    }
  });

  it('should catch error and return Failure in transaction', async () => {
    const result = await withTransaction(async () => {
      throw new ValidationError('Validation failed in tx');
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toBeInstanceOf(BaseAppError);
      expect(result.error.errorCode).toBe('VALIDATION_ERROR');
    }
  });
});
