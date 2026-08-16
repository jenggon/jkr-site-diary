import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const updateActivity = vi.fn();
  const createOpenActivityService = vi.fn(() => ({ updateActivity }));
  const extractVerifiedIdentity = vi.fn();

  return {
    updateActivity,
    createOpenActivityService,
    extractVerifiedIdentity,
  };
});

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: mocks.createOpenActivityService,
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/repositories/activityRepository', () => ({
  ActivityRepository: vi.fn(),
}));

vi.mock('@/repositories/adapters/SupabaseDatabaseAdapter', () => ({
  SupabaseDatabaseAdapter: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

import { PATCH } from '@/app/api/activity/[activityId]/route';

describe('PATCH /api/activity/[activityId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the verified access token for the service and verified actor for the mutation', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue({
      actorId: 'actor-123',
      accessToken: 'token-abc',
    });
    mocks.updateActivity.mockResolvedValue({
      success: true,
      value: { activityId: 'activity-123' },
    });

    const request = new Request('http://localhost/api/activity/activity-123', {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer token-abc',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ subtask: 'Install reinforcement' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ activityId: 'activity-123' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.createOpenActivityService).toHaveBeenCalledWith('token-abc');
    expect(mocks.updateActivity).toHaveBeenCalledWith({
      activityId: 'activity-123',
      activityName: 'Install reinforcement',
      updatedBy: 'actor-123',
    });
  });

  it('rejects the mutation when verified identity is unavailable', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue(null);

    const request = new Request('http://localhost/api/activity/activity-123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subtask: 'Install reinforcement' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ activityId: 'activity-123' }),
    });

    expect(response.status).toBe(401);
    expect(mocks.createOpenActivityService).not.toHaveBeenCalled();
    expect(mocks.updateActivity).not.toHaveBeenCalled();
  });
});
