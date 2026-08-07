import { withTransaction } from '@/lib/db';
import { Result, isFailure } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';
import { ITransactionManager } from './ITransactionManager';

export class DatabaseTransactionManager implements ITransactionManager {
  public async execute<T>(work: () => Promise<Result<T, BaseAppError>>): Promise<Result<T, BaseAppError>> {
    return withTransaction(async () => {
      const result = await work();
      if (isFailure(result)) {
        throw result.error;
      }
      return result.value;
    });
  }
}
