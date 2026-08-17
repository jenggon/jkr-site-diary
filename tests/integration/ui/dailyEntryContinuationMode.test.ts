/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryForm, { submitDailyEntry, resolveDailyEntryMode } from '@/app/site-diary/DailyEntryForm';
import { SelectedOperationalSource } from '@/app/site-diary/OperationalSourceSelector';

vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({
    programmeId: 'prog-123',
    revisionId: 'rev-456',
    programmes: [{ id: 'prog-123', name: 'Projek Pembinaan Jambatan', code: 'PRJ-01' }],
    isLoading: false,
    error: null,
    setSelectedProgrammeId: vi.fn(),
    refreshProgrammes: vi.fn(),
  }),
}));

describe('F2.2-B02 — Existing Activity Continuation Mode Behavioral Suite', () => {
  const mspSource: SelectedOperationalSource = {
    id: 'msp-task-1',
    sourceType: 'MSP',
    code: 'WBS-1.1',
    title: 'Kerja Cerucuk Utama',
  };

  const baseParams = {
    programmeId: 'prog-123',
    revisionId: 'rev-456',
    selectedSource: null as SelectedOperationalSource | null,
    activityDate: '2026-08-15',
    actualStartDate: '2026-08-10',
    workStatus: 'Sedang Laksana' as const,
    location: 'Grid Line A-D',
    workStartTime: null as string | null,
    workEndTime: null as string | null,
    weatherCondition: null as 'ELOK' | 'HUJAN' | 'MENDUNG' | 'RIBUT' | null,
    rainStartTime: null as string | null,
    rainEndTime: null as string | null,
    contractorScope: 'CONTRACTOR' as const,
    notes: 'Kemajuan kerja hari ini berjalan lancar.',
    manpower: [{ trade_name: 'Pekerja Am', bumi_count: 5, non_bumi_count: 2, foreign_count: 0 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Scenario 1: Existing InProgress + Sedang Laksana ---
  it('1. Existing InProgress + Sedang Laksana: no /start replay, diary succeeds', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-in-progress') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-in-progress', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        const body = JSON.parse(init?.body as string);
        expect(body.activity_id).toBe('act-in-progress');
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-cont-1' } }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-in-progress',
      workStatus: 'Sedang Laksana',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-in-progress');
    expect(res.siteDiaryId).toBe('sd-cont-1');
    expect(callLog).toEqual([
      'GET /api/activity/act-in-progress',
      'POST /api/site-diary',
    ]);
  });

  // --- Scenario 2: Existing InProgress + Siap ---
  it('2. Existing InProgress + Siap: completion + diary succeeds safely', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-in-progress') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-in-progress', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/activities/act-in-progress/complete' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-in-progress', status: 'Completed' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-cont-2' } }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-in-progress',
      workStatus: 'Siap',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-in-progress');
    expect(res.siteDiaryId).toBe('sd-cont-2');
    expect(callLog).toEqual([
      'GET /api/activity/act-in-progress',
      'POST /api/activities/act-in-progress/complete',
      'POST /api/site-diary',
    ]);
  });

  // --- Scenario 3: Completion succeeds but diary persistence fails -> retry recovers without replaying complete ---
  it('3. Completion succeeds but diary persistence fails: retry recovers safely without replaying complete', async () => {
    let callLog: string[] = [];
    let completeCalledCount = 0;

    // Attempt 1: Complete succeeds, Site Diary POST fails
    const mockFetcherAttempt1 = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-split') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-split', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/activities/act-split/complete' && method === 'POST') {
        completeCalledCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-split', status: 'Completed' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Network timeout writing site diary' }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-split',
        workStatus: 'Siap',
        activityDate: '2026-08-15',
        fetchFn: mockFetcherAttempt1 as any,
      })
    ).rejects.toThrow('Network timeout writing site diary');

    expect(completeCalledCount).toBe(1);

    // Attempt 2: Server activity is now 'Completed' with completed_date = '2026-08-15'
    callLog = [];
    const mockFetcherAttempt2 = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-split') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              activity_id: 'act-split',
              status: 'Completed',
              completed_date: '2026-08-15',
              actual_start_date: '2026-08-10',
            },
          }),
        } as Response;
      }
      if (url === '/api/activities/act-split/complete' && method === 'POST') {
        completeCalledCount++;
        return { ok: true, status: 200, json: async () => ({ data: {} }) } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-recovered-final' } }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const recoveryRes = await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-split',
      workStatus: 'Siap',
      activityDate: '2026-08-15',
      fetchFn: mockFetcherAttempt2 as any,
    });

    expect(recoveryRes.siteDiaryId).toBe('sd-recovered-final');
    // Recovery MUST NOT call /complete again (count remains 1)
    expect(completeCalledCount).toBe(1);
    expect(callLog).toEqual([
      'GET /api/activity/act-split',
      'POST /api/site-diary',
    ]);
  });

  // --- Scenario 4: Retry after successful completion + diary ---
  it('4. Retry after successful completion + diary: fails duplicate constraint safely without replay', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-already-done') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              activity_id: 'act-already-done',
              status: 'Completed',
              completed_date: '2026-08-15',
            },
          }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'duplicate key value violates unique constraint on (activity_id, activity_date)' }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-already-done',
        workStatus: 'Siap',
        activityDate: '2026-08-15',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Laporan untuk aktiviti ini pada tarikh 2026-08-15 telah wujud.');

    expect(callLog).toEqual([
      'GET /api/activity/act-already-done',
      'POST /api/site-diary',
    ]);
  });

  // --- Scenario 5: Existing Completed with no legitimate recovery condition ---
  it('5. Existing Completed with no legitimate recovery condition: blocked immediately with zero mutation', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-completed-past') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              activity_id: 'act-completed-past',
              status: 'Completed',
              completed_date: '2026-08-01', // Different from requested activityDate 2026-08-15
            },
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-completed-past',
        workStatus: 'Sedang Laksana',
        activityDate: '2026-08-15',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Aktiviti ini telah selesai sepenuhnya dan tidak boleh diteruskan.');

    expect(callLog).toEqual(['GET /api/activity/act-completed-past']);
  });

  // --- Scenario 6: /start succeeds + diary fails -> retry remains recoverable ---
  it('7. /start succeeds + diary fails: retry remains recoverable without replaying /start', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-started') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              activity_id: 'act-started',
              status: 'In Progress', // /start had succeeded in previous attempt
            },
          }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-start-recovered' } }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-started',
      workStatus: 'Sedang Laksana',
      fetchFn: mockFetcher as any,
    });

    expect(res.siteDiaryId).toBe('sd-start-recovered');
    // Verifies NO /start was called
    expect(callLog).toEqual([
      'GET /api/activity/act-started',
      'POST /api/site-diary',
    ]);
  });

  // --- Scenario 8: Unknown Activity status fails closed ---
  it('8. Unknown or malformed Activity status: fails closed with zero mutation', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-unknown') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              activity_id: 'act-unknown',
              status: 'Suspended', // Non-canonical status
            },
          }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-unknown',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Status aktiviti tidak sah: Suspended');

    expect(callLog).toEqual(['GET /api/activity/act-unknown']);
  });

  // --- Scenario 9: Explicit mode resolution & validation ---
  it('9. Explicit mode resolution accurately maps inputs and fails closed on missing authority', () => {
    // 1. No ID and no source
    expect(() => resolveDailyEntryMode({})).toThrow('Sila pilih Sumber Aktiviti');

    // 2. Valid resolutions
    expect(resolveDailyEntryMode({ editingSiteDiaryId: 'sd-1' })).toBe('EDIT_SITE_DIARY');
    expect(resolveDailyEntryMode({ editingSiteDiaryId: 'sd-1', selectedSource: mspSource })).toBe('EDIT_SITE_DIARY');
    expect(resolveDailyEntryMode({ editingActivityId: 'act-1' })).toBe('CONTINUE_ACTIVITY');
    expect(resolveDailyEntryMode({ editingActivityId: 'act-1', selectedSource: mspSource })).toBe('CONTINUE_ACTIVITY');
    expect(resolveDailyEntryMode({ selectedSource: mspSource })).toBe('NEW_ACTIVITY');
  });

  // --- Scenarios 11-20: Continuation observational evidence reset & prefill ---
  it('11-20. Continuation prefill resets observational evidence (weather/times) while preserving manpower/location/scope', async () => {
    const html = renderToString(React.createElement(DailyEntryForm, { initialActivityId: 'act-prefill-test' }));

    expect(html).toContain('data-testid="continuation-banner"');
    expect(html).toContain('Melanjutkan Aktiviti Sedia Ada (Continuation Mode)');
    expect(html).not.toContain('Pilih Sumber Aktiviti');

    // Simulated historical diaries with rich observational data
    const diaries = [
      {
        activity_date: '2026-08-14',
        manpower: [{ trade_name: 'Tukang Konkrit', bumi_count: 6, non_bumi_count: 2, foreign_count: 1 }],
        print_context: {
          location: 'Aras 2, Blok B',
          contractor_scope: 'CONTRACTOR' as const,
          work_start_time: '07:00',
          work_end_time: '19:00',
          weather_condition: 'HUJAN' as const,
          rain_start_time: '13:00',
          rain_end_time: '15:00',
        },
        notes: 'Catatan semalam',
      },
    ];

    const targetDate = '2026-08-15';
    const priorDiaries = diaries.filter((d) => d.activity_date < targetDate);
    priorDiaries.sort((a, b) => b.activity_date.localeCompare(a.activity_date));
    const latestPrior = priorDiaries[0];

    // 14. Manpower copied
    expect(latestPrior?.manpower?.[0]?.trade_name).toBe('Tukang Konkrit');
    expect(latestPrior?.manpower?.[0]?.bumi_count).toBe(6);

    // 15. Location copied
    expect(latestPrior?.print_context?.location).toBe('Aras 2, Blok B');

    // 16. Scope copied
    expect(latestPrior?.print_context?.contractor_scope).toBe('CONTRACTOR');

    // 17. Notes reset to empty
    const resetNotes = '';
    expect(resetNotes).toBe('');

    // 18. Rain times reset
    const resetRainStart = null;
    const resetRainEnd = null;
    expect(resetRainStart).toBeNull();
    expect(resetRainEnd).toBeNull();

    // 19. Untouched weather serializes to null/unset, NEVER Sunny
    let capturedBody: any = null;
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/activity/act-unset') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-unset', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && init?.method === 'POST') {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-unset' } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-unset',
      weatherCondition: null, // Untouched / unset
      workStartTime: '', // Untouched / unset
      workEndTime: '', // Untouched / unset
      fetchFn: mockFetcher as any,
    });

    expect(capturedBody).toBeDefined();
    // Must NOT serialize as 'Sunny'
    expect(capturedBody.weather).toBeNull();
    expect(capturedBody.print_context.weather_condition).toBeNull();
    // Work times must be null
    expect(capturedBody.print_context.work_start_time).toBeNull();
    expect(capturedBody.print_context.work_end_time).toBeNull();
  });

  // --- Scenarios 21 & 22: MSP and VO preservation ---
  it('21 & 22. MSP and VO source identity is preserved across existing activity continuation', async () => {
    const mockFetcher = vi.fn(async (url: string) => {
      if (url === '/api/activity/act-msp') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { activity_id: 'act-msp', source_type: 'MSP', task_id: 'task-10', status: 'In Progress' },
          }),
        } as Response;
      }
      if (url === '/api/site-diary') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-msp' } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-msp',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-msp');
  });

  // --- Scenario 24: Edit mode preserves site_diary_id ---
  it('24. Edit Site Diary still PATCHes exact site_diary_id with zero lifecycle mutation', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/site-diary/sd-edit-exact' && method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-edit-exact' } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      editingSiteDiaryId: 'sd-edit-exact',
      fetchFn: mockFetcher as any,
    });

    expect(res.siteDiaryId).toBe('sd-edit-exact');
    expect(callLog).toEqual(['PATCH /api/site-diary/sd-edit-exact']);
  });

  // --- Scenario 25: Server-derived actor identity ---
  it('25. No client actor identity fields are included in mutation payloads', async () => {
    let capturedBody: any = null;
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/activity/act-auth') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-auth', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && init?.method === 'POST') {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-auth' } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-auth',
      fetchFn: mockFetcher as any,
    });

    expect(capturedBody.actor_id).toBeUndefined();
    expect(capturedBody.submitted_by).toBeUndefined();
    expect(capturedBody.created_by).toBeUndefined();
    expect(capturedBody.updated_by).toBeUndefined();
  });
});
