import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createActivity } from '@/app/api/site-diary/[siteDiaryId]/activities/route';
import { Success } from '@/lib/result';

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization');
    if (!auth || auth === 'invalid') return null;
    return { actorId: 'verified-actor-456', accessToken: 'valid-token' };
  }),
}));

const mockService = {
  createActivity: vi.fn(),
};

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: vi.fn(() => mockService),
}));

vi.mock('@/app/api/_shared/container', () => ({
  LazyPlatformServiceContainer: vi.fn().mockImplementation(() => ({
    openActivity: () => mockService,
  })),
}));

describe('POST /api/site-diary/[siteDiaryId]/activities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body?: unknown, authHeader?: string) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'authorization') return authHeader || null;
          if (key.toLowerCase() === 'x-correlation-id') return 'corr-456';
          return null;
        },
      },
    } as unknown as Request;
  }

  it('returns 401 if token is missing', async () => {
    const req = createMockRequest({ subtask: 'test' });
    const ctx = { params: Promise.resolve({ siteDiaryId: 'diary-1' }) };
    const res = await createActivity(req, ctx);
    expect(res.status).toBe(401);
  });

  it('returns 401 if token is invalid', async () => {
    const req = createMockRequest({ subtask: 'test' }, 'invalid');
    const ctx = { params: Promise.resolve({ siteDiaryId: 'diary-1' }) };
    const res = await createActivity(req, ctx);
    expect(res.status).toBe(401);
  });

  it('receives verified actorId from extractIdentity and ignores body.created_by', async () => {
    const body = {
      programme_id: 'prog-1',
      revision_id: 'rev-1',
      task_id: 'task-1',
      subtask: 'Test Name',
      created_by: 'spoofed-actor-999',
    };
    const req = createMockRequest(body, 'valid-token');
    const ctx = { params: Promise.resolve({ siteDiaryId: 'diary-1' }) };
    
    mockService.createActivity.mockResolvedValue(Success({ activity_id: 'act-1' }));

    const res = await createActivity(req, ctx);
    expect(res.status).toBe(201);

    expect(mockService.createActivity).toHaveBeenCalledWith({
      siteDiaryId: 'diary-1',
      programmeId: 'prog-1',
      revisionId: 'rev-1',
      taskId: 'task-1',
      activityName: 'Test Name',
      createdBy: 'verified-actor-456', // should be the verified actor, NOT spoofed-actor-999
    });
  });
});
