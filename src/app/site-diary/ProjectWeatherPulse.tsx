'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { RainInterval, SiteWeatherSnapshot } from '@/lib/weather/siteWeather';

type ApiBody = { data?: SiteWeatherSnapshot };
type WeatherState = 'loading' | 'ready' | 'unavailable';

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
  const [state, setState] = useState<WeatherState>('loading');

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      setSnapshot(null);
      setState('unavailable');
      return;
    }

    let active = true;
    let timer: number | null = null;

    const load = async () => {
      if (active) setState('loading');
      try {
        const response = await fetch('/api/weather/site?mode=forecast', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error('weather');
        const body = await response.json() as ApiBody;
        if (!active || !body.data || Array.isArray(body.data)) throw new Error('weather');
        setSnapshot(body.data);
        setState('ready');
      } catch {
        if (active) {
          setSnapshot(null);
          setState('unavailable');
        }
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

  if (state === 'loading') {
    return (
      <span className="ng-project-pulse__item ng-project-weather" data-weather-state="loading" aria-label="Ramalan cuaca sedang dimuatkan">
        <small>RAMALAN</small>
        <strong>Memuat</strong>
      </span>
    );
  }

  if (state === 'unavailable' || !snapshot) {
    return (
      <span className="ng-project-pulse__item ng-project-weather" data-weather-state="unavailable" aria-label="Ramalan cuaca tidak tersedia">
        <small>RAMALAN</small>
        <strong>Tiada data</strong>
      </span>
    );
  }

  const temperature = snapshot.current?.temperatureC ?? null;
  const rainWindow = snapshot.nextRainWindow;
  const updatedAt = new Date(snapshot.fetchedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

  if (rainWindow) {
    const probabilityText = rainProbability === null ? '' : ` · ${rainProbability}%`;
    const detail = `${rainWindow.start.replace(':00', '')}–${rainWindow.end.replace(':00', '')}`;
    const probabilityLabel = rainProbability === null ? '' : ` ${rainProbability}%`;
    return (
      <span
        className="ng-project-pulse__item ng-project-weather"
        data-weather-state="rain"
        aria-label={`Ramalan hujan${probabilityLabel}, ${detail}. Visual Crossing, dikemas kini ${updatedAt}.`}
      >
        <small>RAMALAN</small>
        <strong>HUJAN{probabilityText}</strong>
        <span className="ng-project-weather__sub">{detail}</span>
      </span>
    );
  }

  const temperatureText = temperature === null ? '' : ` · ${Math.round(temperature)}°`;
  const temperatureLabel = temperature === null ? '' : `, ${Math.round(temperature)} darjah Celsius`;
  return (
    <span
      className="ng-project-pulse__item ng-project-weather"
      data-weather-state="dry"
      aria-label={`Ramalan kering${temperatureLabel}. Tiada hujan dekat. Visual Crossing, dikemas kini ${updatedAt}.`}
    >
      <small>RAMALAN</small>
      <strong>KERING{temperatureText}</strong>
      <span className="ng-project-weather__sub">Tiada hujan dekat</span>
    </span>
  );
}
