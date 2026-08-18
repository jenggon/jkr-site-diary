import { describe, expect, it, vi } from 'vitest';
import { deriveSiteDiaryChanges, SiteDiaryHistoryService, SiteDiaryHistoryNotFoundError } from '@/services/SiteDiaryHistoryService';
import { SiteDiaryHistoryRepository } from '@/repositories/SiteDiaryHistoryRepository';

function snap(overrides: Record<string, unknown> = {}) {
  return { notes: 'Asal', weather: 'Sunny', activity_date: '2026-08-17', status: 'In Progress', manpower: [{ trade_name: 'Pekerja Am', bumi_count: 4, non_bumi_count: 1, foreign_count: 2 }], print_context: { location: 'Pier 1', contractor_scope: 'CONTRACTOR', work_start_time: '08:00', work_end_time: '17:00', rain_start_time: null, rain_end_time: null, weather_condition: 'ELOK' }, ...overrides };
}
function row(logId: string, loggedAt: string, snapshotData: unknown, overrides: Record<string, unknown> = {}) {
  return { log_id: logId, site_diary_id: 'diary', event_type: 'UPDATE', snapshot_data: snapshotData, logged_at: loggedAt, logged_by: 'actor-uuid', ...overrides };
}
function service(rows: unknown[], exists = true) {
  return new SiteDiaryHistoryService({ diaryExists: vi.fn().mockResolvedValue(exists), findBySiteDiaryId: vi.fn().mockResolvedValue(rows) } as unknown as SiteDiaryHistoryRepository);
}

describe('SiteDiaryHistoryService post-mutation snapshot derivation', () => {
  it('orders chronologically with stable log identity and treats first event as creation only', async () => {
    const result = await service([
      row('b', '2026-08-18T09:00:00Z', snap({ notes: 'B' })),
      row('a', '2026-08-18T09:00:00Z', snap(), { event_type: 'NEW' }),
    ]).getHistory('diary');
    expect(result.events.map((event) => event.logId)).toEqual(['a', 'b']);
    expect(result.events[0]?.changes).toEqual([{ kind: 'INITIAL', field: 'initial', description: 'Rekod awal dicipta' }]);
    expect(result.events[1]?.changes.map((change) => change.description)).toContain('Catatan dikemaskini');
  });

  it('derives bounded meaningful fields without updated_at or concurrency noise', () => {
    const changes = deriveSiteDiaryChanges(snap(), snap({
      notes: 'Baharu', weather: 'Rainy', activity_date: '2026-08-18', status: 'Completed', updated_at: 'noise', expected_last_modified_at: 'noise',
      print_context: { location: 'Pier 2', contractor_scope: 'NSC', work_start_time: '07:30', work_end_time: '18:00', rain_start_time: '14:00', rain_end_time: '15:00', weather_condition: 'HUJAN' },
    }));
    const descriptions = changes.map((change) => change.description).join('|');
    expect(descriptions).toContain('Catatan dikemaskini');
    expect(descriptions).toContain('Cuaca: SUNNY → RAINY');
    expect(descriptions).toContain('Lokasi: Pier 1 → Pier 2');
    expect(descriptions).toContain('Skop kontraktor: CONTRACTOR → NSC');
    expect(descriptions).toContain('Waktu kerja tamat: 17:00 → 18:00');
    expect(descriptions).toContain('Waktu hujan mula: Tidak tersedia → 14:00');
    expect(descriptions).not.toContain('updated_at');
    expect(descriptions).not.toContain('expected_last_modified_at');
  });

  it('normalizes workforce order and reports count, addition, and removal semantics', () => {
    const before = snap({ manpower: [
      { trade_name: 'Tukang Kayu', bumi_count: 1, non_bumi_count: 0, foreign_count: 0 },
      { trade_name: 'Pekerja Am', bumi_count: 4, non_bumi_count: 1, foreign_count: 2 },
    ] });
    const reordered = snap({ manpower: [
      { trade_name: 'Pekerja Am', bumi_count: 4, non_bumi_count: 1, foreign_count: 2 },
      { trade_name: 'Tukang Kayu', bumi_count: 1, non_bumi_count: 0, foreign_count: 0 },
    ] });
    expect(deriveSiteDiaryChanges(before, reordered)).toEqual([]);
    const changed = snap({ manpower: [
      { trade_name: 'Pekerja Am', bumi_count: 6, non_bumi_count: 1, foreign_count: 2 },
      { trade_name: 'Tukang Besi', bumi_count: 1, non_bumi_count: 0, foreign_count: 0 },
    ] });
    const descriptions = deriveSiteDiaryChanges(before, changed).map((change) => change.description);
    expect(descriptions).toContain('Pekerja Am — Bumiputera: 4 → 6');
    expect(descriptions).toContain('Tukang Besi ditambah');
    expect(descriptions).toContain('Tukang Kayu dibuang');
  });

  it('preserves malformed/missing snapshots and missing actors safely', async () => {
    const result = await service([
      row('a', '2026-08-18T08:00:00Z', null, { event_type: 'NEW', logged_by: null }),
      row('b', '2026-08-18T09:00:00Z', { notes: 'Legacy without workforce' }),
    ]).getHistory('diary');
    expect(result.events[0]).toMatchObject({ snapshotAvailable: false, actorLabel: 'Pelaku tidak tersedia' });
    expect(result.events[1]?.changes).toEqual([{ kind: 'UNAVAILABLE', field: 'snapshot', description: 'Perubahan tidak dapat dikenal pasti daripada snapshot ini.' }]);
  });

  it('supports empty history and rejects inaccessible exact diary identity', async () => {
    await expect(service([]).getHistory('diary')).resolves.toEqual({ siteDiaryId: 'diary', events: [] });
    await expect(service([], false).getHistory('missing')).rejects.toBeInstanceOf(SiteDiaryHistoryNotFoundError);
  });
});
