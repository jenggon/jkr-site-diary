'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { resolveRainIntervalSeed } from '@/lib/weather/rainIntervalSeed';
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
  return intervals.length === 0 ? 'Tiada hujan' : intervals.map((item) => `${item.start}–${item.end}`).join(' · ');
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
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const historical = Boolean(date && date < todayIso());

  useEffect(() => {
    let active = true;
    setProviderError(null);
    setEditing(false);
    if (!date || !historical) {
      onChange({ ...EMPTY_WEATHER_EVIDENCE });
      return () => { active = false; };
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      setProviderError('Auto tiada · Sahkan manual');
      onChange({ ...EMPTY_WEATHER_EVIDENCE, source: 'MANUAL' });
      return () => { active = false; };
    }

    setLoading(true);
    fetch(`/api/weather/site?mode=historical&date=${encodeURIComponent(date)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
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
        setProviderError('Auto tiada · Sahkan manual');
        onChange({ ...EMPTY_WEATHER_EVIDENCE, source: 'MANUAL' });
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [date, historical, onChange, session?.access_token]);

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
    const seed = resolveRainIntervalSeed({
      date,
      existingIntervals: value.intervals,
      suggestedIntervals: value.suggestedIntervals,
    });
    if (!seed) return;
    const next = normalizeIntervals([...value.intervals, seed]);
    onChange({ ...value, condition: 'HUJAN', intervals: next, source: value.provider ? 'USER_CONFIRMED' : 'MANUAL' });
    setEditing(true);
  };

  return (
    <section className="ng-entry-panel ng-weather-evidence" aria-label="Cuaca Site Diary">
      <div className="ng-entry-row ng-weather-evidence__head">
        <div>
          <div className="ng-entry-heading">CUACA</div>
          <div className="ng-weather-evidence__value">{condition}</div>
          <div className="ng-entry-meta">{historical ? 'Bukti jam' : 'Manual'}</div>
        </div>
        <div className="ng-weather-toggle">
          <button type="button" onClick={() => setManualCondition('ELOK')} disabled={disabled} aria-pressed={condition === 'ELOK'}>ELOK</button>
          <button type="button" onClick={() => setManualCondition('HUJAN')} disabled={disabled} aria-pressed={condition === 'HUJAN'}>HUJAN</button>
        </div>
      </div>

      {loading && <div className="ng-entry-meta" role="status">Muat cuaca…</div>}
      {providerError && <div className="ng-weather-evidence__warning" role="status">{providerError}</div>}

      {value.provider && (
        <div className="ng-weather-evidence__provider">
          <div>
            <div className="ng-entry-meta">VISUAL CROSSING · JAM</div>
            <div className="ng-weather-evidence__intervals">{intervalsText(value.suggestedIntervals)}</div>
          </div>
          {needsConfirmation && (
            <div className="ng-weather-evidence__actions">
              <button type="button" onClick={() => onChange({ ...value, source: 'USER_CONFIRMED' })} disabled={disabled}>SAH</button>
              <button type="button" onClick={() => { setEditing(true); onChange({ ...value, source: 'USER_CONFIRMED' }); }} disabled={disabled}>UBAH</button>
            </div>
          )}
        </div>
      )}

      {condition === 'HUJAN' && (editing || !needsConfirmation) && (
        <div className="ng-rain-intervals">
          {displayIntervals.map((interval, index) => (
            <div key={`${interval.start}-${interval.end}-${index}`} className="ng-rain-interval">
              <select value={interval.start} onChange={(event) => updateInterval(index, 'start', event.target.value)} disabled={disabled} aria-label={`Hujan mula ${index + 1}`}>
                {START_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={interval.end} onChange={(event) => updateInterval(index, 'end', event.target.value)} disabled={disabled} aria-label={`Hujan tamat ${index + 1}`}>
                {END_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <button type="button" onClick={() => {
                const next = value.intervals.filter((_, rowIndex) => rowIndex !== index);
                onChange({ ...value, intervals: next, condition: next.length ? 'HUJAN' : 'ELOK', source: value.provider ? 'USER_CONFIRMED' : 'MANUAL' });
              }} disabled={disabled} aria-label="Padam sela hujan">×</button>
            </div>
          ))}
          <button type="button" onClick={addInterval} disabled={disabled} className="ng-rain-add">+ Sela hujan</button>
        </div>
      )}

      {!needsConfirmation && (
        <div className="ng-entry-meta ng-weather-evidence__final" data-testid="weather-final-state">
          {value.source === 'USER_CONFIRMED' ? 'Disahkan' : 'Manual'} · {intervalsText(displayIntervals)}
        </div>
      )}
    </section>
  );
}
