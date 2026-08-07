import { describe, it, expect } from 'vitest';
import {
  getSupabaseBrowserClient,
  getSupabaseServerClient,
  getSupabaseServiceRoleClient,
} from '@/lib/supabase';
import { InfrastructureError } from '@/lib/errors';

describe('supabase', () => {
  it('should return singleton browser client', () => {
    const client1 = getSupabaseBrowserClient();
    const client2 = getSupabaseBrowserClient();
    expect(client1).toBe(client2);
  });

  it('should return server client instance', () => {
    const client = getSupabaseServerClient();
    expect(client).toBeDefined();
  });

  it('should throw InfrastructureError if service role key is missing in test env', () => {
    expect(() => getSupabaseServiceRoleClient()).toThrow(InfrastructureError);
  });
});
