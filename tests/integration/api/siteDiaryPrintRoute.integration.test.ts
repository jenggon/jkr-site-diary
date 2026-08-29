import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractVerifiedIdentity: vi.fn(),
  createRepository: vi.fn(),
  getExact: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));
vi.mock('@/composition/siteDiaryPrintComposition', () => ({
  createSiteDiaryPrintReadRepository: mocks.createRepository,
}));

import { GET } from '@/app/api/site-diary/[siteDiaryId]/print/route';
import { SiteDiaryPrintReadError } from '@/repositories/SiteDiaryPrintReadRepository';

const validSiteDiaryId = '00000000-0000-4000-8000-000000000001';

describe('GET /api/site-diary/[siteDiaryId]/print', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractVerifiedIdentity.mockResolvedValue({
      actorId: 'actor-1',
      accessToken: 'token-xyz',
    });
    mocks.getExact.mockResolvedValue({
      siteDiaryId: validSiteDiaryId,
      programmeId: 'prog-1',
      revisionId: 'rev-1',
      activityDate: '2026-08-20',
      wbs: '1.1',
      taskName: 'Excavation',
    });
    mocks.createRepository.mockReturnValue({
      getExact: mocks.getExact,
    });
  });

  it('rejects unauthenticated anonymous request with 401', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/site-diary/${validSiteDiaryId}/print`),
      { params: Promise.resolve({ siteDiaryId: validSiteDiaryId }) }
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
    expect(mocks.createRepository).not.toHaveBeenCalled();
  });

  it('rejects malformed non-UUID siteDiaryId parameter with 400', async () => {
    const invalidId = 'not-a-uuid';
    const response = await GET(
      new Request(`http://localhost/api/site-diary/${invalidId}/print`),
      { params: Promise.resolve({ siteDiaryId: invalidId }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing or invalid route parameter: siteDiaryId');
    expect(mocks.createRepository).not.toHaveBeenCalled();
  });

  it('propagates verified token and actor identity to exact-read repository', async () => {
    const response = await GET(
      new Request(`http://localhost/api/site-diary/${validSiteDiaryId}/print`),
      { params: Promise.resolve({ siteDiaryId: validSiteDiaryId }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.createRepository).toHaveBeenCalledWith('token-xyz');
    expect(mocks.getExact).toHaveBeenCalledWith(validSiteDiaryId, 'actor-1');

    const body = await response.json();
    expect(body.data.siteDiaryId).toBe(validSiteDiaryId);
    expect(body.data.taskName).toBe('Excavation');
  });

  it('maps 403 Forbidden errors when actor is not authorized for programme', async () => {
    mocks.getExact.mockRejectedValue(
      new SiteDiaryPrintReadError(403, 'Forbidden: Not authorized for programme')
    );

    const response = await GET(
      new Request(`http://localhost/api/site-diary/${validSiteDiaryId}/print`),
      { params: Promise.resolve({ siteDiaryId: validSiteDiaryId }) }
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden: Not authorized for programme');
  });

  it('maps 404 Not Found when site diary record does not exist', async () => {
    mocks.getExact.mockRejectedValue(
      new SiteDiaryPrintReadError(404, 'Site diary record not found')
    );

    const response = await GET(
      new Request(`http://localhost/api/site-diary/${validSiteDiaryId}/print`),
      { params: Promise.resolve({ siteDiaryId: validSiteDiaryId }) }
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Site diary record not found');
  });

  it('maps unexpected repository errors to 500 status without leaking raw message', async () => {
    mocks.getExact.mockRejectedValue(new Error('Unexpected DB timeout'));

    const response = await GET(
      new Request(`http://localhost/api/site-diary/${validSiteDiaryId}/print`),
      { params: Promise.resolve({ siteDiaryId: validSiteDiaryId }) }
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Internal server error occurred while retrieving print data');
  });
});
