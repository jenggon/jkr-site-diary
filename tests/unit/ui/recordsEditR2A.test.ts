import { describe, expect, it } from 'vitest';
import {
  buildRecordsEditPatch,
  weatherEvidenceFromPrintContext,
} from '@/app/site-diary/RecordsEditForm';
import type { SiteDiaryPrintContext } from '@/types/siteDiary';

function savedContext(): SiteDiaryPrintContext {
  return {
    location: 'Blok Pentadbiran · Grid 4–8',
    work_start_time: null,
    work_end_time: null,
    weather_condition: 'HUJAN',
    daily_work_status: 'LAKSANA',
    rain_start_time: '15:00',
    rain_end_time: '17:00',
    rain_intervals: [
      { start: '10:00', end: '11:00' },
      { start: '15:00', end: '17:00' },
    ],
    weather_suggested_intervals: [
      { start: '10:00', end: '11:00' },
      { start: '15:00', end: '17:00' },
    ],
    weather_source: 'USER_CONFIRMED',
    weather_provider: 'VISUAL_CROSSING',
    weather_provider_fetched_at: '2026-09-02T06:30:00.000+08:00',
    weather_provider_resolution: 'HOURLY',
    weather_latitude: 3.983583,
    weather_longitude: 101.061639,
    weather_timezone: 'Asia/Kuala_Lumpur',
    contractor_scope: 'CONTRACTOR',
  };
}

describe('N09A R2A records edit preservation', () => {
  it('hydrates the complete persisted weather evidence without inventing values', () => {
    const context = savedContext();

    expect(weatherEvidenceFromPrintContext(context)).toEqual({
      condition: 'HUJAN',
      intervals: [
        { start: '10:00', end: '11:00' },
        { start: '15:00', end: '17:00' },
      ],
      suggestedIntervals: [
        { start: '10:00', end: '11:00' },
        { start: '15:00', end: '17:00' },
      ],
      source: 'USER_CONFIRMED',
      provider: 'VISUAL_CROSSING',
      fetchedAt: '2026-09-02T06:30:00.000+08:00',
      latitude: 3.983583,
      longitude: 101.061639,
      timezone: 'Asia/Kuala_Lumpur',
    });
  });

  it('preserves untouched weather/daily metadata and null work times during an unrelated edit', () => {
    const context = savedContext();
    const payload = buildRecordsEditPatch({
      expectedLastModifiedAt: '2026-09-02T10:40:00.000Z',
      notes: '  Catatan dikemas kini sahaja.  ',
      manpower: [],
      originalPrintContext: context,
      location: ' Blok Pentadbiran · Grid 5–8 ',
      workStartTime: '',
      workEndTime: '',
      contractorScope: 'NSC',
      weather: weatherEvidenceFromPrintContext(context),
      weatherTouched: false,
    });

    expect(payload.expected_last_modified_at).toBe('2026-09-02T10:40:00.000Z');
    expect(payload.notes).toBe('Catatan dikemas kini sahaja.');
    expect(payload.manpower).toEqual([]);
    expect(payload.print_context).toEqual({
      ...context,
      location: 'Blok Pentadbiran · Grid 5–8',
      work_start_time: null,
      work_end_time: null,
      contractor_scope: 'NSC',
    });
  });

  it('changes weather only when the user touches it while retaining the saved daily status', () => {
    const context = savedContext();
    const payload = buildRecordsEditPatch({
      expectedLastModifiedAt: '2026-09-02T10:40:00.000Z',
      notes: 'Cuaca disahkan semula.',
      manpower: [{ trade_name: 'Tukang Konkrit', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 }],
      originalPrintContext: context,
      location: context.location,
      workStartTime: '',
      workEndTime: '',
      contractorScope: 'CONTRACTOR',
      weather: {
        condition: 'HUJAN',
        intervals: [{ start: '23:00', end: '24:00' }],
        suggestedIntervals: [{ start: '23:00', end: '24:00' }],
        source: 'USER_CONFIRMED',
        provider: 'VISUAL_CROSSING',
        fetchedAt: '2026-09-02T16:30:00.000+08:00',
        latitude: 3.983583,
        longitude: 101.061639,
        timezone: 'Asia/Kuala_Lumpur',
      },
      weatherTouched: true,
    });

    expect(payload.print_context.daily_work_status).toBe('LAKSANA');
    expect(payload.print_context.weather_condition).toBe('HUJAN');
    expect(payload.print_context.rain_intervals).toEqual([{ start: '23:00', end: '24:00' }]);
    expect(payload.print_context.rain_start_time).toBe('23:00');
    expect(payload.print_context.rain_end_time).toBe('23:59');
    expect(payload.print_context.weather_provider).toBe('VISUAL_CROSSING');
    expect(payload.print_context.weather_provider_resolution).toBe('HOURLY');
    expect(payload.manpower).toEqual([
      { trade_name: 'Tukang Konkrit', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 },
    ]);
  });
});
