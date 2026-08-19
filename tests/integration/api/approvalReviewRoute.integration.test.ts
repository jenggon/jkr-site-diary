import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  getExact: vi.fn(),
  createRepository: vi.fn(),
}));

vi.mock('@/app/api/_shared/identity', () => ({ extractVerifiedIdentity: mocks.identity }));
vi.mock('@/composition/approvalComposition', () => ({
  createApprovalReviewRepository: mocks.createRepository,
}));

import { GET } from '@/app/api/approval/[approvalId]/review/route';
import { ApprovalReviewReadError } from '@/repositories/ApprovalReviewReadRepository';

const context = { params: Promise.resolve({ approvalId: 'approval-A' }) };

describe('GET /api/approval/[approvalId]/review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity.mockResolvedValue({ actorId: 'actor-A', accessToken: 'verified-token' });
    mocks.createRepository.mockReturnValue({ getExact: mocks.getExact });
  });

  it('returns 401 without verified identity', async () => {
    mocks.identity.mockResolvedValue(null);
    const response = await GET(new Request('http://local/api/approval/approval-A/review'), context);
    expect(response.status).toBe(401);
    expect(mocks.createRepository).not.toHaveBeenCalled();
  });

  it.each([
    [403, 'Forbidden'],
    [404, 'Approval review not found'],
    [500, 'Failed to retrieve approval review'],
  ] as const)('returns stable %i with minimal leakage', async (status, message) => {
    mocks.getExact.mockRejectedValue(new ApprovalReviewReadError(status, 'internal-detail'));
    const response = await GET(new Request('http://local/api/approval/approval-A/review'), context);
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: message });
  });

  it('uses the token-bound repository for the exact approval', async () => {
    mocks.getExact.mockResolvedValue({ approval_id: 'approval-A', site_diary_id: 'diary-A' });
    const response = await GET(new Request('http://local/api/approval/approval-A/review'), context);
    expect(response.status).toBe(200);
    expect(mocks.createRepository).toHaveBeenCalledWith('verified-token');
    expect(mocks.getExact).toHaveBeenCalledWith('approval-A');
  });
});
