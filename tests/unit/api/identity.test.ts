import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { extractIdentity } from '@/app/api/_shared/identity';
import { getSupabaseServerClient } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  getSupabaseServerClient: vi.fn(),
}));

describe('extractIdentity (Blocker 1 - Auth Verification)', () => {
  let mockGetUser: Mock;

  beforeEach(() => {
    mockGetUser = vi.fn();
    (getSupabaseServerClient as unknown as Mock).mockReturnValue({
      auth: { getUser: mockGetUser },
    });
  });

  it('1. No Authorization header -> returns null', async () => {
    const req = new Request('http://localhost', { headers: new Headers() });
    const result = await extractIdentity(req);
    expect(result).toBeNull();
  });

  it('2. Invalid/fake Bearer token -> returns null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });
    const req = new Request('http://localhost', {
      headers: new Headers({ authorization: 'Bearer fake-token' }),
    });
    const result = await extractIdentity(req);
    expect(result).toBeNull();
  });

  it('3. x-user-id without valid Bearer -> returns null', async () => {
    const req = new Request('http://localhost', {
      headers: new Headers({ 'x-user-id': 'user-123' }),
    });
    const result = await extractIdentity(req);
    expect(result).toBeNull();
  });

  it('4. Valid Bearer + forged x-user-id -> authenticated Bearer user wins', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'real-user-id' } }, error: null });
    const req = new Request('http://localhost', {
      headers: new Headers({
        authorization: 'Bearer valid-token',
        'x-user-id': 'hacker-user-id',
      }),
    });
    const result = await extractIdentity(req);
    expect(result).toBe('real-user-id');
  });
});
