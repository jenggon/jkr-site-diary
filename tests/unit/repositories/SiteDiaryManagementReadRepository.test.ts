import { describe, expect, it, vi } from 'vitest';
import { SiteDiaryManagementReadRepository } from '@/repositories/SiteDiaryManagementReadRepository';

describe('SiteDiaryManagementReadRepository', () => {
  it('applies deterministic date-descending then diary-identity-ascending ordering', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn()
      .mockImplementationOnce(() => query)
      .mockResolvedValueOnce({ data: [], error: null });
    const client = { from: vi.fn(() => query) };
    await new SiteDiaryManagementReadRepository(client as never).findDiaries('programme', 'revision');
    expect(query.eq).toHaveBeenNthCalledWith(1, 'programme_id', 'programme');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'revision_id', 'revision');
    expect(query.order).toHaveBeenNthCalledWith(1, 'activity_date', { ascending: false });
    expect(query.order).toHaveBeenNthCalledWith(2, 'site_diary_id', { ascending: true });
  });
});
