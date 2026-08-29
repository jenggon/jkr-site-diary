export type SuccessResult<T> = {
  readonly success: true;
  readonly value: T;
};

export type FailureResult<E> = {
  readonly success: false;
  readonly error: E;
};

export type Result<T, E = Error> = SuccessResult<T> | FailureResult<E>;

export function Success<T>(value: T): SuccessResult<T> {
  return { success: true, value };
}

export function Failure<E>(error: E): FailureResult<E> {
  return { success: false, error };
}

export function isSuccess<T, E>(result: Result<T, E>): result is SuccessResult<T> {
  return result.success;
}

export function isFailure<T, E>(result: Result<T, E>): result is FailureResult<E> {
  return !result.success;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isSuccess(result)) {
    return result.value;
  }
  if (result.error instanceof Error) {
    throw result.error;
  }
  throw new Error(String(result.error));
}

export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.value;
  }
  return defaultValue;
}
