/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Success, Failure } from '@/lib/result';
import { InfrastructureError } from '@/lib/errors';

const mocks = vi.hoisted(() => {
  const updateActivity = vi.fn();
  const createOpenActivityService = vi.fn(() => ({ updateActivity }));
  const extractVerifiedIdentity = vi.fn();
  const findById = vi.fn();
  const getSupabaseAuthenticatedClient = vi.fn((token: string) => ({ token, role: 'authenticated' }));
  const SupabaseDatabaseAdapterMock = vi.fn((client: any) => ({ client }));
  const ActivityRepositoryMock = vi.fn((adapter: any) => ({
    adapter,
    findById: mocks.findById,
  }));

  return {
    updateActivity,
    createOpenActivityService,
    extractVerifiedIdentity,
    findById,
    getSupabaseAuthenticatedClient,
    SupabaseDatabaseAdapterMock,
    ActivityRepositoryMock,
  };
});

vi.mock('@/composition/activityComposition', () => ({
  createOpenActivityService: mocks.createOpenActivityService,
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@/repositories/activityRepository', () => ({
  ActivityRepository: mocks.ActivityRepositoryMock,
}));

vi.mock('@/repositories/adapters/SupabaseDatabaseAdapter', () => ({
  SupabaseDatabaseAdapter: mocks.SupabaseDatabaseAdapterMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  getSupabaseAuthenticatedClient: mocks.getSupabaseAuthenticatedClient,
}));

import { GET, PATCH } from '@/app/api/activity/[activityId]/route';

describe('/api/activity/[activityId] Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/activity/[activityId]', () => {
    it('uses caller-scoped authenticated client and propagates access token to repository', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue({
        actorId: 'actor-p1-1111',
        accessToken: 'valid-p1-jwt-token',
      });
      const mockActivity = {
        activity_id: 'act-001',
        programme_id: 'prog-001',
        subtask: 'Kerja Konkrit Struktur Utama',
        status: 'In Progress',
      };
      mocks.findById.mockResolvedValue(Success(mockActivity));

      const request = new Request('http://localhost/api/activity/act-001', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-p1-jwt-token',
        },
      });

      const response = await GET(request, {
        params: Promise.resolve({ activityId: 'act-001' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ data: mockActivity });

      // Proves request-scoped authenticated client was created with caller token
      expect(mocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith('valid-p1-jwt-token');
      expect(mocks.SupabaseDatabaseAdapterMock).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'valid-p1-jwt-token' })
      );
      expect(mocks.findById).toHaveBeenCalledWith('act-001');
    });

    it('returns 401 when request is unauthenticated', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue(null);

      const request = new Request('http://localhost/api/activity/act-001', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ activityId: 'act-001' }),
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json).toEqual({ error: 'Unauthorized: Missing or invalid identity' });
      expect(mocks.getSupabaseAuthenticatedClient).not.toHaveBeenCalled();
      expect(mocks.findById).not.toHaveBeenCalled();
    });

    it('returns 404 when activity is not found or inaccessible under caller RLS', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue({
        actorId: 'actor-p3-3333',
        accessToken: 'foreign-p3-jwt-token',
      });
      mocks.findById.mockResolvedValue(Success(null));

      const request = new Request('http://localhost/api/activity/act-foreign-999', {
        method: 'GET',
        headers: {
          authorization: 'Bearer foreign-p3-jwt-token',
        },
      });

      const response = await GET(request, {
        params: Promise.resolve({ activityId: 'act-foreign-999' }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json).toEqual({ error: 'Activity not found' });
      expect(mocks.getSupabaseAuthenticatedClient).toHaveBeenCalledWith('foreign-p3-jwt-token');
    });

    it('returns generic safe 500 without leaking internal database error messages', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue({
        actorId: 'actor-p1-1111',
        accessToken: 'valid-p1-jwt-token',
      });
      mocks.findById.mockResolvedValue(
        Failure(new InfrastructureError('permission denied for table activity: 42501 details'))
      );

      const request = new Request('http://localhost/api/activity/act-001', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-p1-jwt-token',
        },
      });

      const response = await GET(request, {
        params: Promise.resolve({ activityId: 'act-001' }),
      });

      expect(response.status).toBe(500);
      const json = await response.json();
      // Must be generic and redact internal DB/SQL details
      expect(json).toEqual({ error: 'Failed to retrieve activity' });
      expect(json.error).not.toContain('permission denied');
      expect(json.error).not.toContain('42501');
    });
  });

  describe('PATCH /api/activity/[activityId]', () => {
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
});
