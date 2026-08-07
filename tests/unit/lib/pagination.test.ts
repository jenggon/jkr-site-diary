import { describe, it, expect } from 'vitest';
import {
  calculateOffset,
  calculateTotalPages,
  createOffsetPaginatedResult,
  encodeCursor,
  decodeCursor,
  createCursorPaginatedResult,
} from '@/lib/pagination';

describe('pagination', () => {
  it('should calculate correct offset and clamp page size', () => {
    expect(calculateOffset({ page: 2, pageSize: 15 })).toEqual({ page: 2, pageSize: 15, offset: 15 });
    expect(calculateOffset({ page: -1, pageSize: 200 })).toEqual({ page: 1, pageSize: 100, offset: 0 });
  });

  it('should calculate total pages correctly', () => {
    expect(calculateTotalPages(45, 10)).toBe(5);
    expect(calculateTotalPages(0, 10)).toBe(0);
  });

  it('should create offset paginated result metadata', () => {
    const data = ['item1', 'item2'];
    const res = createOffsetPaginatedResult(data, 25, { page: 1, pageSize: 10 });
    expect(res.data).toEqual(data);
    expect(res.meta.totalPages).toBe(3);
    expect(res.meta.hasNextPage).toBe(true);
    expect(res.meta.hasPreviousPage).toBe(false);
  });

  it('should encode and decode base64url cursor', () => {
    const payload = { id: 'abc-123', timestamp: 1700000000 };
    const cursor = encodeCursor(payload);
    expect(typeof cursor).toBe('string');

    const decoded = decodeCursor<typeof payload>(cursor);
    expect(decoded).toEqual(payload);
  });

  it('should return null when decoding invalid cursor string', () => {
    expect(decodeCursor('invalid-cursor-xyz!@#')).toBeNull();
  });

  it('should create cursor paginated result with next cursor', () => {
    const items = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];
    const res = createCursorPaginatedResult(items, 2, (item) => item.id);
    expect(res.data.length).toBe(2);
    expect(res.meta.hasNextPage).toBe(true);
    expect(res.meta.nextCursor).toBe('2');
  });
});
