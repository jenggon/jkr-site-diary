import { NextResponse } from 'next/server';
import { BaseAppError } from '@/lib/errors';
import { mapErrorToHttpStatus } from './httpErrorMapper';

export interface PaginationMeta {
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasNext: boolean;
}

export function toSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function acceptedResponse<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 202 });
}

export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function pagedResponse<T>(items: readonly T[], pagination: PaginationMeta, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data: items,
      pagination: {
        total: pagination.total,
        limit: pagination.limit,
        offset: pagination.offset,
        hasNext: pagination.hasNext,
      },
    },
    { status }
  );
}

export function internalServerErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    },
    { status: 500 }
  );
}

export function toErrorResponse(error: BaseAppError | Error | string, defaultStatus = 500): NextResponse {
  if (error instanceof BaseAppError) {
    const status = mapErrorToHttpStatus(error);
    if (status >= 500) {
      return internalServerErrorResponse();
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
      },
      { status }
    );
  }

  if (defaultStatus >= 500) {
    return internalServerErrorResponse();
  }

  const msg = error instanceof Error ? error.message : String(error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'ERROR',
        message: msg,
      },
    },
    { status: defaultStatus }
  );
}
