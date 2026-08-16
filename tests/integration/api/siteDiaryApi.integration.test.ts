import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createSiteDiary } from '@/app/api/site-diary/route';
import { POST as carryForward } from '@/app/api/site-diary/carry-forward/route';
import * as siteDiaryComposition from '@/composition/siteDiaryComposition';
import { Success } from '@/lib/result';
import { NextRequest } from 'next/server';

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

describe('Site Diary API Routes', () => {
  const mockCreateSiteDiary = vi.fn();
  const mockContinueYesterday = vi.fn();
  const mockCarryForward = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (siteDiaryComposition.createSiteDiaryService as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      createSiteDiary: mockCreateSiteDiary,
      continueYesterday: mockContinueYesterday,
      carryForwardActiveOperations: mockCarryForward,
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

  describe('POST /api/site-diary', () => {
    it('returns 201 on valid submission', async () => {
      const body = {
        programme_id: '123e4567-e89b-12d3-a456-426614174000',
        revision_id: '123e4567-e89b-12d3-a456-426614174001',
        activity_id: '123e4567-e89b-12d3-a456-426614174002',
        activity_date: '2026-08-11',
        notes: 'Test notes',
      };
      const req = createMockRequest(body);
      
      mockCreateSiteDiary.mockResolvedValue(Success({ id: 'sd-1' }));

      const res = await createSiteDiary(req as unknown as Request);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe('sd-1');
      expect(mockCreateSiteDiary).toHaveBeenCalledWith({
        programmeId: body.programme_id,
        revisionId: body.revision_id,
        activityId: body.activity_id,
        activityDate: body.activity_date,
        notes: body.notes,
        submittedBy: 'test-actor',
      });
    });

    it('returns 400 on malformed input', async () => {
      const body = { programme_id: 'invalid-uuid', notes: '' };
      const req = createMockRequest(body);
      const res = await createSiteDiary(req as unknown as Request);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Validation failed/);
    });

    it('returns 401 if identity missing', async () => {
      const req = createMockRequest({}, {});
      const res = await createSiteDiary(req as unknown as Request);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/site-diary/carry-forward', () => {
    it('returns 200 on single carry-forward success', async () => {
      const body = {
        activityId: '123e4567-e89b-12d3-a456-426614174000',
        targetDate: '2026-08-11',
      };
      const req = createMockRequest(body);
      mockContinueYesterday.mockResolvedValue(Success({ id: 'sd-2' }));

      const res = await carryForward(req as unknown as NextRequest);
      expect(res.status).toBe(200);
      expect(mockContinueYesterday).toHaveBeenCalledWith(body.activityId, body.targetDate, 'test-actor');
    });

    it('returns 200 on batch carry-forward success', async () => {
      const body = {
        programmeId: '123e4567-e89b-12d3-a456-426614174000',
        targetDate: '2026-08-11',
      };
      const req = createMockRequest(body);
      mockCarryForward.mockResolvedValue(Success([{ id: 'sd-3' }]));

      const res = await carryForward(req as unknown as NextRequest);
      expect(res.status).toBe(200);
      expect(mockCarryForward).toHaveBeenCalledWith(body.programmeId, body.targetDate, 'test-actor');
    });

    it('returns 400 on invalid payload', async () => {
      const req = createMockRequest({ targetDate: '2026-08-11' }); // missing activityId or programmeId
      const res = await carryForward(req as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it('returns 401 on missing identity', async () => {
      const req = createMockRequest({ targetDate: '2026-08-11', activityId: '123e4567-e89b-12d3-a456-426614174000' }, {});
      const res = await carryForward(req as unknown as NextRequest);
      expect(res.status).toBe(401);
    });
  });
});
