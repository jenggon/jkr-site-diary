import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const rpc = vi.fn();
  const extractVerifiedIdentity = vi.fn();
  const getSupabaseAuthenticatedClient = vi.fn(() => ({ rpc }));
  const startActivity = vi.fn();
  const completeActivity = vi.fn();
  const createOpenActivityService = vi.fn(() => ({
    startActivity,
    completeActivity,
  }));

  return {
    rpc,
    extractVerifiedIdentity,
    getSupabaseAuthenticatedClient,
    startActivity,
    completeActivity,
    createOpenActivityService,
  };
});

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAuthenticatedClient: mocks.getSupabaseAuthenticatedClient,
}));

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: mocks.createOpenActivityService,
}));

import { POST as startPost } from '@/app/api/activities/[activityId]/start/route';
import { POST as completePost } from '@/app/api/activities/[activityId]/complete/route';

describe('F1 dated Activity lifecycle routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractVerifiedIdentity.mockResolvedValue({
      actorId: '11111111-1111-4111-8111-111111111111',
      accessToken: 'verified-token',
    });
  });

  it('starts an Activity using the known actual start date through the authenticated F1 RPC', async () => {
    mocks.rpc.mockResolvedValue({
      data: { activity_id: '22222222-2222-4222-8222-222222222222', status: 'In Progress' },
      error: null,
    });

    const request = new Request('http://localhost/api/activities/22222222-2222-4222-8222-222222222222/start', {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ actualStartDate: '2026-08-10' }),
    });

    const response = await startPost(request, {
      params: Promise.resolve({ activityId: '22222222-2222-4222-8222-222222222222' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith('verified-token');
    expect(mocks.rpc).toHaveBeenCalledWith('f1_start_activity_on_date_atomic', {
      p_activity_id: '22222222-2222-4222-8222-222222222222',
      p_actual_start_date: '2026-08-10',
    });
    expect(mocks.startActivity).not.toHaveBeenCalled();
  });

  it('completes same-day work using an explicit start and completion date without a direct New -> Completed API path', async () => {
    mocks.rpc.mockResolvedValue({
      data: { activity_id: '33333333-3333-4333-8333-333333333333', status: 'Completed' },
      error: null,
    });

    const request = new Request('http://localhost/api/activities/33333333-3333-4333-8333-333333333333/complete', {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        actualStartDate: '2026-08-16',
        completedDate: '2026-08-16',
      }),
    });

    const response = await completePost(request, {
      params: Promise.resolve({ activityId: '33333333-3333-4333-8333-333333333333' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('f1_complete_activity_with_dates_atomic', {
      p_activity_id: '33333333-3333-4333-8333-333333333333',
      p_actual_start_date: '2026-08-16',
      p_completed_date: '2026-08-16',
    });
    expect(mocks.completeActivity).not.toHaveBeenCalled();
  });

  it('rejects malformed execution dates before calling the database', async () => {
    const request = new Request('http://localhost/api/activities/33333333-3333-4333-8333-333333333333/complete', {
      method: 'POST',
      headers: {
        authorization: 'Bearer verified-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        actualStartDate: '16/08/2026',
        completedDate: '2026-08-16',
      }),
    });

    const response = await completePost(request, {
      params: Promise.resolve({ activityId: '33333333-3333-4333-8333-333333333333' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
