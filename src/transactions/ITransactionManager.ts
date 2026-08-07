import { Result } from '@/lib/result';
import { BaseAppError } from '@/lib/errors';

export interface ITransactionManager {
  execute<T>(work: () => Promise<Result<T, BaseAppError>>): Promise<Result<T, BaseAppError>>;
}
