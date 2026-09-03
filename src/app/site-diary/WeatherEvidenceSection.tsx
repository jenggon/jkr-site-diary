'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { SiteDiaryRainInterval, SiteDiaryWeatherCondition, SiteDiaryWeatherSource } from '@/types/siteDiary';

export interface WeatherEvidenceValue {
  readonly condition: SiteDiaryWeatherCondition;
  readonly intervals: SiteDiaryRainInterval[];
  readonly suggestedIntervals: SiteDiaryRainInterval[];
  readonly source: SiteDiaryWeatherSource;
  readonly provider: 'VISUAL_CROSSING' | null;
  readonly fetchedAt: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly timezone: string;
}

interface WeatherApiPayload {
  readonly condition: SiteDiaryWeatherCondition;
  readonly rainIntervals: SiteDiaryRainInterval[];
  readonly provider: 'VISUAL_CROSSING';
  readonly providerResolution: 'HOURLY';
  readonly fetchedAt: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
}

export const EMPTY_WEATHER_EVIDENCE: WeatherEvidenceValue = {
  condition: 'ELOK',
  intervals: [],
  suggestedIntervals: [],
  source: 'MANUAL',
  provider: null,
  fetchedAt: null,
  latitude: null,
  longitude: null,
  timezone: 'Asia/Kuala_Lumpur',
};

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeIntervals(intervals: SiteDiaryRainInterval[]): SiteDiaryRainInterval[] {
  const asHours = intervals.flatMap((interval) => {
    const start = Number(interval.start.slice(0, 2));
    const end = interval.end === '24:00' ? 24 : Number(interval.end.slice(0, 2));
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > 23 || end <= start || end > 24) return [];
    return Array.from({ length: end - start }, (_, index) => start + index);
  });
  const hours = [...new Set(asHours)].sort((a, b) => a - b);
  if (hours.length === 0) return [];
  const result: SiteDiaryRainInterval[] = [];
  let start = hours[0]!;
  let end = start + 1;
  for (let index = 1; index < hours.length; index += 1) {
    const hour = hours[index]!;
    if (hour === end) {
      end = hour + 1;
      continue;
    }
    result.push({ start: `${String(start).padStart(2, '0')}:00`, end: end === 24 ? '24:00' : `${String(end).padStart(2, '0')}:00` });
    start = hour;
    end = hour + 1;
  }
  result.push({ start: `${String(start).padStart(2, '0')}:00`, end: end === 24 ? '24:00' : `${String(end).padStart(2, '0')}:00` });
  return result;
}

function intervalsText(intervals: SiteDiaryRainInterval[]): string {
  return intervals.length === 0 ? 'Tiada hujan direkod' : intervals.map((item) => `${item.start}–${item.end}`).join(' · ');
}

const START_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const END_OPTIONS = Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => hour === 24 ? '24:00' : `${String(hour).padStart(2, '0')}:00`);

export default function WeatherEvidenceSection({
  date,
  value,
  onChange,
  disabled = false,
}: {
  readonly date: string;
  readonly value: WeatherEvidenceValue;
  readonly onChange: (value: WeatherEvidenceValue) => void;
  readonly disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const historical = Boolean(date && date < todayIso());

  useEffect(() => {
    let active = true;
    setProviderError(null);
    setEditing(false);
    if (!date || !historical) {
      onChange({ ...EMPTY_WEATHER_EVIDENCE, condition: value.condition, intervals: value.intervals });
      return () => { active = false; };
    }

    setLoading(true);
    fetch(`/api/weather/site?mode=historical&date=${encodeURIComponent(date)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('provider');
        const body = await response.json() as { data?: WeatherApiPayload };
        if (!body.data) throw new Error('provider');
        return body.data;
      })
      .then((snapshot) => {
        if (!active) return;
        onChange({
          condition: snapshot.condition,
          intervals: snapshot.rainIntervals,
          suggestedIntervals: snapshot.rainIntervals,
          source: 'AUTO',
          provider: snapshot.provider,
          fetchedAt: snapshot.fetchedAt,
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          timezone: snapshot.timezone,
        });
      })
      .catch(() => {
        if (!active) return;
        setProviderError('Cadangan cuaca tidak tersedia. Sahkan secara manual.');
        onChange({ ...EMPTY_WEATHER_EVIDENCE, source: 'MANUAL' });
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
    // Weather evidence intentionally re-resolves when the Site Diary date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, historical]);

  const condition = value.intervals.length > 0 ? 'HUJAN' : value.condition;
  const needsConfirmation = value.source === 'AUTO';
  const displayIntervals = useMemo(() => normalizeIntervals(value.intervals), [value.intervals]);

  const setManualCondition = (next: SiteDiaryWeatherCondition) => {
    setEditing(next === 'HUJAN');
    onChange({
      ...value,
      condition: next,
      intervals: next === 'ELOK' ? [] : value.intervals,
      source: value.provider ? 'USER_CONFIRMED' : 'MANUAL',
    });
  };

  const updateInterval = (index: number, field: 'start' | 'end', nextValue: string) => {
    const next = value.intervals.map((interval, rowIndex) => rowIndex === index ? { ...interval, [field]: nextValue } : interval);
    const normalized = normalizeIntervals(next);
    onChange({ ...value, condition: normalized.length > 0 ? 'HUJAN' : value.condition, intervals: normalized, source: value.provider ? 'USER_CONFIRMED' : 'MANUAL' });
  };

  const addInterval = () => {
    const next = normalizeIntervals([...value.intervals, { start: '15:00', end: '16:00' }]);
    onChange({ ...value, condition: 'HUJAN', intervals: next, source: value.provider ? 'USER_CONFIRMED' : 'MANUAL' });
    setEditing(true);
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-lg" aria-label="Cuaca Site Diary">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">CUACA</div>
          <h3 className="mt-1 text-sm font-bold text-zinc-100">{condition}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {historical ? 'Bukti sejam · penyelia sahkan' : 'Hari semasa · catatan penyelia'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setManualCondition('ELOK')} disabled={disabled} className={`rounded-lg border px-3 py-2 text-xs font-bold ${condition === 'ELOK' ? 'border-emerald-600 bg-emerald-950/50 text-emerald-200' : 'border-zinc-700 text-zinc-400'}`}>ELOK</button>
          <button type="button" onClick={() => setManualCondition('HUJAN')} disabled={disabled} className={`rounded-lg border px-3 py-2 text-xs font-bold ${condition === 'HUJAN' ? 'border-blue-600 bg-blue-950/50 text-blue-200' : 'border-zinc-700 text-zinc-400'}`}>HUJAN</button>
        </div>
      </div>

      {loading && <div className="mt-3 text-xs text-zinc-500">Memuat bukti cuaca…</div>}
      {providerError && <div className="mt-3 text-xs text-amber-300" role="status">{providerError}</div>}

      {value.provider && (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">VISUAL CROSSING · HOURLY</div>
              <div className="mt-1 text-xs font-semibold text-zinc-200">{intervalsText(value.suggestedIntervals)}</div>
            </div>
            {needsConfirmation && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, source: 'USER_CONFIRMED' })}
                  disabled={disabled}
                  className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-xs font-bold text-emerald-200"
                >
                  SAH
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(true); onChange({ ...value, source: 'USER_CONFIRMED' }); }}
                  disabled={disabled}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300"
                >
                  UBAH
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {condition === 'HUJAN' && (editing || !needsConfirmation) && (
        <div className="mt-3 space-y-2">
          {displayIntervals.map((interval, index) => (
            <div key={`${interval.start}-${interval.end}-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <select value={interval.start} onChange={(event) => updateInterval(index, 'start', event.target.value)} disabled={disabled} className="min-h-[42px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200">
                {START_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={interval.end} onChange={(event) => updateInterval(index, 'end', event.target.value)} disabled={disabled} className="min-h-[42px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-200">
                {END_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <button
                type="button"
                onClick={() => {
                  const next = value.intervals.filter((_, rowIndex) => rowIndex !== index);
                  onChange({ ...value, intervals: next, condition: next.length ? 'HUJAN' : 'ELOK', source: value.provider ? 'USER_CONFIRMED' : 'MANUAL' });
                }}
                disabled={disabled}
                aria-label="Padam sela hujan"
                className="min-h-[42px] rounded-lg border border-zinc-800 px-3 text-zinc-500 hover:text-red-300"
              >×</button>
            </div>
          ))}
          <button type="button" onClick={addInterval} disabled={disabled} className="rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200">+ Sela hujan</button>
        </div>
      )}

      {!needsConfirmation && (
        <div className="mt-3 text-[11px] text-zinc-500" data-testid="weather-final-state">
          {value.source === 'USER_CONFIRMED' ? 'Disahkan penyelia' : 'Catatan manual penyelia'} · {intervalsText(displayIntervals)}
        </div>
      )}
    </section>
  );
}
