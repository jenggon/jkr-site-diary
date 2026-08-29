import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Failure, Success } from '@/lib/result';
import { InfrastructureError } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  extractVerifiedIdentity: vi.fn(),
  getSupabaseAuthenticatedClient: vi.fn(),
  SupabaseDatabaseAdapter: vi.fn(),
  ActivityRepository: vi.fn(),
  findByTaskId: vi.fn(),
  findByRevisionId: vi.fn(),
  createSiteDiaryService: vi.fn(),
  getSiteDiariesByActivity: vi.fn(),
  createOpenActivityService: vi.fn(),
  getActivityHistory: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAuthenticatedClient: mocks.getSupabaseAuthenticatedClient,
}));

vi.mock('@/repositories/adapters/SupabaseDatabaseAdapter', () => ({
  SupabaseDatabaseAdapter: mocks.SupabaseDatabaseAdapter,
}));

vi.mock('@/repositories/activityRepository', () => ({
  ActivityRepository: mocks.ActivityRepository,
}));

vi.mock('@/composition/siteDiaryComposition', () => ({
  createSiteDiaryService: mocks.createSiteDiaryService,
}));

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: mocks.createOpenActivityService,
}));

import { GET as getActivitiesByTask } from '@/app/api/activity/task/[taskId]/route';
import { GET as getActivitiesByRevision } from '@/app/api/activity/revision/[revisionId]/route';
import { GET as getSiteDiariesByActivity } from '@/app/api/site-diary/activity/[activityId]/route';
import { GET as getActivityHistory } from '@/app/api/activities/[activityId]/history/route';
import { GET as getLegacyActivity } from '@/app/api/activities/[activityId]/route';

const actorId = '99999999-9999-4999-8999-999999999999';
const taskId = '11111111-1111-4111-8111-111111111111';
const revisionId = '22222222-2222-4222-8222-222222222222';
const activityId = '33333333-3333-4333-8333-333333333333';
const accessToken = 'f3-b05-caller-jwt';

function request(pathname: string): Request {
  return new Request(`http://localhost${pathname}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
}

describe('F3-B05 request-scoped Activity and Site Diary reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractVerifiedIdentity.mockResolvedValue({ actorId, accessToken });
    mocks.getSupabaseAuthenticatedClient.mockReturnValue({ role: 'authenticated', accessToken });
    mocks.SupabaseDatabaseAdapter.mockImplementation((client) => ({ client }));
    mocks.ActivityRepository.mockImplementation(() => ({
      findByTaskId: mocks.findByTaskId,
      findByRevisionId: mocks.findByRevisionId,
    }));
    mocks.findByTaskId.mockResolvedValue(Success([]));
    mocks.findByRevisionId.mockResolvedValue(Success([]));
    mocks.getSiteDiariesByActivity.mockResolvedValue(Success([]));
    mocks.createSiteDiaryService.mockReturnValue({
      getSiteDiariesByActivity: mocks.getSiteDiariesByActivity,
    });
    mocks.getActivityHistory.mockResolvedValue(Success([]));
    mocks.createOpenActivityService.mockReturnValue({
      getActivityHistory: mocks.getActivityHistory,
    });
  });

  it.each([
    ['task', getActivitiesByTask, request(`/api/activity/task/${taskId}`), { params: Promise.resolve({ taskId }) }],
    ['revision', getActivitiesByRevision, request(`/api/activity/revision/${revisionId}`), { params: Promise.resolve({ revisionId }) }],
    ['site diary by activity', getSiteDiariesByActivity, request(`/api/site-diary/activity/${activityId}`), { params: Promise.resolve({ activityId }) }],
    ['activity history', getActivityHistory, request(`/api/activities/${activityId}/history`), { params: Promise.resolve({ activityId }) }],
    ['legacy single activity', getLegacyActivity, request(`/api/activities/${activityId}`), { params: Promise.resolve({ activityId }) }],
  ])('returns 401 for unauthenticated %s reads', async (_name, route, req, context) => {
    mocks.extractVerifiedIdentity.mockResolvedValue(null);

    const response = await (route as (request: Request, context: unknown) => Promise<Response>)(
      req,
      context
    );

    expect(response.status).toBe(401);
  });

  it('binds Activity task and revision reads to the exact caller JWT', async () => {
    await getActivitiesByTask(request(`/api/activity/task/${taskId}`), {
      params: Promise.resolve({ taskId }),
    });
    await getActivitiesByRevision(request(`/api/activity/revision/${revisionId}`), {
      params: Promise.resolve({ revisionId }),
    });

    expect(mocks.getSupabaseAuthenticatedClient).toHaveBeenCalledTimes(2);
    expect(mocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith(accessToken);
    expect(mocks.SupabaseDatabaseAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken })
    );
    expect(mocks.findByTaskId).toHaveBeenCalledWith(taskId);
    expect(mocks.findByRevisionId).toHaveBeenCalledWith(revisionId);
  });

  it('rejects malformed UUIDs before creating an authenticated database client', async () => {
    const response = await getActivitiesByTask(request('/api/activity/task/not-a-uuid'), {
      params: Promise.resolve({ taskId: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.getSupabaseAuthenticatedClient).not.toHaveBeenCalled();
    expect(mocks.findByTaskId).not.toHaveBeenCalled();
  });

  it.each([
    ['task', getActivitiesByTask, `/api/activity/task/${taskId}`, { taskId }, mocks.findByTaskId],
    ['revision', getActivitiesByRevision, `/api/activity/revision/${revisionId}`, { revisionId }, mocks.findByRevisionId],
  ])('redacts raw %s database failures', async (_name, route, pathname, params, repositoryRead) => {
    repositoryRead.mockResolvedValue(
      Failure(new InfrastructureError('22P02 invalid input syntax; a27_internal_rpc_failed'))
    );

    const response = await route(request(pathname), { params: Promise.resolve(params) } as never);
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: 'Internal server error' });
    expect(body).not.toMatch(/22P02|invalid input syntax|a27_internal_rpc_failed/i);
  });

  it('passes the exact JWT into Site Diary composition and preserves optional date behavior', async () => {
    mocks.getSiteDiariesByActivity.mockResolvedValue(
      Success([
        { site_diary_id: 'diary-one', activity_date: '2026-08-28' },
        { site_diary_id: 'diary-two', activity_date: '2026-08-29' },
      ])
    );

    const response = await getSiteDiariesByActivity(
      request(`/api/site-diary/activity/${activityId}?date=2026-08-29`),
      { params: Promise.resolve({ activityId }) }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { site_diary_id: 'diary-two', activity_date: '2026-08-29' },
    });
    expect(mocks.createSiteDiaryService).toHaveBeenCalledWith(accessToken);
  });

  it('returns a safe Site Diary by Activity failure', async () => {
    mocks.getSiteDiariesByActivity.mockResolvedValue(
      Failure(new InfrastructureError('relation "private_secret" does not exist'))
    );

    const response = await getSiteDiariesByActivity(
      request(`/api/site-diary/activity/${activityId}`),
      { params: Promise.resolve({ activityId }) }
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).not.toMatch(/private_secret|relation/i);
  });

  it('also caller-scopes the legacy single Activity projection', async () => {
    const response = await getLegacyActivity(request(`/api/activities/${activityId}`), {
      params: Promise.resolve({ activityId }),
    });

    expect(response.status).toBe(404);
    expect(mocks.createOpenActivityService).toHaveBeenCalledWith(accessToken);
    expect(mocks.getActivityHistory).toHaveBeenCalledWith(activityId);
  });

  it('passes the exact JWT into Activity History and returns only RLS-visible logs', async () => {
    const visibleLog = {
      logId: '55555555-5555-4555-8555-555555555555',
      activityId,
      eventType: 'NEW' as const,
      snapshotData: {},
      loggedAt: '2026-08-29T00:00:00.000Z',
      loggedBy: actorId,
    };
    mocks.getActivityHistory.mockResolvedValue(Success([visibleLog]));

    const response = await getActivityHistory(request(`/api/activities/${activityId}/history`), {
      params: Promise.resolve({ activityId }),
    });

    expect(response.status).toBe(200);
    expect(mocks.createOpenActivityService).toHaveBeenCalledWith(accessToken);
    expect(mocks.getActivityHistory).toHaveBeenCalledWith(activityId);
    expect((await response.json()).data).toHaveLength(1);
  });

  it('does not enumerate foreign Activity history when RLS returns no rows', async () => {
    const response = await getActivityHistory(request(`/api/activities/${activityId}/history`), {
      params: Promise.resolve({ activityId }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, data: [] });
  });
});
