import { describe, it, expect } from 'vitest';
import { PAGINATION_DEFAULTS, HTTP_HEADERS, ENVIRONMENTS, APP_DEFAULTS } from '@/lib/constants';

describe('constants', () => {
  it('should export frozen pagination defaults', () => {
    expect(PAGINATION_DEFAULTS.DEFAULT_PAGE).toBe(1);
    expect(PAGINATION_DEFAULTS.DEFAULT_PAGE_SIZE).toBe(20);
    expect(PAGINATION_DEFAULTS.MAX_PAGE_SIZE).toBe(100);
    expect(Object.isFrozen(PAGINATION_DEFAULTS)).toBe(true);
  });

  it('should export frozen http header constants', () => {
    expect(HTTP_HEADERS.CORRELATION_ID).toBe('x-correlation-id');
    expect(HTTP_HEADERS.AUTHORIZATION).toBe('authorization');
    expect(Object.isFrozen(HTTP_HEADERS)).toBe(true);
  });

  it('should export frozen environments constants', () => {
    expect(ENVIRONMENTS.DEVELOPMENT).toBe('development');
    expect(ENVIRONMENTS.PRODUCTION).toBe('production');
    expect(ENVIRONMENTS.TEST).toBe('test');
    expect(Object.isFrozen(ENVIRONMENTS)).toBe(true);
  });

  it('should export frozen app defaults', () => {
    expect(APP_DEFAULTS.APP_NAME).toBe('JKR Site Diary Platform');
    expect(Object.isFrozen(APP_DEFAULTS)).toBe(true);
  });
});
