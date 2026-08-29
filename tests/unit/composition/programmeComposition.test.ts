import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProgrammeService } from '@/composition/programmeComposition';
import { IDomainEventPublisher } from '@/events/IDomainEventPublisher';
import { isSuccess } from '@/lib/result';

const supabaseMocks = vi.hoisted(() => {
  const query = {
    eq: vi.fn(),
    order: vi.fn(),
    then: vi.fn(),
  };
  const authenticatedClient = {
    from: vi.fn(),
    rpc: vi.fn(),
  };
  const anonymousClient = {
    from: vi.fn(),
  };

  return {
    query,
    authenticatedClient,
    anonymousClient,
    getSupabaseAuthenticatedClient: vi.fn(),
    getSupabaseServerClient: vi.fn(),
  };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseAuthenticatedClient: supabaseMocks.getSupabaseAuthenticatedClient,
  getSupabaseServerClient: supabaseMocks.getSupabaseServerClient,
}));

describe('Programme composition authentication', () => {
  const publisher: IDomainEventPublisher = {
    publish: vi.fn(async () => undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    supabaseMocks.query.eq.mockImplementation(() => supabaseMocks.query);
    supabaseMocks.query.order.mockImplementation(() => supabaseMocks.query);
    supabaseMocks.query.then.mockImplementation((resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
    );
    supabaseMocks.authenticatedClient.from.mockReturnValue({
      select: vi.fn(() => supabaseMocks.query),
    });
    supabaseMocks.getSupabaseAuthenticatedClient.mockReturnValue(supabaseMocks.authenticatedClient);
    supabaseMocks.anonymousClient.from.mockImplementation(() => {
      throw new Error('Authenticated Programme discovery fell back to the anonymous client');
    });
    supabaseMocks.getSupabaseServerClient.mockReturnValue(supabaseMocks.anonymousClient);
  });

  it('propagates the access token into the authenticated Programme read adapter', async () => {
    const service = createProgrammeService({
      accessToken: 'verified-access-token',
      eventPublisher: publisher,
    });

    const result = await service.listProgrammes({ status: 'Active' });

    expect(isSuccess(result)).toBe(true);
    expect(supabaseMocks.getSupabaseAuthenticatedClient).toHaveBeenCalledOnce();
    expect(supabaseMocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith(
      'verified-access-token',
    );
    expect(supabaseMocks.getSupabaseServerClient).toHaveBeenCalledOnce();
    expect(supabaseMocks.anonymousClient.from).not.toHaveBeenCalled();
    expect(supabaseMocks.authenticatedClient.from).toHaveBeenCalledWith('programme');
    expect(supabaseMocks.query.eq).toHaveBeenCalledWith('status', 'Approved');
  });
});
