import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createSiteDiary } from '@/app/api/site-diary/route';
import { GET as _getSiteDiaryById, PATCH as updateSiteDiary } from '@/app/api/site-diary/[siteDiaryId]/route';
import { POST as carryForward } from '@/app/api/site-diary/carry-forward/route';
import * as identityModule from '@/app/api/_shared/identity';
import * as compositionModule from '@/composition/siteDiaryComposition';
import { Success, Failure } from '@/lib/result';
import { SiteDiaryRevisionNotApprovedError, SiteDiaryStaleEditError } from '@/errors/siteDiaryErrors';
import { generateUuid } from '@/lib/uuid';

vi.mock('@/app/api/_shared/identity');
vi.mock('@/composition/siteDiaryComposition');

describe('Site Diary API Boundaries (A20 Phase 4)', () => {
  const mockService = {
    createSiteDiary: vi.fn(),
    getSiteDiaryById: vi.fn(),
    updateSiteDiary: vi.fn(),
    continueYesterday: vi.fn(),
    carryForwardActiveOperations: vi.fn(),
    getSiteDiariesByActivity: vi.fn(),
    getSiteDiariesByRevision: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    compositionModule.createSiteDiaryService.mockReturnValue(mockService);
  });

  describe('POST /api/site-diary (Create)', () => {
    it('1. Rejects unauthenticated mutation', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue(null);
      const req = new Request('http://localhost/api/site-diary', { method: 'POST', body: JSON.stringify({}) });
      // @ts-ignore
      const res = await createSiteDiary(req);
      expect(res.status).toBe(401);
    });

    it('3. Rejects invalid payload', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      const req = new Request('http://localhost/api/site-diary', { method: 'POST', body: JSON.stringify({ notes: '' }) });
      // @ts-ignore
      const res = await createSiteDiary(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Validation failed');
    });

    it('2. Accepts authenticated valid create and delegates to domain', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.createSiteDiary.mockResolvedValue(Success({ site_diary_id: 'sd-1' }));
      
      const payload = {
        programme_id: generateUuid(),
        revision_id: generateUuid(),
        activity_id: generateUuid(),
        activity_date: '2026-09-01',
        operation_intent: 'IN_PROGRESS_DIARY',
        notes: 'Testing'
      };
      const req = new Request('http://localhost/api/site-diary', { method: 'POST', body: JSON.stringify(payload) });
      // @ts-ignore
      const res = await createSiteDiary(req);
      
      expect(res.status).toBe(201);
      expect(mockService.createSiteDiary).toHaveBeenCalledWith({
        programmeId: payload.programme_id,
        revisionId: payload.revision_id,
        activityId: payload.activity_id,
        activityDate: payload.activity_date,
        operationIntent: 'IN_PROGRESS_DIARY',
        notes: payload.notes,
        submittedBy: 'user-1'
      });
    });

    it('6/7. Maps domain revision/locked errors correctly', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.createSiteDiary.mockResolvedValue(Failure(new SiteDiaryRevisionNotApprovedError('Superseded')));
      
      const payload = {
        programme_id: generateUuid(),
        revision_id: generateUuid(),
        activity_id: generateUuid(),
        activity_date: '2026-09-01',
        operation_intent: 'IN_PROGRESS_DIARY',
        notes: 'Testing'
      };
      const req = new Request('http://localhost/api/site-diary', { method: 'POST', body: JSON.stringify(payload) });
      const res = await createSiteDiary(req as unknown as Request);
      
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Superseded');
    });
  });

  describe('PATCH /api/site-diary/[siteDiaryId]', () => {
    it('1. Rejects unauthenticated mutation', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue(null);
      const req = new Request('http://localhost/api/site-diary/sd-1', { method: 'PATCH', body: JSON.stringify({}) });
      // @ts-ignore
      const res = await updateSiteDiary(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(401);
    });

    it('requires a concurrency token', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      const req = new Request('http://localhost/api/site-diary/sd-1', {
        method: 'PATCH', body: JSON.stringify({ notes: 'Updated' }),
      });
      const res = await updateSiteDiary(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(400);
      expect(mockService.updateSiteDiary).not.toHaveBeenCalled();
    });

    it('rejects a malformed concurrency token', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      const req = new Request('http://localhost/api/site-diary/sd-1', {
        method: 'PATCH', body: JSON.stringify({ notes: 'Updated', expected_last_modified_at: 'yesterday' }),
      });
      const res = await updateSiteDiary(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(400);
      expect(mockService.updateSiteDiary).not.toHaveBeenCalled();
    });

    it('maps the dedicated stale-edit domain error to HTTP 409', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.updateSiteDiary.mockResolvedValue(Failure(new SiteDiaryStaleEditError()));
      const req = new Request('http://localhost/api/site-diary/sd-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated', expected_last_modified_at: '2026-08-16T08:00:00.000Z' }),
      });
      const res = await updateSiteDiary(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(409);
    });

    it('returns the newly committed canonical token after success', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.updateSiteDiary.mockResolvedValue(Success({
        site_diary_id: 'sd-1', submitted_at: '2026-08-16T08:00:00.000Z', updated_at: '2026-08-16T09:00:00.000Z',
      }));
      const req = new Request('http://localhost/api/site-diary/sd-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated', expected_last_modified_at: '2026-08-16T08:00:00.000Z' }),
      });
      const res = await updateSiteDiary(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual(expect.objectContaining({
        data: expect.objectContaining({ lastModifiedAt: '2026-08-16T09:00:00.000Z' }),
      }));
    });

    it('8. Ignores client attempts to manipulate status (status not in schema)', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.updateSiteDiary.mockResolvedValue(Success({ site_diary_id: 'sd-1' }));
      
      const req = new Request('http://localhost/api/site-diary/sd-1', { 
        method: 'PATCH', 
        body: JSON.stringify({
          notes: 'Updated',
          status: 'Approved',
          expected_last_modified_at: '2026-08-16T08:00:00.000Z',
        })
      });
      // @ts-ignore
      const res = await updateSiteDiary(req, { params: Promise.resolve({ siteDiaryId: 'sd-1' }) });
      
      expect(res.status).toBe(200);
      expect(mockService.updateSiteDiary).toHaveBeenCalledWith(expect.not.objectContaining({ status: 'Approved' }));
    });
  });

  describe('POST /api/site-diary/carry-forward', () => {
    it('11. Works for valid current Activity (specific activity)', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.continueYesterday.mockResolvedValue(Success({ site_diary_id: 'sd-2' }));
      
      const payload = { activityId: generateUuid(), targetDate: '2026-09-02' };
      const req = new Request('http://localhost/api/site-diary/carry-forward', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      });
      // @ts-ignore
      const res = await carryForward(req);
      
      expect(res.status).toBe(200);
      expect(mockService.continueYesterday).toHaveBeenCalledWith(payload.activityId, '2026-09-02', 'user-1');
    });

    it('13. Works for bulk carry-forward (programme)', async () => {
      vi.mocked(identityModule.extractVerifiedIdentity).mockResolvedValue({ actorId: 'user-1', accessToken: 'token-1' });
      mockService.carryForwardActiveOperations.mockResolvedValue(Success([{ site_diary_id: 'sd-3' }]));
      
      const payload = { programmeId: generateUuid(), targetDate: '2026-09-02' };
      const req = new Request('http://localhost/api/site-diary/carry-forward', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      });
      // @ts-ignore
      const res = await carryForward(req);
      
      expect(res.status).toBe(200);
      expect(mockService.carryForwardActiveOperations).toHaveBeenCalledWith(payload.programmeId, '2026-09-02', 'user-1');
    });
  });
});
