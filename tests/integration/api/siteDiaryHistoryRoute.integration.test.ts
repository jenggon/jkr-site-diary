import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ identity: vi.fn(), create: vi.fn(), getHistory: vi.fn() }));
vi.mock('@/app/api/_shared/identity', () => ({ extractVerifiedIdentity: mocks.identity }));
vi.mock('@/composition/siteDiaryManagementComposition', () => ({ createSiteDiaryHistoryService: mocks.create }));

import { GET } from '@/app/api/site-diary/[siteDiaryId]/history/route';

const id = '00000000-0000-4000-8000-000000000005';

describe('GET /api/site-diary/[siteDiaryId]/history', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.identity.mockResolvedValue({ actorId: 'server-actor', accessToken: 'verified-token' }); mocks.create.mockReturnValue({ getHistory: mocks.getHistory }); mocks.getHistory.mockResolvedValue({ siteDiaryId: id, events: [] }); });
  it('requires verified authentication', async () => {
    mocks.identity.mockResolvedValue(null);
    const response = await GET(new Request(`http://localhost/api/site-diary/${id}/history`), { params: Promise.resolve({ siteDiaryId: id }) });
    expect(response.status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('propagates bearer and exact canonical diary identity without client actor input', async () => {
    const response = await GET(new Request(`http://localhost/api/site-diary/${id}/history`), { params: Promise.resolve({ siteDiaryId: id }) });
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith('verified-token');
    expect(mocks.getHistory).toHaveBeenCalledWith(id);
  });
  it('rejects malformed identities before repository composition', async () => {
    const response = await GET(new Request('http://localhost/api/site-diary/nope/history'), { params: Promise.resolve({ siteDiaryId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
