import { BaseAppError, ValidationError } from './errors';

export function invariant(
  condition: unknown,
  message?: string | Error,
  errorFactory?: () => BaseAppError
): asserts condition {
  if (!condition) {
    if (errorFactory) {
      throw errorFactory();
    }
    if (message instanceof Error) {
      throw message;
    }
    const msg = message ?? 'Invariant violation';
    throw new ValidationError(msg);
  }
}
