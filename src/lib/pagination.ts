import { PAGINATION_DEFAULTS } from './constants';

export interface OffsetPaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface CursorPaginationParams {
  readonly cursor?: string;
  readonly limit?: number;
}

export interface PaginatedMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly meta: PaginatedMeta;
}

export interface CursorPaginatedMeta {
  readonly nextCursor: string | null;
  readonly hasNextPage: boolean;
  readonly limit: number;
}

export interface CursorPaginatedResult<T> {
  readonly data: readonly T[];
  readonly meta: CursorPaginatedMeta;
}

export function calculateOffset(params?: OffsetPaginationParams): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, params?.page ?? PAGINATION_DEFAULTS.DEFAULT_PAGE);
  const rawSize = params?.pageSize ?? PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawSize), PAGINATION_DEFAULTS.MAX_PAGE_SIZE);
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function calculateTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0 || pageSize <= 0) {
    return 0;
  }
  return Math.ceil(totalItems / pageSize);
}

export function createOffsetPaginatedResult<T>(
  data: readonly T[],
  totalItems: number,
  params?: OffsetPaginationParams
): PaginatedResult<T> {
  const { page, pageSize } = calculateOffset(params);
  const totalPages = calculateTotalPages(totalItems, pageSize);

  return {
    data,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export function encodeCursor<T extends Record<string, unknown>>(data: T): string {
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString, 'utf-8').toString('base64url');
}

export function decodeCursor<T extends Record<string, unknown>>(cursor: string): T | null {
  try {
    const jsonString = Buffer.from(cursor, 'base64url').toString('utf-8');
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

export function createCursorPaginatedResult<T>(
  data: readonly T[],
  limit: number,
  getNextCursor: (item: T) => string
): CursorPaginatedResult<T> {
  const hasNextPage = data.length > limit;
  const items = hasNextPage ? data.slice(0, limit) : data;
  const lastItem = items[items.length - 1];
  const nextCursor = hasNextPage && lastItem ? getNextCursor(lastItem) : null;

  return {
    data: items,
    meta: {
      nextCursor,
      hasNextPage,
      limit,
    },
  };
}
