import { BaseAppError } from '@/lib/errors';

export function mapErrorToHttpStatus(error: BaseAppError): number {
  if (typeof error.httpStatus === 'number' && error.httpStatus >= 400 && error.httpStatus < 600) {
    return error.httpStatus;
  }
  return 500;
}
