export type SiteWeatherMode = 'historical' | 'forecast';

export interface RainInterval {
  readonly start: string;
  readonly end: string;
}

export interface SiteWeatherHour {
  readonly hour: string;
  readonly temperatureC: number | null;
  readonly precipitationMm: number;
  readonly precipitationProbability: number | null;
  readonly rainy: boolean;
}

export interface SiteWeatherSnapshot {
  readonly mode: SiteWeatherMode;
  readonly date: string;
  readonly provider: 'VISUAL_CROSSING';
  readonly providerResolution: 'HOURLY';
  readonly fetchedAt: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezone: string;
  readonly condition: 'ELOK' | 'HUJAN';
  readonly rainIntervals: RainInterval[];
  readonly current: {
    readonly temperatureC: number | null;
    readonly conditions: string | null;
    readonly precipitationProbability: number | null;
  } | null;
  readonly nextRainWindow: RainInterval | null;
  readonly hourly: SiteWeatherHour[];
  readonly configurationSource: 'ENV_FALLBACK';
}

type VisualCrossingHour = {
  datetime?: unknown;
  temp?: unknown;
  precip?: unknown;
  precipprob?: unknown;
  preciptype?: unknown;
  conditions?: unknown;
};

type VisualCrossingDay = {
  datetime?: unknown;
  hours?: unknown;
};

type VisualCrossingPayload = {
  timezone?: unknown;
  days?: unknown;
  currentConditions?: unknown;
};

type CacheEntry = { expiresAt: number; value: SiteWeatherSnapshot };

const cache = new Map<string, CacheEntry>();
const FORECAST_TTL_MS = 30 * 60 * 1000;
const HISTORICAL_TTL_MS = 24 * 60 * 60 * 1000;
const FORECAST_RAIN_THRESHOLD = 50;

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clampProbability(value: unknown): number | null {
  const number = finiteNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(100, number));
}

function hourNumber(datetime: unknown): number | null {
  if (typeof datetime !== 'string') return null;
  const match = datetime.match(/^(\d{1,2}):/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function boundary(hour: number): string {
  if (hour >= 24) return '24:00';
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function mergeRainHours(hours: readonly number[]): RainInterval[] {
  const unique = [...new Set(hours.filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23))]
    .sort((a, b) => a - b);
  if (unique.length === 0) return [];

  const result: RainInterval[] = [];
  let start = unique[0]!;
  let end = start + 1;

  for (let index = 1; index < unique.length; index += 1) {
    const hour = unique[index]!;
    if (hour === end) {
      end = hour + 1;
      continue;
    }
    result.push({ start: boundary(start), end: boundary(end) });
    start = hour;
    end = hour + 1;
  }

  result.push({ start: boundary(start), end: boundary(end) });
  return result;
}

function precipTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.toLowerCase());
}

function isHistoricalRain(hour: VisualCrossingHour): boolean {
  const precip = finiteNumber(hour.precip) ?? 0;
  const types = precipTypes(hour.preciptype);
  const conditions = typeof hour.conditions === 'string' ? hour.conditions.toLowerCase() : '';
  return precip > 0 || types.includes('rain') || conditions.includes('rain');
}

function isForecastRain(hour: VisualCrossingHour): boolean {
  const precip = finiteNumber(hour.precip) ?? 0;
  const probability = clampProbability(hour.precipprob) ?? 0;
  const types = precipTypes(hour.preciptype);
  return precip > 0 || probability >= FORECAST_RAIN_THRESHOLD || types.includes('rain');
}

function configuredPoint() {
  const latitude = Number(process.env.SITE_WEATHER_LATITUDE ?? '3.983583');
  const longitude = Number(process.env.SITE_WEATHER_LONGITUDE ?? '101.061639');
  const timezone = process.env.SITE_WEATHER_TIMEZONE?.trim() || 'Asia/Kuala_Lumpur';
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('WEATHER_CONFIG_INVALID');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('WEATHER_CONFIG_INVALID');
  return { latitude, longitude, timezone };
}

function firstDay(payload: VisualCrossingPayload, requestedDate?: string): VisualCrossingDay | null {
  if (!Array.isArray(payload.days)) return null;
  const days = payload.days.filter((item): item is VisualCrossingDay => Boolean(item) && typeof item === 'object');
  if (requestedDate) {
    const exact = days.find((day) => day.datetime === requestedDate);
    if (exact) return exact;
  }
  return days[0] ?? null;
}

function normalizedHours(day: VisualCrossingDay | null): VisualCrossingHour[] {
  if (!day || !Array.isArray(day.hours)) return [];
  return day.hours.filter((item): item is VisualCrossingHour => Boolean(item) && typeof item === 'object');
}

function hourlyView(hours: VisualCrossingHour[], mode: SiteWeatherMode): SiteWeatherHour[] {
  return hours.flatMap((hour) => {
    const number = hourNumber(hour.datetime);
    if (number === null) return [];
    return [{
      hour: boundary(number),
      temperatureC: finiteNumber(hour.temp),
      precipitationMm: finiteNumber(hour.precip) ?? 0,
      precipitationProbability: clampProbability(hour.precipprob),
      rainy: mode === 'historical' ? isHistoricalRain(hour) : isForecastRain(hour),
    }];
  });
}

function localCurrentHour(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const raw = parts.find((part) => part.type === 'hour')?.value;
    const hour = raw ? Number(raw) : NaN;
    return Number.isInteger(hour) ? hour : 0;
  } catch {
    return 0;
  }
}

function localDate(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // fall through
  }
  return new Date().toISOString().slice(0, 10);
}

export async function getSiteWeather(
  mode: SiteWeatherMode,
  requestedDate?: string,
  fetchFn: typeof fetch = fetch,
): Promise<SiteWeatherSnapshot> {
  const key = process.env.VISUAL_CROSSING_API_KEY?.trim();
  if (!key) throw new Error('WEATHER_NOT_CONFIGURED');

  const { latitude, longitude, timezone } = configuredPoint();
  const date = requestedDate || localDate(timezone);
  const cacheKey = `${mode}:${latitude}:${longitude}:${mode === 'historical' ? date : 'live'}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const location = encodeURIComponent(`${latitude},${longitude}`);
  const datePath = mode === 'historical' ? `/${encodeURIComponent(date)}/${encodeURIComponent(date)}` : '';
  const include = mode === 'historical' ? 'hours' : 'current,hours,days';
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}${datePath}?unitGroup=metric&include=${include}&key=${encodeURIComponent(key)}&contentType=json`;

  const response = await fetchFn(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) throw new Error(`WEATHER_PROVIDER_${response.status}`);
  const payload = await response.json() as VisualCrossingPayload;
  const day = firstDay(payload, mode === 'historical' ? date : undefined);
  const hours = normalizedHours(day);
  const viewed = hourlyView(hours, mode);

  const currentHour = mode === 'forecast' ? localCurrentHour(timezone) : 0;
  const rainyHours = viewed
    .filter((hour) => hour.rainy)
    .map((hour) => Number(hour.hour.slice(0, 2)))
    .filter((hour) => mode === 'historical' || hour >= currentHour);
  const intervals = mergeRainHours(rainyHours);

  const currentRaw = payload.currentConditions && typeof payload.currentConditions === 'object'
    ? payload.currentConditions as VisualCrossingHour
    : null;
  const current = mode === 'forecast' ? {
    temperatureC: finiteNumber(currentRaw?.temp),
    conditions: typeof currentRaw?.conditions === 'string' ? currentRaw.conditions : null,
    precipitationProbability: clampProbability(currentRaw?.precipprob),
  } : null;

  const providerTimezone = typeof payload.timezone === 'string' && payload.timezone.trim()
    ? payload.timezone
    : timezone;
  const snapshot: SiteWeatherSnapshot = {
    mode,
    date: typeof day?.datetime === 'string' ? day.datetime : date,
    provider: 'VISUAL_CROSSING',
    providerResolution: 'HOURLY',
    fetchedAt: new Date().toISOString(),
    latitude,
    longitude,
    timezone: providerTimezone,
    condition: intervals.length > 0 ? 'HUJAN' : 'ELOK',
    rainIntervals: intervals,
    current,
    nextRainWindow: mode === 'forecast' ? (intervals[0] ?? null) : null,
    hourly: viewed,
    configurationSource: 'ENV_FALLBACK',
  };

  cache.set(cacheKey, {
    expiresAt: now + (mode === 'historical' ? HISTORICAL_TTL_MS : FORECAST_TTL_MS),
    value: snapshot,
  });
  return snapshot;
}
