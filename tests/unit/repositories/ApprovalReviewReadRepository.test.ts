import { describe, expect, it, vi } from 'vitest';
import { ApprovalReviewReadRepository } from '@/repositories/ApprovalReviewReadRepository';

describe('ApprovalReviewReadRepository', () => {
  it('sends only the exact approval ID to the authenticated RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ approval_id: 'approval-A' }],
      error: null,
    }));
    const repository = new ApprovalReviewReadRepository({ rpc } as never);

    await expect(repository.getExact('approval-A')).resolves.toMatchObject({ approval_id: 'approval-A' });
    expect(rpc).toHaveBeenCalledWith('f24_get_site_diary_approval_review', {
      p_approval_id: 'approval-A',
    });
  });

  it.each([
    ['PT403', 'F24_UNAUTHORIZED_CAPABILITY', 403],
    ['PT404', 'F24_SITE_DIARY_APPROVAL_REVIEW_NOT_FOUND', 404],
  ])('maps %s to stable HTTP semantics', async (code, message, status) => {
    const repository = new ApprovalReviewReadRepository({
      rpc: vi.fn(async () => ({ data: null, error: { code, message } })),
    } as never);

    await expect(repository.getExact('approval-A')).rejects.toMatchObject({ status });
  });

  it('rejects a non-exact or non-single RPC result', async () => {
    const repository = new ApprovalReviewReadRepository({
      rpc: vi.fn(async () => ({ data: [{ approval_id: 'approval-B' }], error: null })),
    } as never);

    await expect(repository.getExact('approval-A')).rejects.toMatchObject({ status: 404 });
  });
});
