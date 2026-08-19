import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH as updateSiteDiaryRoute } from '@/app/api/site-diary/[siteDiaryId]/route';
import { submitDailyEntry } from '@/app/site-diary/DailyEntryForm';
import { SiteDiarySealedError, SiteDiaryStaleEditError } from '@/errors/siteDiaryErrors';
import * as siteDiaryComposition from '@/composition/siteDiaryComposition';
import { Failure, Success } from '@/lib/result';
import { UnknownError } from '@/lib/errors';

vi.mock('@/composition/siteDiaryComposition', () => ({
  createSiteDiaryService: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization') || req.headers?.['authorization'] || req.headers?.get?.('x-user-id') || req.headers?.['x-user-id'];
    if (!auth) return null;
    return { actorId: 'test-actor', accessToken: 'test-token' };
  }),
}));

describe('Site Diary Sealing and Conflict HTTP Propagation', () => {
  const mockUpdateSiteDiary = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (siteDiaryComposition.createSiteDiaryService as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      updateSiteDiary: mockUpdateSiteDiary,
    });
  });

  function createMockRequest(body?: unknown, headers: Record<string, string> = { 'x-user-id': 'test-actor' }) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: (key: string) => headers[key.toLowerCase()] || null,
      },
    } as unknown as Request;
  }

  it('surfaces Pending/Approved Approval sealed edit as HTTP 409 Conflict', async () => {
    mockUpdateSiteDiary.mockResolvedValue(
      Failure(new SiteDiarySealedError('Site diary is sealed by an active approval and cannot be modified'))
    );

    const req = createMockRequest({
      expected_last_modified_at: '2026-08-18T08:00:00.000Z',
      notes: 'Attempted edit during Pending/Approved approval',
    });

    const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-sealed' }) });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('Site diary is sealed by an active approval and cannot be modified');
  });

  it('surfaces F2.3 Stale Edit conflict as HTTP 409 Conflict', async () => {
    mockUpdateSiteDiary.mockResolvedValue(
      Failure(new SiteDiaryStaleEditError('Site diary was modified by another user'))
    );

    const req = createMockRequest({
      expected_last_modified_at: '2026-08-18T08:00:00.000Z',
      notes: 'Attempted edit with stale token',
    });

    const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-stale' }) });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe('Site diary was modified by another user');
  });

  it('surfaces malformed/missing token as HTTP 400 Bad Request', async () => {
    const req = createMockRequest({
      notes: 'Missing expected_last_modified_at',
    });

    const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Validation failed');
    expect(mockUpdateSiteDiary).not.toHaveBeenCalled();
  });

  it('surfaces unexpected DB errors as HTTP 500, NOT 409 conflict', async () => {
    mockUpdateSiteDiary.mockResolvedValue(
      Failure(new UnknownError('DB connection pool exhausted'))
    );

    const req = createMockRequest({
      expected_last_modified_at: '2026-08-18T08:00:00.000Z',
      notes: 'Valid edit but DB crashed',
    });

    const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('DB connection pool exhausted');
  });

  it('allows edit when Site Diary is unsealed (e.g. Returned Approval or No Approval)', async () => {
    mockUpdateSiteDiary.mockResolvedValue(
      Success({
        site_diary_id: 'sd-returned',
        notes: 'Updated after return',
        updated_at: '2026-08-18T09:00:00.000Z',
      })
    );

    const req = createMockRequest({
      expected_last_modified_at: '2026-08-18T08:00:00.000Z',
      notes: 'Updated after return',
    });

    const res = await updateSiteDiaryRoute(req, { params: Promise.resolve({ siteDiaryId: 'sd-returned' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.site_diary_id).toBe('sd-returned');
    expect(json.data.lastModifiedAt).toBe('2026-08-18T09:00:00.000Z');
  });

  describe('UI DailyEntryForm sealed edit behavior', () => {
    it('triggers zero fallback POST and preserves unsaved form state when sealed edit returns 409', async () => {
      const calls: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
      const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({
          url: input.toString(),
          method: init?.method ?? 'GET',
          body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        });
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'Site diary is sealed by an active approval and cannot be modified' }),
        } as Response;
      });

      const unsavedParams = {
        programmeId: 'p-1',
        revisionId: 'r-1',
        selectedSource: null,
        activityDate: '2026-08-18',
        actualStartDate: '2026-08-18',
        workStatus: 'Sedang Laksana' as const,
        location: 'Bridge Pier 4',
        contractorScope: 'CONTRACTOR' as const,
        notes: 'Unsaved note in sealed diary',
        manpower: [{ trade_name: 'Barbender', bumi_count: 3, non_bumi_count: 0, foreign_count: 0 }],
        editingSiteDiaryId: 'sd-sealed-ui',
        editingActivityId: null,
        expectedLastModifiedAt: '2026-08-18T08:00:00.000Z',
        fetchFn,
      };

      await expect(submitDailyEntry(unsavedParams)).rejects.toThrow();

      // Proves EXACTLY 1 call was made (PATCH only, ZERO POST fallback)
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe('PATCH');
      expect(calls[0]?.url).toBe('/api/site-diary/sd-sealed-ui');
      expect(calls.some((c) => c.method === 'POST')).toBe(false);

      // Proves form input fields were preserved
      expect(unsavedParams.notes).toBe('Unsaved note in sealed diary');
      expect(unsavedParams.location).toBe('Bridge Pier 4');
      expect(unsavedParams.manpower).toEqual([
        { trade_name: 'Barbender', bumi_count: 3, non_bumi_count: 0, foreign_count: 0 },
      ]);
    });
  });
});
