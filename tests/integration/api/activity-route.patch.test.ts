import { beforeEach, describe, expect, it, vi } from 'vitest';

const updateActivity = vi.fn();
const createOpenActivityService = vi.fn(() => ({ updateActivity }));
const extractVerifiedIdentity = vi.fn();

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService,
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity,
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
    extractVerifiedIdentity.mockResolvedValue({
      actorId: 'actor-123',
      accessToken: 'token-abc',
    });
    updateActivity.mockResolvedValue({
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
    expect(createOpenActivityService).toHaveBeenCalledWith('token-abc');
    expect(updateActivity).toHaveBeenCalledWith({
      activityId: 'activity-123',
      activityName: 'Install reinforcement',
      updatedBy: 'actor-123',
    });
  });

  it('rejects the mutation when verified identity is unavailable', async () => {
    extractVerifiedIdentity.mockResolvedValue(null);

    const request = new Request('http://localhost/api/activity/activity-123', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subtask: 'Install reinforcement' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ activityId: 'activity-123' }),
    });

    expect(response.status).toBe(401);
    expect(createOpenActivityService).not.toHaveBeenCalled();
    expect(updateActivity).not.toHaveBeenCalled();
  });
});
