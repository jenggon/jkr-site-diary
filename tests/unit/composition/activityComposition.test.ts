import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createOpenActivityService } from '@/composition/activityComposition';

const supabaseMocks = vi.hoisted(() => ({
  authenticatedClient: { from: vi.fn(), rpc: vi.fn() },
  getSupabaseAuthenticatedClient: vi.fn(),
}));

vi.mock('@/lib/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/supabase')>();
  return {
    ...original,
    getSupabaseAuthenticatedClient: supabaseMocks.getSupabaseAuthenticatedClient,
  };
});

describe('Open Activity composition authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSupabaseAuthenticatedClient.mockReturnValue(
      supabaseMocks.authenticatedClient as unknown as SupabaseClient,
    );
  });

  it('shares one authenticated client-backed adapter across ProgrammeRevision and Activity reads', () => {
    const service = createOpenActivityService('verified-token') as unknown as {
      activityRepo: { adapter: { client: SupabaseClient } };
      revisionRepo: { adapter: { client: SupabaseClient } };
      logRepo: { adapter: { client: SupabaseClient } };
      atomicRepo: { client: SupabaseClient };
      taskRepo: unknown;
    };

    expect(supabaseMocks.getSupabaseAuthenticatedClient).toHaveBeenCalledOnce();
    expect(supabaseMocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith('verified-token');
    expect(service.activityRepo.adapter).toBe(service.revisionRepo.adapter);
    expect(service.activityRepo.adapter).toBe(service.logRepo.adapter);
    expect(service.activityRepo.adapter.client).toBe(supabaseMocks.authenticatedClient);
    expect(service.atomicRepo.client).toBe(supabaseMocks.authenticatedClient);
    expect(service.taskRepo).toBeDefined();
  });
});
