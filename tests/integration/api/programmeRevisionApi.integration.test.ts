import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as createRevision } from '@/app/api/programme-revision/route';
import { POST as approveRevision } from '@/app/api/programme-revision/[revisionId]/approve/route';
import { POST as archiveRevision } from '@/app/api/programme-revision/[revisionId]/archive/route';
import * as programmeComposition from '@/composition/programmeComposition';
import { Success, Failure } from '@/lib/result';
import { ProgrammeNotFoundError } from '@/errors/programmeErrors';

vi.mock('@/composition/programmeComposition', () => ({
  createProgrammeService: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractIdentity: vi.fn(async (req) => {
    const auth = req.headers?.get?.('authorization') || req.headers?.['authorization'] || req.headers?.get?.('x-user-id') || req.headers?.['x-user-id'];
    if (!auth) return null;
    return 'test-actor';
  }),
}));

describe('Programme Revision API Routes', () => {
  const mockService = {
    createRevision: vi.fn(),
    approveRevision: vi.fn(),
    archiveRevision: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (programmeComposition.createProgrammeService as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockService);
  });

  function createMockRequest(body?: unknown, headers: Record<string, string> = { 'x-user-id': 'test-actor' }) {
    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: (key: string) => headers[key.toLowerCase()] || null,
      },
    } as unknown as Request;
  }

  describe('POST /api/programme-revision', () => {
    it('returns 201 on valid submission', async () => {
      const body = {
        programmeId: '123e4567-e89b-12d3-a456-426614174000',
        revisionTitle: 'Rev 1',
      };
      const req = createMockRequest(body);
      mockService.createRevision.mockResolvedValue(Success({ revisionId: 'r-1', ...body }));

      const res = await createRevision(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.revisionId).toBe('r-1');
      expect(mockService.createRevision).toHaveBeenCalledWith({
        ...body,
        createdBy: 'test-actor',
      });
    });

    it('returns 400 on malformed input (missing title)', async () => {
      const body = { programmeId: '123e4567-e89b-12d3-a456-426614174000' };
      const req = createMockRequest(body);
      const res = await createRevision(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/Validation failed/);
    });

    it('returns 401 if identity missing', async () => {
      const req = createMockRequest({}, {});
      const res = await createRevision(req);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/programme-revision/[revisionId]/approve', () => {
    it('returns 200 on success', async () => {
      const req = createMockRequest();
      const ctx = { params: Promise.resolve({ revisionId: '123e4567-e89b-12d3-a456-426614174001' }) };
      mockService.approveRevision.mockResolvedValue(Success({ revisionId: 'r-1', status: 'Approved' }));

      const res = await approveRevision(req, ctx);
      expect(res.status).toBe(200);
      expect(mockService.approveRevision).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001', 'test-actor');
    });

    it('returns 400 on invalid revisionId UUID', async () => {
      const req = createMockRequest();
      const ctx = { params: Promise.resolve({ revisionId: 'not-a-uuid' }) };
      const res = await approveRevision(req, ctx);
      expect(res.status).toBe(400);
    });

    it('returns 404 if revision not found', async () => {
      const req = createMockRequest();
      const ctx = { params: Promise.resolve({ revisionId: '123e4567-e89b-12d3-a456-426614174001' }) };
      mockService.approveRevision.mockResolvedValue(Failure(new ProgrammeNotFoundError('Not found')));

      const res = await approveRevision(req, ctx);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/programme-revision/[revisionId]/archive', () => {
    it('returns 200 on success', async () => {
      const req = createMockRequest();
      const ctx = { params: Promise.resolve({ revisionId: '123e4567-e89b-12d3-a456-426614174001' }) };
      mockService.archiveRevision.mockResolvedValue(Success({ revisionId: 'r-1', status: 'Archived' }));

      const res = await archiveRevision(req, ctx);
      expect(res.status).toBe(200);
      expect(mockService.archiveRevision).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001', 'test-actor');
    });
  });
});
