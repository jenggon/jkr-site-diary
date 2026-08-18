import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractVerifiedIdentity: vi.fn(),
  createService: vi.fn(),
  list: vi.fn(),
  listRevisions: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({
  extractVerifiedIdentity: mocks.extractVerifiedIdentity,
}));
vi.mock('@/composition/siteDiaryManagementComposition', () => ({
  createSiteDiaryManagementReadService: mocks.createService,
}));

import { GET } from '@/app/api/site-diary/revision/[revisionId]/route';
import { GET as getRevisions } from '@/app/api/programme-revision/route';

const programmeId = '00000000-0000-4000-8000-000000000001';
const revisionId = '00000000-0000-4000-8000-000000000002';

describe('GET /api/site-diary/revision/[revisionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractVerifiedIdentity.mockResolvedValue({ actorId: 'actor', accessToken: 'verified-token' });
    mocks.list.mockResolvedValue([]);
    mocks.listRevisions.mockResolvedValue([]);
    mocks.createService.mockReturnValue({ list: mocks.list, listRevisions: mocks.listRevisions });
  });

  it('requires authenticated verified identity', async () => {
    mocks.extractVerifiedIdentity.mockResolvedValue(null);
    const response = await GET(new Request(`http://localhost/api/site-diary/revision/${revisionId}?programmeId=${programmeId}`), {
      params: Promise.resolve({ revisionId }),
    });
    expect(response.status).toBe(401);
    expect(mocks.createService).not.toHaveBeenCalled();
  });

  it('propagates verified access token and server-owned route/query context', async () => {
    const response = await GET(new Request(
      `http://localhost/api/site-diary/revision/${revisionId}?programmeId=${programmeId}&text=bearing`,
    ), { params: Promise.resolve({ revisionId }) });
    expect(response.status).toBe(200);
    expect(mocks.createService).toHaveBeenCalledWith('verified-token');
    expect(mocks.list).toHaveBeenCalledWith({ programmeId, revisionId, text: 'bearing' });
  });

  it('rejects malformed revision and Programme identities before composition', async () => {
    const invalidRevision = await GET(new Request(`http://localhost/api/site-diary/revision/nope?programmeId=${programmeId}`), {
      params: Promise.resolve({ revisionId: 'nope' }),
    });
    const invalidProgramme = await GET(new Request(`http://localhost/api/site-diary/revision/${revisionId}?programmeId=nope`), {
      params: Promise.resolve({ revisionId }),
    });
    expect(invalidRevision.status).toBe(400);
    expect(invalidProgramme.status).toBe(400);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('supports authenticated historical revision discovery with bearer propagation', async () => {
    const response = await getRevisions(new Request(
      `http://localhost/api/programme-revision?programmeId=${programmeId}`,
    ));
    expect(response.status).toBe(200);
    expect(mocks.createService).toHaveBeenCalledWith('verified-token');
    expect(mocks.listRevisions).toHaveBeenCalledWith(programmeId);
  });
});
