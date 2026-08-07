import { describe, it, expect } from 'vitest';
import { SupabaseDatabaseAdapter } from '@/repositories/adapters/SupabaseDatabaseAdapter';
import { SupabaseClient } from '@supabase/supabase-js';
import { isSuccess, isFailure } from '@/lib/result';

describe('SupabaseDatabaseAdapter', () => {
  it('should return Failure on Postgres error code 23505 (unique key constraint)', async () => {
    const mockClient = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint' },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const adapter = new SupabaseDatabaseAdapter(mockClient);
    const result = await adapter.insert('programme', { programme_code: 'JKR/PLS/2026/001' });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.errorCode).toBe('PROGRAMME_ALREADY_EXISTS');
    }
  });

  it('should return Success on valid selectOne query', async () => {
    const mockRow = { programme_id: 'p1', programme_code: 'CODE1' };
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockRow, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const adapter = new SupabaseDatabaseAdapter(mockClient);
    const result = await adapter.selectOne('programme', { programme_id: 'p1' });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual(mockRow);
    }
  });

  it('should return Success boolean on exists query', async () => {
    const mockClient = {
      from: () => ({
        select: () => ({
          eq: async () => ({ count: 1, error: null }),
        }),
      }),
    } as unknown as SupabaseClient;

    const adapter = new SupabaseDatabaseAdapter(mockClient);
    const result = await adapter.exists('programme', { programme_code: 'CODE1' });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(true);
    }
  });
});
