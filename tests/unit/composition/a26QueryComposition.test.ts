import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createA26QueryService } from '@/composition/a26QueryComposition';

const supabaseMocks = vi.hoisted(() => ({
  authenticatedClient: { from: vi.fn() },
  anonymousClient: { from: vi.fn() },
  getSupabaseAuthenticatedClient: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAuthenticatedClient: supabaseMocks.getSupabaseAuthenticatedClient,
  getSupabaseServerClient: supabaseMocks.getSupabaseServerClient,
}));

describe('A26 query composition authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getSupabaseAuthenticatedClient.mockReturnValue(
      supabaseMocks.authenticatedClient as unknown as SupabaseClient,
    );
    supabaseMocks.getSupabaseServerClient.mockReturnValue(
      supabaseMocks.anonymousClient as unknown as SupabaseClient,
    );
    supabaseMocks.anonymousClient.from.mockImplementation(() => {
      throw new Error('A26 request fell back to the anonymous client');
    });
    supabaseMocks.authenticatedClient.from.mockImplementation((table: string) => {
      if (table === 'programme') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { programme_id: 'programme-a', current_revision_id: 'revision-a' },
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'task') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('uses the authenticated caller client for A26 Programme and dependent reads', async () => {
    const service = createA26QueryService('verified-token');

    await service.getProjectSummary('programme-a');

    expect(supabaseMocks.getSupabaseAuthenticatedClient).toHaveBeenCalledOnce();
    expect(supabaseMocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith('verified-token');
    expect(supabaseMocks.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(supabaseMocks.anonymousClient.from).not.toHaveBeenCalled();
    expect(supabaseMocks.authenticatedClient.from).toHaveBeenCalledWith('programme');
    expect(supabaseMocks.authenticatedClient.from).toHaveBeenCalledWith('task');
  });
});
