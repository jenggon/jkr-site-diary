'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { RainInterval, SiteWeatherSnapshot } from '@/lib/weather/siteWeather';

type ApiBody = { data?: SiteWeatherSnapshot };

function hourNumber(value: string): number {
  return value === '24:00' ? 24 : Number(value.slice(0, 2));
}

function probabilityForWindow(snapshot: SiteWeatherSnapshot, window: RainInterval | null): number | null {
  if (!window) return snapshot.current?.precipitationProbability ?? null;
  const start = hourNumber(window.start);
  const end = hourNumber(window.end);
  const values = snapshot.hourly
    .filter((item) => {
      const hour = hourNumber(item.hour);
      return hour >= start && hour < end;
    })
    .map((item) => item.precipitationProbability)
    .filter((value): value is number => typeof value === 'number');
  return values.length ? Math.round(Math.max(...values)) : null;
}

export default function ProjectWeatherPulse() {
  const { session } = useAuth();
  const [snapshot, setSnapshot] = useState<SiteWeatherSnapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setSnapshot(null);
      setUnavailable(true);
      return;
    }

    let active = true;
    let timer: number | null = null;

    const load = async () => {
      try {
        const response = await fetch('/api/weather/site?mode=forecast', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error('weather');
        const body = await response.json() as ApiBody;
        if (!active || !body.data) return;
        setSnapshot(body.data);
        setUnavailable(false);
      } catch {
        if (active) setUnavailable(true);
      } finally {
        if (active) timer = window.setTimeout(load, 30 * 60 * 1000);
      }
    };

    void load();
    return () => {
      active = false;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [session?.access_token]);

  const rainProbability = useMemo(
    () => snapshot ? probabilityForWindow(snapshot, snapshot.nextRainWindow) : null,
    [snapshot],
  );

  if (!snapshot) {
    return (
      <span className="ng-project-pulse__item ng-project-weather" title={unavailable ? 'Cuaca tidak tersedia' : 'Memuat cuaca'}>
        <small>CUACA</small>
        <strong>{unavailable ? '—' : '…'}</strong>
      </span>
    );
  }

  const temperature = snapshot.current?.temperatureC ?? null;
  const rainWindow = snapshot.nextRainWindow;
  return (
    <span className="ng-project-pulse__item ng-project-weather" title={`Visual Crossing · dikemas kini ${new Date(snapshot.fetchedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}`}>
      <small>CUACA</small>
      <strong>{rainWindow ? `☔ ${rainProbability ?? '—'}%` : `☀ ${temperature === null ? '—' : `${Math.round(temperature)}°`}`}</strong>
      <span className="ng-project-weather__sub">{rainWindow ? `${rainWindow.start.replace(':00', '')}–${rainWindow.end.replace(':00', '')}` : (snapshot.current?.conditions ?? 'Semasa')}</span>
    </span>
  );
}
