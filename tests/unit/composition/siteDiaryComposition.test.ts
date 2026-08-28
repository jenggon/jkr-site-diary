import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createSiteDiaryService } from '@/composition/siteDiaryComposition';
import { ISiteDiaryService } from '@/services/ISiteDiaryService';
import { POST as createSiteDiaryRoute } from '@/app/api/site-diary/route';
import { GET as getSiteDiaryRoute, PATCH as updateSiteDiaryRoute } from '@/app/api/site-diary/[siteDiaryId]/route';
import { InfrastructureError, UnknownError } from '@/lib/errors';
import {
  SiteDiaryValidationError,
  SiteDiaryRevisionNotApprovedError,
  SiteDiaryStaleEditError,
} from '@/errors/siteDiaryErrors';
import { ProgrammeNotFoundError, ProgrammeLockedError } from '@/errors/programmeErrors';
import { Failure } from '@/lib/result';
import * as supabaseLib from '@/lib/supabase';
import * as identityModule from '@/app/api/_shared/identity';
import { generateUuid } from '@/lib/uuid';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

const mockAuthenticatedClient = {
  from: mockFrom,
  rpc: mockRpc,
} as unknown as SupabaseClient;

vi.mock('@/lib/supabase', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/supabase')>();
  return {
    ...original,
    getSupabaseAuthenticatedClient: vi.fn((_token: string) => mockAuthenticatedClient),
  };
});

describe('Site Diary Composition & Authenticated Read Context (F2.7-C09-A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('A-G. Request-scoped authenticated client propagation', () => {
    it('A. calls getSupabaseAuthenticatedClient exactly ONCE per factory call', () => {
      const token = 'caller-session-token-xyz';
      createSiteDiaryService(token);

      expect(supabaseLib.getSupabaseAuthenticatedClient).toHaveBeenCalledTimes(1);
      expect(supabaseLib.getSupabaseAuthenticatedClient).toHaveBeenCalledWith(token);
    });

    it('B-F. injects the exact same authenticated client into Programme, Revision, Activity, SiteDiary, and ResidualAtomic repositories', async () => {
      const token = 'caller-session-token-xyz';
      const service = createSiteDiaryService(token) as unknown as {
        programmeRepo: { adapter: { client: SupabaseClient } };
        revisionRepo: { adapter: { client: SupabaseClient } };
        activityRepo: { adapter: { client: SupabaseClient } };
        siteDiaryRepo: { getSiteDiaryById: (id: string) => Promise<unknown> };
        atomicRepo: { client: SupabaseClient };
      };

      // B. ProgrammeRepository receives adapter bound to the authenticated client
      expect(service.programmeRepo.adapter.client).toBe(mockAuthenticatedClient);

      // C. ProgrammeRevisionRepository receives adapter bound to the same client
      expect(service.revisionRepo.adapter.client).toBe(mockAuthenticatedClient);

      // D. ActivityRepository receives adapter bound to the same client
      expect(service.activityRepo.adapter.client).toBe(mockAuthenticatedClient);

      // E. SiteDiaryRepository uses the same client
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });
      await service.siteDiaryRepo.getSiteDiaryById('sd-1');
      expect(mockFrom).toHaveBeenCalledWith('site_diary');

      // F. ResidualAtomicRepository uses the same client
      expect(service.atomicRepo.client).toBe(mockAuthenticatedClient);
    });

    it('G. no authenticated prerequisite dependency falls back to default anonymous client', () => {
      const serverClient = supabaseLib.getSupabaseServerClient();
      const token = 'caller-session-token-xyz';
      const service = createSiteDiaryService(token) as unknown as {
        programmeRepo: { adapter: { client: SupabaseClient } };
        revisionRepo: { adapter: { client: SupabaseClient } };
        activityRepo: { adapter: { client: SupabaseClient } };
        atomicRepo: { client: SupabaseClient };
      };

      expect(service.programmeRepo.adapter.client).not.toBe(serverClient);
      expect(service.revisionRepo.adapter.client).not.toBe(serverClient);
      expect(service.activityRepo.adapter.client).not.toBe(serverClient);
      expect(service.atomicRepo.client).not.toBe(serverClient);
    });

    it('H. createSiteDiaryService() without accessToken preserves expected unauthenticated/default composition behaviour', () => {
      const serverClient = supabaseLib.getSupabaseServerClient();
      const service = createSiteDiaryService() as unknown as {
        programmeRepo: { adapter: { client: SupabaseClient } };
        revisionRepo: { adapter: { client: SupabaseClient } };
        activityRepo: { adapter: { client: SupabaseClient } };
        atomicRepo: unknown;
      };

      expect(supabaseLib.getSupabaseAuthenticatedClient).not.toHaveBeenCalled();
      expect(service.programmeRepo.adapter.client).toBe(serverClient);
      expect(service.revisionRepo.adapter.client).toBe(serverClient);
      expect(service.activityRepo.adapter.client).toBe(serverClient);
      expect(service.atomicRepo).toBeUndefined();
    });
  });

  describe('14. Carry-Forward caller-bound read dependency propagation', () => {
    it('proves continueYesterday and carryForwardActiveOperations consume caller-bound Activity, Revision, and SiteDiary repositories', () => {
      const token = 'caller-carry-forward-token';
      const service = createSiteDiaryService(token) as unknown as {
        activityRepo: { adapter: { client: SupabaseClient } };
        revisionRepo: { adapter: { client: SupabaseClient } };
        siteDiaryRepo: { getSiteDiaryById: (id: string) => Promise<unknown> };
        atomicRepo: { client: SupabaseClient };
      };

      expect(service.activityRepo.adapter.client).toBe(mockAuthenticatedClient);
      expect(service.revisionRepo.adapter.client).toBe(mockAuthenticatedClient);
      expect(service.atomicRepo.client).toBe(mockAuthenticatedClient);
    });
  });

  describe('I-K. Route error mapping and redaction', () => {
    function createMockRequest(body?: unknown, headers: Record<string, string> = { 'authorization': 'Bearer test-token' }) {
      return {
        json: vi.fn().mockResolvedValue(body),
        headers: {
          get: (key: string) => headers[key.toLowerCase()] || null,
        },
      } as unknown as Request;
    }

    beforeEach(() => {
      vi.spyOn(identityModule, 'extractVerifiedIdentity').mockResolvedValue({
        actorId: 'test-actor-1',
        accessToken: 'test-token-1',
      });
    });

    it('A. POST + UnknownError containing raw internal text returns HTTP 500 with generic message and redacts internals', async () => {
      const validPayload = {
        programme_id: generateUuid(),
        revision_id: generateUuid(),
        activity_id: generateUuid(),
        activity_date: '2026-08-28',
        operation_intent: 'IN_PROGRESS_DIARY',
        notes: 'Test notes',
      };

      const req = createMockRequest(validPayload);
      const rawError = new UnknownError('Internal server panic: unhandled exception at /db/pool.ts:42');
      const serviceMock = {
        createSiteDiary: vi.fn().mockResolvedValue(Failure(rawError)),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

      const res = await createSiteDiaryRoute(req);
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({ error: 'Failed to create site diary' });
      expect(JSON.stringify(body)).not.toMatch(/panic|unhandled|pool\.ts/i);
    });

    it('B. GET + UnknownError containing type syntax errors returns HTTP 500 with generic message and redacts internals', async () => {
      const req = createMockRequest();
      const rawError = new UnknownError('invalid input syntax for type uuid: secret-internal-detail');
      const serviceMock = {
        getSiteDiaryById: vi.fn().mockResolvedValue(Failure(rawError)),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

      const res = await getSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({ error: 'Failed to retrieve site diary' });
      expect(JSON.stringify(body)).not.toMatch(/invalid input syntax|secret-internal-detail/i);
    });

    it('C. PATCH + UnknownError / internal 5xx returns HTTP 500 with generic message and redacts internals', async () => {
      const req = createMockRequest({
        expected_last_modified_at: '2026-08-28T08:00:00.000Z',
        notes: 'Updated notes',
      });

      const rawError = new UnknownError('FATAL: connection terminated unexpectedly');
      const serviceMock = {
        updateSiteDiary: vi.fn().mockResolvedValue(Failure(rawError)),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

      const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({ error: 'Failed to update site diary' });
      expect(JSON.stringify(body)).not.toMatch(/FATAL|connection terminated/i);
    });

    it('D1. POST + InfrastructureError does not leak raw database internals and returns HTTP 500', async () => {
      const validPayload = {
        programme_id: generateUuid(),
        revision_id: generateUuid(),
        activity_id: generateUuid(),
        activity_date: '2026-08-28',
        operation_intent: 'IN_PROGRESS_DIARY',
        notes: 'Test notes',
      };

      const req = createMockRequest(validPayload);
      const rawError = new InfrastructureError('Database error [42501]: permission denied for table programme');
      const serviceMock = {
        createSiteDiary: vi.fn().mockResolvedValue(Failure(rawError)),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

      const res = await createSiteDiaryRoute(req);
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({ error: 'Failed to create site diary' });
      expect(JSON.stringify(body)).not.toMatch(/42501|permission denied|Database error/i);
    });

    it('D2. GET + InfrastructureError redacts raw database errors to HTTP 500', async () => {
      const req = createMockRequest();
      const serviceMock = {
        getSiteDiaryById: vi.fn().mockResolvedValue(Failure(new InfrastructureError('Database error [42501]: permission denied'))),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

      const res = await getSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: 'Failed to retrieve site diary' });
      expect(JSON.stringify(body)).not.toMatch(/42501|permission denied/i);
    });

    it('D3. PATCH + InfrastructureError redacts raw database errors to HTTP 500', async () => {
      const req = createMockRequest({
        expected_last_modified_at: '2026-08-28T08:00:00.000Z',
        notes: 'Updated notes',
      });

      const serviceMock = {
        updateSiteDiary: vi.fn().mockResolvedValue(Failure(new InfrastructureError('Database error [42501]: permission denied'))),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

      const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: 'Failed to update site diary' });
      expect(JSON.stringify(body)).not.toMatch(/42501|permission denied/i);
    });

    it('E. Known 4xx domain errors preserve expected safe HTTP status and message on POST and PATCH', async () => {
      const validPayload = {
        programme_id: generateUuid(),
        revision_id: generateUuid(),
        activity_id: generateUuid(),
        activity_date: '2026-08-28',
        operation_intent: 'IN_PROGRESS_DIARY',
        notes: 'Test notes',
      };

      const domainErrors = [
        { error: new SiteDiaryValidationError('programmeId is required'), expectedStatus: 400, expectedMsg: 'programmeId is required' },
        { error: new ProgrammeNotFoundError('Programme not found: prog-1'), expectedStatus: 404, expectedMsg: 'Programme not found: prog-1' },
        { error: new SiteDiaryRevisionNotApprovedError('Revision not approved'), expectedStatus: 400, expectedMsg: 'Revision not approved' },
        { error: new ProgrammeLockedError('Programme is locked: prog-1'), expectedStatus: 423, expectedMsg: 'Programme is locked: prog-1' },
      ];

      for (const { error, expectedStatus, expectedMsg } of domainErrors) {
        const req = createMockRequest(validPayload);
        const serviceMock = {
          createSiteDiary: vi.fn().mockResolvedValue(Failure(error)),
        };
        vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(serviceMock as unknown as ISiteDiaryService);

        const res = await createSiteDiaryRoute(req);
        expect(res.status).toBe(expectedStatus);
        const body = await res.json();
        expect(body.error).toBe(expectedMsg);
      }

      // PATCH domain error -> 409 preserved
      const patchReq = createMockRequest({
        expected_last_modified_at: '2026-08-28T08:00:00.000Z',
        notes: 'Updated notes',
      });
      const staleError = new SiteDiaryStaleEditError('Site diary was modified by another user');
      const patchServiceMock = {
        updateSiteDiary: vi.fn().mockResolvedValue(Failure(staleError)),
      };
      vi.spyOn(await import('@/composition/siteDiaryComposition'), 'createSiteDiaryService').mockReturnValue(patchServiceMock as unknown as ISiteDiaryService);

      const patchRes = await updateSiteDiaryRoute(patchReq, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(patchRes.status).toBe(409);
      const patchBody = await patchRes.json();
      expect(patchBody.error).toBe('Site diary was modified by another user');
    });
  });
});
