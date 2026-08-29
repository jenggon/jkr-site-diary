import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH as updateActivity } from '@/app/api/activities/[activityId]/route';
import { Success } from '@/lib/result';

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization');
    if (!auth || auth === 'invalid') return null;
    return { actorId: 'verified-actor-123', accessToken: 'valid-token' };
  }),
}));

const mockService = {
  updateActivity: vi.fn(),
  getActivityHistory: vi.fn(),
};

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: vi.fn(() => mockService),
}));

vi.mock('@/app/api/_shared/container', () => ({
  LazyPlatformServiceContainer: vi.fn().mockImplementation(() => ({
    openActivity: () => mockService,
  })),
}));

describe('PATCH /api/activities/[activityId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body?: unknown, authHeader?: string) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'authorization') return authHeader || null;
          if (key.toLowerCase() === 'x-correlation-id') return 'corr-123';
          return null;
        },
      },
    } as unknown as Request;
  }

  it('returns 401 if token is missing', async () => {
    const req = createMockRequest({ subtask: 'test' });
    const ctx = { params: Promise.resolve({ activityId: 'act-1' }) };
    const res = await updateActivity(req, ctx);
    expect(res.status).toBe(401);
  });

  it('returns 401 if token is invalid', async () => {
    const req = createMockRequest({ subtask: 'test' }, 'invalid');
    const ctx = { params: Promise.resolve({ activityId: 'act-1' }) };
    const res = await updateActivity(req, ctx);
    expect(res.status).toBe(401);
  });

  it('receives verified actorId from extractIdentity and ignores body.updated_by', async () => {
    const body = { subtask: 'Updated Name', updated_by: 'spoofed-actor-999' };
    const req = createMockRequest(body, 'valid-token');
    const ctx = { params: Promise.resolve({ activityId: 'act-1' }) };
    
    mockService.updateActivity.mockResolvedValue(Success({ activity_id: 'act-1' }));

    const res = await updateActivity(req, ctx);
    expect(res.status).toBe(200);

    expect(mockService.updateActivity).toHaveBeenCalledWith({
      activityId: 'act-1',
      activityName: 'Updated Name',
      updatedBy: 'verified-actor-123', // should be the verified actor, NOT spoofed-actor-999
    });
  });
});
