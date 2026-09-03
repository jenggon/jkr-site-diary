import { describe, expect, it } from 'vitest';
import { mergeRainHours } from '@/lib/weather/siteWeather';

describe('F4.5 site weather hourly interval merge', () => {
  it('merges consecutive hourly rain buckets and preserves separate periods', () => {
    expect(mergeRainHours([8, 9, 15])).toEqual([
      { start: '08:00', end: '10:00' },
      { start: '15:00', end: '16:00' },
    ]);
  });

  it('deduplicates and sorts provider hours deterministically', () => {
    expect(mergeRainHours([16, 15, 15, 8, 9])).toEqual([
      { start: '08:00', end: '10:00' },
      { start: '15:00', end: '17:00' },
    ]);
  });

  it('supports a final bucket ending at midnight', () => {
    expect(mergeRainHours([23])).toEqual([{ start: '23:00', end: '24:00' }]);
  });

  it('returns ELOK-compatible empty evidence when there are no rainy hours', () => {
    expect(mergeRainHours([])).toEqual([]);
  });
});
