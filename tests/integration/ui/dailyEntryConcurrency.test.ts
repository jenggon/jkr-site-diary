import { describe, expect, it, vi } from 'vitest';
import { submitDailyEntry, SubmitDailyEntryParams } from '@/app/site-diary/DailyEntryForm';

const notes = 'Catatan belum disimpan';
const manpower = [{ trade_name: 'Pekerja Am', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 }];
const params: SubmitDailyEntryParams = {
  programmeId: 'programme-1', revisionId: 'revision-1', selectedSource: null,
  activityDate: '2026-08-16', actualStartDate: '2026-08-16', workStatus: 'Sedang Laksana',
  location: 'Pier A3', contractorScope: 'CONTRACTOR', notes, manpower,
  editingSiteDiaryId: 'sd-exact', editingActivityId: null,
  expectedLastModifiedAt: '2026-08-16T08:00:00.000Z',
};

describe('DailyEntryForm stale-edit behavior', () => {
  it('sends exact identity/token, performs no fallback POST, and preserves unsaved fields on 409', async () => {
    const calls: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
    const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: input.toString(), method: init?.method ?? 'GET',
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return { ok: false, status: 409, json: async () => ({ error: 'stale' }) } as Response;
    });
    const unsaved = { ...params, manpower: manpower.map((row) => ({ ...row })), fetchFn };

    await expect(submitDailyEntry(unsaved)).rejects.toThrow(
      'Laporan ini telah dikemaskini oleh pengguna lain. Muat semula rekod terkini sebelum menyimpan semula perubahan.'
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: '/api/site-diary/sd-exact', method: 'PATCH',
      body: {
        expected_last_modified_at: '2026-08-16T08:00:00.000Z',
        notes, manpower, print_context: expect.objectContaining({ location: 'Pier A3' }),
      },
    });
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
    expect(unsaved.notes).toBe(notes);
    expect(unsaved.manpower).toEqual(manpower);
    expect(unsaved.location).toBe('Pier A3');
  });

  it('uses the returned token for a deliberate subsequent edit without refetching', async () => {
    const tokens: string[] = [];
    const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { expected_last_modified_at: string };
      tokens.push(body.expected_last_modified_at);
      const next = tokens.length === 1 ? '2026-08-16T09:00:00.000Z' : '2026-08-16T10:00:00.000Z';
      return {
        ok: true, status: 200,
        json: async () => ({ data: { site_diary_id: 'sd-exact', updated_at: next, lastModifiedAt: next } }),
      } as Response;
    });
    const first = await submitDailyEntry({ ...params, fetchFn });
    const second = await submitDailyEntry({ ...params, expectedLastModifiedAt: first.lastModifiedAt, fetchFn });
    expect(tokens).toEqual(['2026-08-16T08:00:00.000Z', '2026-08-16T09:00:00.000Z']);
    expect(second.lastModifiedAt).toBe('2026-08-16T10:00:00.000Z');
  });
});
