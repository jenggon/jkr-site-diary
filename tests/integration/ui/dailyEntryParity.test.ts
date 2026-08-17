/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryForm, { submitDailyEntry, SubmitDailyEntryParams } from '@/app/site-diary/DailyEntryForm';

// Mock DailyEntryShell context for component rendering
vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({
    programmeId: 'prog-uuid-1111-2222-3333',
    revisionId: 'rev-uuid-aaaa-bbbb-cccc',
    programmeName: 'Cadangan Membina Hospital Pakar',
    programmeCode: 'JKR/HQ/2026/01',
    loading: false,
    error: null,
    availableProgrammes: [],
    setProgrammeId: vi.fn(),
    refreshContext: vi.fn(),
  }),
}));

interface RecordedCall {
  url: string;
  method: string;
  body?: any;
}

describe('F2.1-C Executable Behavioural Parity & Lifecycle Failure Safety Suite', () => {
  let calls: RecordedCall[];

  const createMockFetch = (overrides: Record<string, { status: number; json: any }> = {}) => {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const body = init?.body ? (JSON.parse(init.body as string) as any) : undefined;
      calls.push({ url, method, body });

      // Match overrides by route substring
      for (const [routePattern, mockResponse] of Object.entries(overrides)) {
        if (url.includes(routePattern)) {
          return {
            ok: mockResponse.status >= 200 && mockResponse.status < 300,
            status: mockResponse.status,
            json: async () => mockResponse.json,
          } as unknown as Response;
        }
      }

      // Default mock responses
      if (url.includes('/api/activities') && method === 'POST' && !url.includes('/start') && !url.includes('/complete')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ data: { activityId: 'act-uuid-msp-1234' } }),
        } as unknown as Response;
      }

      if (url.includes('/start')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-uuid-msp-1234', status: 'In Progress' } }),
        } as unknown as Response;
      }

      if (url.includes('/complete')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-uuid-msp-1234', status: 'Completed' } }),
        } as unknown as Response;
      }

      if (url.includes('/api/site-diary') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ data: { site_diary_id: 'sd-uuid-created-9999' } }),
        } as unknown as Response;
      }

      if (url.includes('/api/site-diary') && method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-uuid-existing-7777' } }),
        } as unknown as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      } as unknown as Response;
    };
  };

  const defaultParams: SubmitDailyEntryParams = {
    programmeId: '0651e125-3ef4-47c4-a3fa-8aec49bdf979',
    revisionId: 'rev-uuid-1111-2222-3333',
    selectedSource: {
      sourceType: 'MSP',
      id: 'task-uuid-msp-101',
      title: 'Kerja-kerja Pengorekan Tanah',
      code: 'MSP-001',
    },
    activityDate: '2026-08-16',
    actualStartDate: '2026-08-16',
    workStatus: 'Sedang Laksana',
    location: 'Ground Beam Blok A, Grid A1-A4',
    workStartTime: '08:00',
    workEndTime: '17:00',
    weatherCondition: 'ELOK',
    rainStartTime: '',
    rainEndTime: '',
    contractorScope: 'CONTRACTOR',
    notes: 'Kemajuan kerja memuaskan.',
    manpower: [
      { trade_name: 'Excavator Operator', bumi_count: 2, non_bumi_count: 0, foreign_count: 0 },
      { trade_name: 'General Worker', bumi_count: 1, non_bumi_count: 0, foreign_count: 3 },
    ],
  };

  beforeEach(() => {
    calls = [];
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // MANDATORY 10 BEHAVIOURAL PARITY SCENARIOS
  // -------------------------------------------------------------

  it('Scenario 1 (MSP NEW ACTIVITY): submits MSP source and executes canonical activity, lifecycle, and site diary sequence', async () => {
    const mockFetch = createMockFetch();
    const result = await submitDailyEntry({ ...defaultParams, fetchFn: mockFetch });

    expect(result.siteDiaryId).toBe('sd-uuid-created-9999');
    expect(result.activityId).toBe('act-uuid-msp-1234');

    // 1. Verify Activity POST
    const actCall = calls.find((c) => c.url === '/api/activities' && c.method === 'POST');
    expect(actCall).toBeDefined();
    expect(actCall?.body).toEqual({
      programmeId: '0651e125-3ef4-47c4-a3fa-8aec49bdf979',
      revisionId: 'rev-uuid-1111-2222-3333',
      sourceType: 'MSP',
      taskId: 'task-uuid-msp-101',
      activityName: 'Kerja-kerja Pengorekan Tanah',
    });
    expect(actCall?.body.voItemId).toBeUndefined();

    // 2. Verify /start lifecycle call
    const startCall = calls.find((c) => c.url.includes('/start') && c.method === 'POST');
    expect(startCall).toBeDefined();
    expect(startCall?.url).toBe('/api/activities/act-uuid-msp-1234/start');
    expect(startCall?.body).toEqual({ actualStartDate: '2026-08-16' });

    // 3. Verify Site Diary POST call
    const sdCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(sdCall).toBeDefined();
    expect(sdCall?.body.activity_id).toBe('act-uuid-msp-1234');
    expect(sdCall?.body.activity_date).toBe('2026-08-16');
  });

  it('Scenario 2 (VO NEW ACTIVITY): submits VO source and executes with canonical VO payload', async () => {
    const mockFetch = createMockFetch();
    const voParams: SubmitDailyEntryParams = {
      ...defaultParams,
      selectedSource: {
        sourceType: 'VO',
        id: 'vo-item-uuid-555',
        title: 'VO 01: Pemasangan Paip Tambahan',
        code: 'VO 01',
      },
    };

    const result = await submitDailyEntry({ ...voParams, fetchFn: mockFetch });
    expect(result.siteDiaryId).toBe('sd-uuid-created-9999');

    const actCall = calls.find((c) => c.url === '/api/activities' && c.method === 'POST');
    expect(actCall).toBeDefined();
    expect(actCall?.body).toEqual({
      programmeId: '0651e125-3ef4-47c4-a3fa-8aec49bdf979',
      revisionId: 'rev-uuid-1111-2222-3333',
      sourceType: 'VO',
      voItemId: 'vo-item-uuid-555',
      activityName: 'VO 01: Pemasangan Paip Tambahan',
    });
    expect(actCall?.body.taskId).toBeUndefined();
  });

  it('Scenario 3 (KNOWN START DATE): propagates explicit historical start date to lifecycle endpoint', async () => {
    const mockFetch = createMockFetch();
    const knownStartParams: SubmitDailyEntryParams = {
      ...defaultParams,
      activityDate: '2026-08-16',
      actualStartDate: '2026-08-01', // Known earlier start date
    };

    await submitDailyEntry({ ...knownStartParams, fetchFn: mockFetch });

    const startCall = calls.find((c) => c.url.includes('/start') && c.method === 'POST');
    expect(startCall).toBeDefined();
    expect(startCall?.body).toEqual({ actualStartDate: '2026-08-01' });
  });

  it('Scenario 4 (SAME-DAY START + COMPLETE): dispatches /complete with actualStartDate and completedDate without redundant /start', async () => {
    const mockFetch = createMockFetch();
    const sameDayCompleteParams: SubmitDailyEntryParams = {
      ...defaultParams,
      workStatus: 'Siap',
      activityDate: '2026-08-16',
      actualStartDate: '2026-08-16',
    };

    const result = await submitDailyEntry({ ...sameDayCompleteParams, fetchFn: mockFetch });
    expect(result.siteDiaryId).toBe('sd-uuid-created-9999');

    // Verify /complete was called
    const compCall = calls.find((c) => c.url.includes('/complete') && c.method === 'POST');
    expect(compCall).toBeDefined();
    expect(compCall?.url).toBe('/api/activities/act-uuid-msp-1234/complete');
    expect(compCall?.body).toEqual({
      actualStartDate: '2026-08-16',
      completedDate: '2026-08-16',
    });

    // Verify /start was NOT called separately
    const startCall = calls.find((c) => c.url.includes('/start'));
    expect(startCall).toBeUndefined();

    // Verify Site Diary was still created
    const sdCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(sdCall).toBeDefined();
  });

  it('Scenario 5 (IN PROGRESS SAVE): executes /start first, then persists Site Diary row', async () => {
    const mockFetch = createMockFetch();
    await submitDailyEntry({ ...defaultParams, workStatus: 'Sedang Laksana', fetchFn: mockFetch });

    expect(calls.length).toBe(3);
    expect(calls[0]?.url).toBe('/api/activities');
    expect(calls[1]?.url).toBe('/api/activities/act-uuid-msp-1234/start');
    expect(calls[2]?.url).toBe('/api/site-diary');
  });

  it('Scenario 6 (EDIT PRESERVES SITE_DIARY_ID): updates existing record via PATCH without creating new activity or diary', async () => {
    const mockFetch = createMockFetch();
    const editParams: SubmitDailyEntryParams = {
      ...defaultParams,
      editingSiteDiaryId: 'sd-uuid-existing-7777',
      editingActivityId: null,
      selectedSource: null,
      notes: 'Kemaskini catatan harian oleh Pegawai Penguasa.',
    };

    const result = await submitDailyEntry({ ...editParams, fetchFn: mockFetch });
    expect(result.siteDiaryId).toBe('sd-uuid-existing-7777');

    // Verify no new activity was POSTed
    const actCall = calls.find((c) => c.url === '/api/activities' && c.method === 'POST');
    expect(actCall).toBeUndefined();

    // Verify no new site diary was POSTed
    const sdPostCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(sdPostCall).toBeUndefined();

    // Verify PATCH was called on existing ID
    const patchCall = calls.find((c) => c.url.includes('/api/site-diary/sd-uuid-existing-7777') && c.method === 'PATCH');
    expect(patchCall).toBeDefined();
    expect(patchCall?.body.notes).toBe('Kemaskini catatan harian oleh Pegawai Penguasa.');
  });

  it('Scenario 7 (DUPLICATE PREVENTION): catches governed unique constraint conflict and formats localized error', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary': {
        status: 400,
        json: { error: 'duplicate key value violates unique constraint "site_diary_activity_date_unique"' },
      },
    });

    await expect(submitDailyEntry({ ...defaultParams, fetchFn: mockFetch })).rejects.toThrow(
      'Laporan untuk aktiviti ini pada tarikh 2026-08-16 telah wujud.'
    );
  });

  it('Scenario 8 (WORKFORCE ATOMIC PAYLOAD): compiles and submits full manpower array in site diary payload', async () => {
    const mockFetch = createMockFetch();
    const workforceParams: SubmitDailyEntryParams = {
      ...defaultParams,
      manpower: [
        { trade_name: 'Carpenter', bumi_count: 2, non_bumi_count: 1, foreign_count: 4 },
        { trade_name: 'Concretor', bumi_count: 0, non_bumi_count: 0, foreign_count: 6 },
        { trade_name: 'Bar Bender', bumi_count: 0, non_bumi_count: 0, foreign_count: 0 }, // Should be filtered out
      ],
    };

    await submitDailyEntry({ ...workforceParams, fetchFn: mockFetch });

    const sdCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(sdCall?.body.manpower).toEqual([
      { trade_name: 'Carpenter', bumi_count: 2, non_bumi_count: 1, foreign_count: 4 },
      { trade_name: 'Concretor', bumi_count: 0, non_bumi_count: 0, foreign_count: 6 },
    ]);
  });

  it('Scenario 9 (PRINT_CONTEXT): compiles all 7 JKR Page 1 fields with conditional rainfall times', async () => {
    const mockFetch = createMockFetch();

    // 1. Weather = HUJAN -> includes rain times
    const rainyParams: SubmitDailyEntryParams = {
      ...defaultParams,
      weatherCondition: 'HUJAN',
      rainStartTime: '14:30',
      rainEndTime: '16:00',
      contractorScope: 'NSC',
      location: 'Blok B Tingkat 2, Zon Basah',
      workStartTime: '08:30',
      workEndTime: '17:30',
    };

    await submitDailyEntry({ ...rainyParams, fetchFn: mockFetch });

    const rainySdCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(rainySdCall?.body.print_context).toEqual({
      location: 'Blok B Tingkat 2, Zon Basah',
      work_start_time: '08:30',
      work_end_time: '17:30',
      weather_condition: 'HUJAN',
      rain_start_time: '14:30',
      rain_end_time: '16:00',
      contractor_scope: 'NSC',
    });
    expect(rainySdCall?.body.weather).toBe('Rainy');

    // 2. Weather = ELOK -> rain times must be null even if string provided in state
    calls = [];
    const sunnyParams: SubmitDailyEntryParams = {
      ...defaultParams,
      weatherCondition: 'ELOK',
      rainStartTime: '14:30',
      rainEndTime: '16:00',
    };

    await submitDailyEntry({ ...sunnyParams, fetchFn: mockFetch });
    const sunnySdCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(sunnySdCall?.body.print_context.rain_start_time).toBeNull();
    expect(sunnySdCall?.body.print_context.rain_end_time).toBeNull();
    expect(sunnySdCall?.body.weather).toBe('Sunny');
  });

  it('Scenario 10 (AUTH / ACTOR BOUNDARY): never sends client-side actorId or submittedBy in mutation payloads', async () => {
    const mockFetch = createMockFetch();
    await submitDailyEntry({ ...defaultParams, fetchFn: mockFetch });

    for (const call of calls) {
      if (call.body) {
        expect(call.body.actor_id).toBeUndefined();
        expect(call.body.actorId).toBeUndefined();
        expect(call.body.submitted_by).toBeUndefined();
        expect(call.body.submittedBy).toBeUndefined();
        expect(call.body.created_by).toBeUndefined();
        expect(call.body.updated_by).toBeUndefined();
      }
    }
  });

  // -------------------------------------------------------------
  // LIFECYCLE FAILURE-SAFETY TESTS (A - E)
  // -------------------------------------------------------------

  it('Failure Test A: Activity creation fails -> aborts immediately, NO lifecycle request, NO Site Diary write', async () => {
    const mockFetch = createMockFetch({
      '/api/activities': {
        status: 400,
        json: { error: 'F1_ACTIVITY_SOURCE_INVALID' },
      },
    });

    await expect(submitDailyEntry({ ...defaultParams, fetchFn: mockFetch })).rejects.toThrow(
      'F1_ACTIVITY_SOURCE_INVALID'
    );

    // Assert only 1 call was made (the failed /api/activities POST)
    expect(calls.length).toBe(1);
    expect(calls[0]?.url).toBe('/api/activities');
    expect(calls.find((c) => c.url.includes('/start'))).toBeUndefined();
    expect(calls.find((c) => c.url.includes('/complete'))).toBeUndefined();
    expect(calls.find((c) => c.url === '/api/site-diary')).toBeUndefined();
  });

  it('Failure Test B: Activity /start fails materially -> aborts immediately, NO Site Diary write', async () => {
    const mockFetch = createMockFetch({
      '/start': {
        status: 400,
        json: { error: 'F1_ACTIVITY_START_DATE_FUTURE' },
      },
    });

    await expect(submitDailyEntry({ ...defaultParams, fetchFn: mockFetch })).rejects.toThrow(
      'F1_ACTIVITY_START_DATE_FUTURE'
    );

    // Assert activity was created and /start was attempted, but Site Diary POST was blocked
    expect(calls.length).toBe(2);
    expect(calls[0]?.url).toBe('/api/activities');
    expect(calls[1]?.url).toBe('/api/activities/act-uuid-msp-1234/start');
    expect(calls.find((c) => c.url === '/api/site-diary')).toBeUndefined();
  });

  it('Failure Test C: Activity /complete fails -> aborts immediately, NO Site Diary write', async () => {
    const mockFetch = createMockFetch({
      '/complete': {
        status: 400,
        json: { error: 'F1_ACTIVITY_DATE_ORDER_INVALID' },
      },
    });

    await expect(
      submitDailyEntry({ ...defaultParams, workStatus: 'Siap', fetchFn: mockFetch })
    ).rejects.toThrow('F1_ACTIVITY_DATE_ORDER_INVALID');

    expect(calls.length).toBe(2);
    expect(calls[0]?.url).toBe('/api/activities');
    expect(calls[1]?.url).toBe('/api/activities/act-uuid-msp-1234/complete');
    expect(calls.find((c) => c.url === '/api/site-diary')).toBeUndefined();
  });

  it('Failure Test D: Site Diary write fails -> aborts with server error, no false success return', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary': {
        status: 500,
        json: { error: 'Database connection timeout during atomic persist' },
      },
    });

    await expect(submitDailyEntry({ ...defaultParams, fetchFn: mockFetch })).rejects.toThrow(
      'Database connection timeout during atomic persist'
    );
  });

  it('Failure Test E: Edit PATCH fails -> aborts with error, NO fallback POST creating replacement row', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary/sd-uuid-existing-7777': {
        status: 400,
        json: { error: 'Invalid print_context format' },
      },
    });

    const editParams: SubmitDailyEntryParams = {
      ...defaultParams,
      editingSiteDiaryId: 'sd-uuid-existing-7777',
      editingActivityId: null,
      selectedSource: null,
    };

    await expect(submitDailyEntry({ ...editParams, fetchFn: mockFetch })).rejects.toThrow(
      'Invalid print_context format'
    );

    // Verify only the PATCH was attempted, never falling back to POST
    expect(calls.length).toBe(1);
    expect(calls[0]?.method).toBe('PATCH');
    expect(calls.find((c) => c.method === 'POST')).toBeUndefined();
  });

  it('Component Rendering: renders native DailyEntryForm with full mobile-first form controls', () => {
    const html = renderToString(
      React.createElement(DailyEntryForm, { initialTab: 'NEW_ACTIVITY' })
    );

    expect(html).toContain('Tarikh &amp; Status Kerja');
    expect(html).toContain('Maklumat Tapak &amp; Cuaca (Format JKR Page 1)');
    expect(html).toContain('Tenaga Kerja di Tapak (Workforce)');
    expect(html).toContain('Catatan &amp; Huraian Kemajuan Kerja');
    expect(html).toContain('Hantar &amp; Simpan Buku Harian Tapak');
  });
});
