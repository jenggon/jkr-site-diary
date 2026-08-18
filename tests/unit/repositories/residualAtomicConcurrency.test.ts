import { describe, expect, it, vi } from 'vitest';
import { ResidualAtomicRepository } from '@/repositories/atomic/ResidualAtomicRepository';
import { SiteDiaryStaleEditError } from '@/errors/siteDiaryErrors';

describe('ResidualAtomicRepository Site Diary concurrency', () => {
  it('forwards expected token as RPC authority, not payload data', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { site_diary_id: 'sd-1' }, error: null });
    const repository = new ResidualAtomicRepository({ rpc } as never);
    await repository.updateSiteDiary('sd-1', { notes: 'V2' }, 'actor-1', '2026-08-16T08:00:00.000Z');
    expect(rpc).toHaveBeenCalledWith('f1_update_site_diary_full_atomic', expect.objectContaining({
      p_site_diary_id: 'sd-1', p_payload: { notes: 'V2' },
      p_expected_last_modified_at: '2026-08-16T08:00:00.000Z',
    }));
  });

  it('maps stable PT409 without English-message inspection', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: 'PT409', message: 'anything' } });
    const repository = new ResidualAtomicRepository({ rpc } as never);
    await expect(repository.updateSiteDiary('sd-1', {}, 'actor-1', '2026-08-16T08:00:00.000Z'))
      .rejects.toBeInstanceOf(SiteDiaryStaleEditError);
  });
});
