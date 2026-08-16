import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const extractVerifiedIdentity = vi.fn();
  const rpc = vi.fn();
  const getSupabaseAuthenticatedClient = vi.fn(() => ({ rpc }));
  return { extractVerifiedIdentity, rpc, getSupabaseAuthenticatedClient };
});

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAuthenticatedClient: mocks.getSupabaseAuthenticatedClient,
}));

import { POST } from '@/app/api/trade-library/route';

describe('POST /api/trade-library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the verified bearer client and persists through the exact Trade RPC', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue({
      actorId: 'actor-123',
      accessToken: 'token-abc',
    });
    mocks.rpc.mockResolvedValue({
      data: {
        trade_id: 'trade-123',
        trade_code: 'BAR_BENDER',
        trade_name: 'Bar Bender',
      },
      error: null,
    });

    const request = new Request('http://localhost/api/trade-library', {
      method: 'POST',
      headers: {
        authorization: 'Bearer token-abc',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ trade_name: 'Bar Bender' }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith('token-abc');
    expect(mocks.rpc).toHaveBeenCalledWith('f1_create_trade_atomic', {
      p_trade_code: 'BAR_BENDER',
      p_trade_name: 'Bar Bender',
    });
    expect(body.data.trade_id).toBe('trade-123');
  });

  it('rejects unauthenticated manual Trade creation before any RPC call', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue(null);

    const request = new Request('http://localhost/api/trade-library', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trade_name: 'Carpenter' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mocks.getSupabaseAuthenticatedClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('keeps supplied stable trade codes when provided', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue({
      actorId: 'actor-123',
      accessToken: 'token-abc',
    });
    mocks.rpc.mockResolvedValue({ data: { trade_id: 'trade-456' }, error: null });

    const request = new Request('http://localhost/api/trade-library', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trade_code: 'STEEL_FIXER', trade_name: 'Steel Fixer' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith('f1_create_trade_atomic', {
      p_trade_code: 'STEEL_FIXER',
      p_trade_name: 'Steel Fixer',
    });
  });
});
