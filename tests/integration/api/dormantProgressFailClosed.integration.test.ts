/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createProgressService: vi.fn(),
  approvalService: {
    getApprovalsByProgress: vi.fn(),
  },
  extractVerifiedIdentity: vi.fn(),
  supabaseCreateClient: vi.fn(),
}));

vi.mock('@/composition/progressComposition', () => ({
  createProgressService: mocks.createProgressService,
}));

vi.mock('@/composition/approvalComposition', () => ({
  approvalService: mocks.approvalService,
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.supabaseCreateClient,
}));

import { POST as postProgress } from '@/app/api/progress/route';
import { GET as getProgressById, PATCH as patchProgressById } from '@/app/api/progress/[progressId]/route';
import { GET as getProgressByActivity } from '@/app/api/progress/activity/[activityId]/route';
import { GET as getProgressByMeasurementDate } from '@/app/api/progress/measurement-date/[measurementDate]/route';
import { GET as getProgressBySiteDiary } from '@/app/api/progress/site-diary/[siteDiaryId]/route';
import { GET as getApprovalByProgress } from '@/app/api/approval/progress/[progressId]/route';

describe('Dormant Progress HTTP Surface Fail-Closed (F2.7-C09-D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const invalidUuid = 'not-a-valid-uuid-12345';
  const arbitraryDate = '2026-08-28';

  const callerContexts = [
    {
      name: 'unauthenticated caller',
      setupIdentity: () => mocks.extractVerifiedIdentity.mockResolvedValue(null),
      headers: {},
    },
    {
      name: 'authenticated Programme member',
      setupIdentity: () =>
        mocks.extractVerifiedIdentity.mockResolvedValue({
          actorId: 'programme-member-uuid',
          accessToken: 'valid-member-jwt',
        }),
      headers: { authorization: 'Bearer member-token' },
    },
    {
      name: 'authenticated foreign caller',
      setupIdentity: () =>
        mocks.extractVerifiedIdentity.mockResolvedValue({
          actorId: 'foreign-user-uuid',
          accessToken: 'valid-foreign-jwt',
        }),
      headers: { authorization: 'Bearer foreign-token' },
    },
  ];

  function makeRequest(url: string, method: string = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    const init: RequestInit = {
      method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return new Request(url, init);
  }

  describe('Route Matrix across Caller Identities', () => {
    callerContexts.forEach(({ name, setupIdentity, headers }) => {
      describe(`Caller: ${name}`, () => {
        beforeEach(() => {
          setupIdentity();
        });

        it('POST /api/progress -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(
            'http://localhost:3000/api/progress',
            'POST',
            {
              programme_id: validUuid,
              revision_id: validUuid,
              activity_id: validUuid,
              site_diary_id: validUuid,
              measurement_date: '2026-08-28',
              actual_quantity: 100,
            },
            headers
          );
          const res = await (postProgress as any)(req);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });

        it('GET /api/progress/[progressId] -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(`http://localhost:3000/api/progress/${validUuid}`, 'GET', undefined, headers);
          const ctx = { params: Promise.resolve({ progressId: validUuid }) };
          const res = await (getProgressById as any)(req, ctx);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });

        it('PATCH /api/progress/[progressId] -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(
            `http://localhost:3000/api/progress/${validUuid}`,
            'PATCH',
            { actual_quantity: 200 },
            headers
          );
          const ctx = { params: Promise.resolve({ progressId: validUuid }) };
          const res = await (patchProgressById as any)(req, ctx);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });

        it('GET /api/progress/activity/[activityId] -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(`http://localhost:3000/api/progress/activity/${validUuid}`, 'GET', undefined, headers);
          const ctx = { params: Promise.resolve({ activityId: validUuid }) };
          const res = await (getProgressByActivity as any)(req, ctx);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });

        it('GET /api/progress/measurement-date/[measurementDate] -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(`http://localhost:3000/api/progress/measurement-date/${arbitraryDate}`, 'GET', undefined, headers);
          const ctx = { params: Promise.resolve({ measurementDate: arbitraryDate }) };
          const res = await (getProgressByMeasurementDate as any)(req, ctx);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });

        it('GET /api/progress/site-diary/[siteDiaryId] -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(`http://localhost:3000/api/progress/site-diary/${validUuid}`, 'GET', undefined, headers);
          const ctx = { params: Promise.resolve({ siteDiaryId: validUuid }) };
          const res = await (getProgressBySiteDiary as any)(req, ctx);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });

        it('GET /api/approval/progress/[progressId] -> 404 { error: "Not Found" }', async () => {
          const req = makeRequest(`http://localhost:3000/api/approval/progress/${validUuid}`, 'GET', undefined, headers);
          const ctx = { params: Promise.resolve({ progressId: validUuid }) };
          const res = await (getApprovalByProgress as any)(req, ctx);
          expect(res.status).toBe(404);
          expect(await res.json()).toEqual({ error: 'Not Found' });
        });
      });
    });
  });

  describe('Proof D & E: createProgressService and Repository are NOT invoked', () => {
    it('does not invoke createProgressService or database on any route', async () => {
      mocks.extractVerifiedIdentity.mockResolvedValue({
        actorId: 'actor-1',
        accessToken: 'token-1',
      });

      const reqPost = makeRequest('http://localhost:3000/api/progress', 'POST', { actual_quantity: 10 });
      await (postProgress as any)(reqPost);

      const reqGet = makeRequest(`http://localhost:3000/api/progress/${validUuid}`);
      await (getProgressById as any)(reqGet, { params: Promise.resolve({ progressId: validUuid }) });

      const reqPatch = makeRequest(`http://localhost:3000/api/progress/${validUuid}`, 'PATCH', { actual_quantity: 20 });
      await (patchProgressById as any)(reqPatch, { params: Promise.resolve({ progressId: validUuid }) });

      const reqAct = makeRequest(`http://localhost:3000/api/progress/activity/${validUuid}`);
      await (getProgressByActivity as any)(reqAct, { params: Promise.resolve({ activityId: validUuid }) });

      const reqDate = makeRequest(`http://localhost:3000/api/progress/measurement-date/${arbitraryDate}`);
      await (getProgressByMeasurementDate as any)(reqDate, { params: Promise.resolve({ measurementDate: arbitraryDate }) });

      const reqDiary = makeRequest(`http://localhost:3000/api/progress/site-diary/${validUuid}`);
      await (getProgressBySiteDiary as any)(reqDiary, { params: Promise.resolve({ siteDiaryId: validUuid }) });

      expect(mocks.createProgressService).not.toHaveBeenCalled();
      expect(mocks.supabaseCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('Proof F: Approval Progress legacy service/read is NOT invoked', () => {
    it('does not invoke approvalService.getApprovalsByProgress', async () => {
      const req = makeRequest(`http://localhost:3000/api/approval/progress/${validUuid}`);
      const ctx = { params: Promise.resolve({ progressId: validUuid }) };
      const res = await (getApprovalByProgress as any)(req, ctx);

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not Found' });
      expect(mocks.approvalService.getApprovalsByProgress).not.toHaveBeenCalled();
    });
  });

  describe('Proof G: POST and PATCH produce ZERO mutation side effects', () => {
    it('guarantees no mutations on POST or PATCH regardless of input payload', async () => {
      const payloads = [
        {},
        { random: 'data' },
        { programme_id: validUuid, revision_id: validUuid, actual_quantity: 999 },
      ];

      for (const payload of payloads) {
        const postRes = await (postProgress as any)(
          makeRequest('http://localhost:3000/api/progress', 'POST', payload)
        );
        expect(postRes.status).toBe(404);
        expect(await postRes.json()).toEqual({ error: 'Not Found' });

        const patchRes = await (patchProgressById as any)(
          makeRequest(`http://localhost:3000/api/progress/${validUuid}`, 'PATCH', payload),
          { params: Promise.resolve({ progressId: validUuid }) }
        );
        expect(patchRes.status).toBe(404);
        expect(await patchRes.json()).toEqual({ error: 'Not Found' });
      }

      expect(mocks.createProgressService).not.toHaveBeenCalled();
      expect(mocks.supabaseCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('Proof H: Arbitrary valid and invalid UUID path parameters behave identically', () => {
    it.each([
      ['valid UUID', validUuid],
      ['invalid UUID', invalidUuid],
      ['empty string parameter', ''],
      ['special characters', '..%2F..%2Fattack'],
      ['nil UUID', '00000000-0000-0000-0000-000000000000'],
    ])('handles %s (%s) identically with 404 { error: "Not Found" }', async (_label, param) => {
      const getRes = await (getProgressById as any)(
        makeRequest(`http://localhost:3000/api/progress/${param}`),
        { params: Promise.resolve({ progressId: param }) }
      );
      expect(getRes.status).toBe(404);
      expect(await getRes.json()).toEqual({ error: 'Not Found' });

      const patchRes = await (patchProgressById as any)(
        makeRequest(`http://localhost:3000/api/progress/${param}`, 'PATCH', {}),
        { params: Promise.resolve({ progressId: param }) }
      );
      expect(patchRes.status).toBe(404);
      expect(await patchRes.json()).toEqual({ error: 'Not Found' });

      const actRes = await (getProgressByActivity as any)(
        makeRequest(`http://localhost:3000/api/progress/activity/${param}`),
        { params: Promise.resolve({ activityId: param }) }
      );
      expect(actRes.status).toBe(404);
      expect(await actRes.json()).toEqual({ error: 'Not Found' });

      const diaryRes = await (getProgressBySiteDiary as any)(
        makeRequest(`http://localhost:3000/api/progress/site-diary/${param}`),
        { params: Promise.resolve({ siteDiaryId: param }) }
      );
      expect(diaryRes.status).toBe(404);
      expect(await diaryRes.json()).toEqual({ error: 'Not Found' });

      const appRes = await (getApprovalByProgress as any)(
        makeRequest(`http://localhost:3000/api/approval/progress/${param}`),
        { params: Promise.resolve({ progressId: param }) }
      );
      expect(appRes.status).toBe(404);
      expect(await appRes.json()).toEqual({ error: 'Not Found' });
    });
  });

  describe('Proof I: No raw internal, PostgREST, or database text leakage', () => {
    it('returns only sanitized generic { error: "Not Found" } without internal details', async () => {
      const routes = [
        () => (postProgress as any)(makeRequest('http://localhost:3000/api/progress', 'POST')),
        () => (getProgressById as any)(makeRequest(`http://localhost:3000/api/progress/${validUuid}`), { params: Promise.resolve({ progressId: validUuid }) }),
        () => (patchProgressById as any)(makeRequest(`http://localhost:3000/api/progress/${validUuid}`, 'PATCH'), { params: Promise.resolve({ progressId: validUuid }) }),
        () => (getProgressByActivity as any)(makeRequest(`http://localhost:3000/api/progress/activity/${validUuid}`), { params: Promise.resolve({ activityId: validUuid }) }),
        () => (getProgressByMeasurementDate as any)(makeRequest(`http://localhost:3000/api/progress/measurement-date/${arbitraryDate}`), { params: Promise.resolve({ measurementDate: arbitraryDate }) }),
        () => (getProgressBySiteDiary as any)(makeRequest(`http://localhost:3000/api/progress/site-diary/${validUuid}`), { params: Promise.resolve({ siteDiaryId: validUuid }) }),
        () => (getApprovalByProgress as any)(makeRequest(`http://localhost:3000/api/approval/progress/${validUuid}`), { params: Promise.resolve({ progressId: validUuid }) }),
      ];

      for (const routeCall of routes) {
        const res = await routeCall();
        const json = await res.json();
        expect(json).toEqual({ error: 'Not Found' });
        const bodyStr = JSON.stringify(json);
        expect(bodyStr).not.toMatch(/supabase|postgres|sqlstate|relation|table|schema|column|syntax|error code|exception/i);
      }
    });
  });
});
