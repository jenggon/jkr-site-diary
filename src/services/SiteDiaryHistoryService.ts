import { SiteDiaryHistoryRepository, SiteDiaryLogRow } from '@/repositories/SiteDiaryHistoryRepository';
import { SiteDiaryHistoryChange, SiteDiaryHistoryDto, SiteDiaryHistoryEvent } from '@/types/siteDiaryHistory';

type Snapshot = Record<string, unknown>;
type Manpower = { trade: string; bumi: number | null; nonBumi: number | null; foreign: number | null };

export class SiteDiaryHistoryNotFoundError extends Error {
  public readonly status = 404;
}

function snapshot(value: unknown): Snapshot | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Snapshot : null;
}

function nested(source: Snapshot, key: string): Snapshot | null {
  return snapshot(source[key]);
}

function text(value: unknown): string | null {
  if (typeof value !== 'string') return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed || null;
}

function comparable(field: string, value: unknown): string | null {
  const normalized = text(value);
  return field.includes('weather') && normalized ? normalized.toUpperCase() : normalized;
}

function shown(value: string | null): string {
  return value ?? 'Tidak tersedia';
}

function fieldChange(field: string, label: string, before: unknown, after: unknown): SiteDiaryHistoryChange | null {
  const previous = comparable(field, before);
  const current = comparable(field, after);
  if (previous === current) return null;
  if (field === 'notes') return { kind: 'FIELD', field, description: 'Catatan dikemaskini' };
  return { kind: 'FIELD', field, description: `${label}: ${shown(previous)} → ${shown(current)}` };
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function manpowerMap(value: unknown): Map<string, Manpower> | null {
  if (value == null) return new Map();
  if (!Array.isArray(value)) return null;
  const result = new Map<string, Manpower>();
  for (const item of value) {
    const row = snapshot(item);
    const trade = text(row?.trade_name);
    if (!row || !trade) return null;
    result.set(trade.toLocaleLowerCase('ms-MY'), {
      trade,
      bumi: count(row.bumi_count), nonBumi: count(row.non_bumi_count), foreign: count(row.foreign_count),
    });
  }
  return result;
}

function workforceChanges(before: unknown, after: unknown, beforePresent: boolean, afterPresent: boolean): SiteDiaryHistoryChange[] {
  if (!beforePresent || !afterPresent) return [{ kind: 'UNAVAILABLE', field: 'manpower', description: 'Perubahan tenaga kerja tidak dapat dikenal pasti.' }];
  const previous = manpowerMap(before);
  const current = manpowerMap(after);
  if (!previous || !current) return [{ kind: 'UNAVAILABLE', field: 'manpower', description: 'Perubahan tenaga kerja tidak dapat dikenal pasti.' }];
  const changes: SiteDiaryHistoryChange[] = [];
  const keys = [...new Set([...previous.keys(), ...current.keys()])].sort();
  for (const key of keys) {
    const oldRow = previous.get(key);
    const newRow = current.get(key);
    if (!oldRow && newRow) { changes.push({ kind: 'WORKFORCE', field: 'manpower', description: `${newRow.trade} ditambah` }); continue; }
    if (oldRow && !newRow) { changes.push({ kind: 'WORKFORCE', field: 'manpower', description: `${oldRow.trade} dibuang` }); continue; }
    if (!oldRow || !newRow) continue;
    const dimensions: Array<[keyof Pick<Manpower, 'bumi' | 'nonBumi' | 'foreign'>, string]> = [
      ['bumi', 'Bumiputera'], ['nonBumi', 'Bukan Bumiputera'], ['foreign', 'Bukan Warganegara'],
    ];
    for (const [dimension, label] of dimensions) {
      if (oldRow[dimension] !== newRow[dimension]) {
        changes.push({ kind: 'WORKFORCE', field: `manpower.${dimension}`, description: `${newRow.trade} — ${label}: ${shown(oldRow[dimension]?.toString() ?? null)} → ${shown(newRow[dimension]?.toString() ?? null)}` });
      }
    }
  }
  return changes;
}

export function deriveSiteDiaryChanges(previous: unknown, current: unknown): SiteDiaryHistoryChange[] {
  const before = snapshot(previous);
  const after = snapshot(current);
  if (!before || !after) return [{ kind: 'UNAVAILABLE', field: 'snapshot', description: 'Perubahan tidak dapat dikenal pasti daripada snapshot ini.' }];
  const beforePrint = nested(before, 'print_context') ?? {};
  const afterPrint = nested(after, 'print_context') ?? {};
  const fields: Array<[string, string, unknown, unknown]> = [
    ['notes', 'Catatan', before.notes, after.notes],
    ['weather', 'Cuaca', before.weather, after.weather],
    ['activity_date', 'Tarikh aktiviti', before.activity_date, after.activity_date],
    ['status', 'Status', before.status, after.status],
    ['print_context.location', 'Lokasi', beforePrint.location, afterPrint.location],
    ['print_context.contractor_scope', 'Skop kontraktor', beforePrint.contractor_scope, afterPrint.contractor_scope],
    ['print_context.work_start_time', 'Waktu kerja mula', beforePrint.work_start_time, afterPrint.work_start_time],
    ['print_context.work_end_time', 'Waktu kerja tamat', beforePrint.work_end_time, afterPrint.work_end_time],
    ['print_context.rain_start_time', 'Waktu hujan mula', beforePrint.rain_start_time, afterPrint.rain_start_time],
    ['print_context.rain_end_time', 'Waktu hujan tamat', beforePrint.rain_end_time, afterPrint.rain_end_time],
    ['print_context.weather_condition', 'Keadaan cuaca', beforePrint.weather_condition, afterPrint.weather_condition],
  ];
  return [...fields.map(([field, label, oldValue, newValue]) => fieldChange(field, label, oldValue, newValue)).filter((item): item is SiteDiaryHistoryChange => Boolean(item)), ...workforceChanges(
    before.manpower, after.manpower,
    Object.prototype.hasOwnProperty.call(before, 'manpower'),
    Object.prototype.hasOwnProperty.call(after, 'manpower'),
  )];
}

export class SiteDiaryHistoryService {
  public constructor(private readonly repository: SiteDiaryHistoryRepository) {}

  public async getHistory(siteDiaryId: string): Promise<SiteDiaryHistoryDto> {
    if (!await this.repository.diaryExists(siteDiaryId)) throw new SiteDiaryHistoryNotFoundError('Site Diary record not found');
    const rows = await this.repository.findBySiteDiaryId(siteDiaryId);
    const ordered = [...rows].sort((a, b) => a.logged_at.localeCompare(b.logged_at) || a.log_id.localeCompare(b.log_id));
    const events: SiteDiaryHistoryEvent[] = ordered.map((row: SiteDiaryLogRow, index) => {
      const available = Boolean(snapshot(row.snapshot_data));
      const changes = index === 0
        ? [{ kind: 'INITIAL' as const, field: 'initial', description: 'Rekod awal dicipta' }]
        : deriveSiteDiaryChanges(ordered[index - 1]?.snapshot_data, row.snapshot_data);
      return { logId: row.log_id, eventType: row.event_type, loggedAt: row.logged_at, actorLabel: row.logged_by ? 'Pengguna sistem' : 'Pelaku tidak tersedia', snapshotAvailable: available, changes };
    });
    return { siteDiaryId, events };
  }
}
