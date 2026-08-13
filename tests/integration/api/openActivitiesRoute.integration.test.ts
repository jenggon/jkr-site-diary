import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getOpenActivities } from '@/app/api/activities/open/route';
import { Success, Failure } from '@/lib/result';
import { UnknownError } from '@/lib/errors';
import { ActivityStatus } from '@/types/activity';

vi.mock('@/app/api/_shared/identity', () => ({
  extractIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization');
    if (!auth || auth === 'invalid') return null;
    return 'verified-actor-123';
  }),
}));

const mockService = {
  getOpenActivities: vi.fn(),
};

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: vi.fn(() => mockService),
}));

describe('GET /api/activities/open', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(urlStr: string, authHeader?: string) {
    return {
      url: urlStr,
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'authorization') return authHeader || null;
          return null;
        },
      },
    } as unknown as Request;
  }

  it('returns 401 if token is missing', async () => {
    const req = createMockRequest('http://localhost/api/activities/open?programmeId=prog-1');
    const res = await getOpenActivities(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 if token is invalid', async () => {
    const req = createMockRequest('http://localhost/api/activities/open?programmeId=prog-1', 'invalid');
    const res = await getOpenActivities(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if programmeId is missing', async () => {
    const req = createMockRequest('http://localhost/api/activities/open', 'valid-token');
    const res = await getOpenActivities(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 with data when successful', async () => {
    const mockData = [
      { activityId: 'act-1', status: ActivityStatus.New, programmeId: 'prog-1' },
      { activityId: 'act-2', status: ActivityStatus.InProgress, programmeId: 'prog-1' },
    ];
    mockService.getOpenActivities.mockResolvedValue(Success(mockData));

    const req = createMockRequest('http://localhost/api/activities/open?programmeId=prog-1', 'valid-token');
    const res = await getOpenActivities(req);
    
    expect(res.status).toBe(200);
    expect(mockService.getOpenActivities).toHaveBeenCalledWith('prog-1');
    
    const body = await res.json();
    expect(body.data).toEqual(mockData);
  });

  it('handles service errors', async () => {
    mockService.getOpenActivities.mockResolvedValue(Failure(new UnknownError('DB error')));

    const req = createMockRequest('http://localhost/api/activities/open?programmeId=prog-1', 'valid-token');
    const res = await getOpenActivities(req);
    
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });
});
