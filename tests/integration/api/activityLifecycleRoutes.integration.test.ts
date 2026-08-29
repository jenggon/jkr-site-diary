import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as startActivity } from '@/app/api/activities/[activityId]/start/route';
import { POST as completeActivity } from '@/app/api/activities/[activityId]/complete/route';
import { GET as getActivityHistory } from '@/app/api/activities/[activityId]/history/route';
import { Success } from '@/lib/result';

vi.mock('@/app/api/_shared/identity', () => ({
  extractIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization');
    if (!auth || auth === 'invalid') return null;
    return 'verified-actor-123';
  }),
  extractVerifiedIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization');
    if (!auth || auth === 'invalid') return null;
    return { actorId: 'verified-actor-123', accessToken: 'valid-token' };
  }),
}));

const mockService = {
  startActivity: vi.fn(),
  completeActivity: vi.fn(),
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

describe('A19 Phase 3 Lifecycle Integration Routes', () => {
  const lifecycleActivityId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(method: 'GET' | 'POST', body?: unknown, authHeader?: string) {
    return {
      method,
      json: method === 'POST' ? vi.fn().mockResolvedValue(body) : undefined,
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'authorization') return authHeader || null;
          if (key.toLowerCase() === 'x-correlation-id') return 'corr-123';
          return null;
        },
      },
    } as unknown as Request;
  }

  describe('POST /api/activities/[activityId]/start', () => {
    it('returns 401 if token is missing', async () => {
      const req = createMockRequest('POST', {});
      const ctx = { params: Promise.resolve({ activityId: lifecycleActivityId }) };
      const res = await startActivity(req, ctx);
      expect(res.status).toBe(401);
    });

    it('receives verified actorId and ignores body.started_by', async () => {
      const body = { started_by: 'spoofed-actor' };
      const req = createMockRequest('POST', body, 'valid-token');
      const ctx = { params: Promise.resolve({ activityId: lifecycleActivityId }) };
      
      mockService.startActivity.mockResolvedValue(Success({ activity_id: lifecycleActivityId }));

      const res = await startActivity(req, ctx);
      expect(res.status).toBe(200);

      expect(mockService.startActivity).toHaveBeenCalledWith(
        lifecycleActivityId,
        'verified-actor-123'
      );
    });
  });

  describe('POST /api/activities/[activityId]/complete', () => {
    it('returns 401 if token is missing', async () => {
      const req = createMockRequest('POST', {});
      const ctx = { params: Promise.resolve({ activityId: lifecycleActivityId }) };
      const res = await completeActivity(req, ctx);
      expect(res.status).toBe(401);
    });

    it('receives verified actorId and ignores body.completed_by', async () => {
      const body = { completed_by: 'spoofed-actor' };
      const req = createMockRequest('POST', body, 'valid-token');
      const ctx = { params: Promise.resolve({ activityId: lifecycleActivityId }) };
      
      mockService.completeActivity.mockResolvedValue(Success({ activity_id: lifecycleActivityId }));

      const res = await completeActivity(req, ctx);
      expect(res.status).toBe(200);

      expect(mockService.completeActivity).toHaveBeenCalledWith(
        lifecycleActivityId,
        'verified-actor-123'
      );
    });
  });

  describe('GET /api/activities/[activityId]/history', () => {
    const activityId = '11111111-1111-4111-8111-111111111111';

    it('returns 401 if token is missing', async () => {
      const req = createMockRequest('GET');
      const ctx = { params: Promise.resolve({ activityId }) };
      const res = await getActivityHistory(req, ctx);
      expect(res.status).toBe(401);
    });

    it('allows access with valid token', async () => {
      const req = createMockRequest('GET', undefined, 'valid-token');
      const ctx = { params: Promise.resolve({ activityId }) };
      
      mockService.getActivityHistory.mockResolvedValue(Success([]));

      const res = await getActivityHistory(req, ctx);
      expect(res.status).toBe(200);

      expect(mockService.getActivityHistory).toHaveBeenCalledWith(activityId);
    });
  });
});
