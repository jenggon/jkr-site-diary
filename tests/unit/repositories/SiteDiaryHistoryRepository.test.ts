import { describe, expect, it, vi } from 'vitest';
import { SiteDiaryHistoryRepository } from '@/repositories/SiteDiaryHistoryRepository';

describe('SiteDiaryHistoryRepository', () => {
  it('scopes one exact diary and applies deterministic chronological/tie ordering', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn().mockImplementationOnce(() => query).mockResolvedValueOnce({ data: [], error: null });
    const client = { from: vi.fn(() => query) };
    await new SiteDiaryHistoryRepository(client as never).findBySiteDiaryId('diary-exact');
    expect(client.from).toHaveBeenCalledWith('site_diary_logs');
    expect(query.eq).toHaveBeenCalledWith('site_diary_id', 'diary-exact');
    expect(query.order).toHaveBeenNthCalledWith(1, 'logged_at', { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(2, 'log_id', { ascending: true });
  });
});
