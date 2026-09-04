import type { SiteDiaryRainInterval } from '@/types/siteDiary';

const SITE_TIMEZONE = 'Asia/Kuala_Lumpur';

export interface RainIntervalSeedInput {
  readonly date: string;
  readonly existingIntervals: readonly SiteDiaryRainInterval[];
  readonly suggestedIntervals?: readonly SiteDiaryRainInterval[];
  readonly now?: Date;
}

function hourFromTime(value: string): number | null {
  if (value === '24:00') return 24;
  const hour = Number(value.slice(0, 2));
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function expandHours(intervals: readonly SiteDiaryRainInterval[]): number[] {
  return intervals.flatMap((interval) => {
    const start = hourFromTime(interval.start);
    const end = hourFromTime(interval.end);
    if (start === null || end === null || start < 0 || start > 23 || end <= start || end > 24) return [];
    return Array.from({ length: end - start }, (_, offset) => start + offset);
  });
}

function siteClock(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    hour: Number(byType.hour),
  };
}

function orderedHoursFrom(start: number): number[] {
  return [...Array.from({ length: 24 - start }, (_, offset) => start + offset), ...Array.from({ length: start }, (_, hour) => hour)];
}

function bucket(hour: number): SiteDiaryRainInterval {
  return {
    start: `${String(hour).padStart(2, '0')}:00`,
    end: hour === 23 ? '24:00' : `${String(hour + 1).padStart(2, '0')}:00`,
  };
}

/**
 * Chooses the smartest one-hour seed without inventing historical evidence.
 * - Today: the site-local hour at the moment the user taps + Sela hujan.
 * - Historical: first unrepresented provider-suggested rainy hour when available.
 * - Manual historical fallback: first free hour from the normal 08:00 workday boundary.
 * Existing hours are skipped; consecutive buckets are merged by the caller's normalizer.
 */
export function resolveRainIntervalSeed({
  date,
  existingIntervals,
  suggestedIntervals = [],
  now = new Date(),
}: RainIntervalSeedInput): SiteDiaryRainInterval | null {
  const occupied = new Set(expandHours(existingIntervals));
  const clock = siteClock(now);

  let candidates: number[];
  if (date === clock.date) {
    candidates = orderedHoursFrom(clock.hour);
  } else {
    const suggested = [...new Set(expandHours(suggestedIntervals))];
    candidates = suggested.length > 0 ? suggested : orderedHoursFrom(8);
  }

  const selected = candidates.find((hour) => !occupied.has(hour));
  return selected === undefined ? null : bucket(selected);
}
