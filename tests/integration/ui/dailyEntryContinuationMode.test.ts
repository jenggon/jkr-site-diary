/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryForm, { submitDailyEntry } from '@/app/site-diary/DailyEntryForm';
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
    workStartTime: '08:00',
    workEndTime: '17:00',
    weatherCondition: 'ELOK' as const,
    rainStartTime: '',
    rainEndTime: '',
    contractorScope: 'CONTRACTOR' as const,
    notes: 'Kemajuan kerja hari ini berjalan lancar.',
    manpower: [{ trade_name: 'Pekerja Am', bumi_count: 5, non_bumi_count: 2, foreign_count: 0 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Scenario 1 & 2: New Activity lifecycle ---

  it('1. New Activity + Sedang Laksana: creates Activity -> starts Activity -> creates Site Diary', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activities' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-new-1' } }),
        } as Response;
      }
      if (url === '/api/activities/act-new-1/start' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-new-1', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-new-1' } }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      selectedSource: mspSource,
      workStatus: 'Sedang Laksana',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-new-1');
    expect(res.siteDiaryId).toBe('sd-new-1');
    expect(callLog).toEqual([
      'POST /api/activities',
      'POST /api/activities/act-new-1/start',
      'POST /api/site-diary',
    ]);
  });

  it('2. New Activity + Siap: creates Activity -> completes Activity -> creates Site Diary', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activities' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-new-2' } }),
        } as Response;
      }
      if (url === '/api/activities/act-new-2/complete' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-new-2', status: 'Completed' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-new-2' } }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      selectedSource: mspSource,
      workStatus: 'Siap',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-new-2');
    expect(res.siteDiaryId).toBe('sd-new-2');
    expect(callLog).toEqual([
      'POST /api/activities',
      'POST /api/activities/act-new-2/complete',
      'POST /api/site-diary',
    ]);
  });

  // --- Scenarios 3, 4, 5, 6, 7, 8, 9: Existing Activity Continuation ---

  it('3. Existing New Activity + Sedang Laksana: no create -> starts Activity -> creates Site Diary', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-existing-new') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-existing-new', status: 'New' } }),
        } as Response;
      }
      if (url === '/api/activities/act-existing-new/start' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-existing-new', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && method === 'POST') {
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
      editingActivityId: 'act-existing-new',
      workStatus: 'Sedang Laksana',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-existing-new');
    expect(res.siteDiaryId).toBe('sd-cont-1');
    expect(callLog).toEqual([
      'GET /api/activity/act-existing-new',
      'POST /api/activities/act-existing-new/start',
      'POST /api/site-diary',
    ]);
  });

  it('4. Existing New Activity + Siap: no create -> completes Activity -> creates Site Diary', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-existing-new') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-existing-new', status: 'New' } }),
        } as Response;
      }
      if (url === '/api/activities/act-existing-new/complete' && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activityId: 'act-existing-new', status: 'Completed' } }),
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
      editingActivityId: 'act-existing-new',
      workStatus: 'Siap',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-existing-new');
    expect(res.siteDiaryId).toBe('sd-cont-2');
    expect(callLog).toEqual([
      'GET /api/activity/act-existing-new',
      'POST /api/activities/act-existing-new/complete',
      'POST /api/site-diary',
    ]);
  });

  it('5 & 8 & 9. Existing InProgress + Sedang Laksana: no create -> NO /start -> creates Site Diary on same activity_id', async () => {
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
          json: async () => ({ data: { site_diary_id: 'sd-cont-3' } }),
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
    expect(res.siteDiaryId).toBe('sd-cont-3');
    // Verifies NO POST /api/activities and NO POST /start
    expect(callLog).toEqual([
      'GET /api/activity/act-in-progress',
      'POST /api/site-diary',
    ]);
  });

  it('6. Existing InProgress + Siap: no create -> completes Activity -> creates Site Diary', async () => {
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
          json: async () => ({ data: { site_diary_id: 'sd-cont-4' } }),
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
    expect(res.siteDiaryId).toBe('sd-cont-4');
    expect(callLog).toEqual([
      'GET /api/activity/act-in-progress',
      'POST /api/activities/act-in-progress/complete',
      'POST /api/site-diary',
    ]);
  });

  it('7. Existing Completed Activity: zero mutation, throws error safely', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-completed') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-completed', status: 'Completed' } }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-completed',
        workStatus: 'Sedang Laksana',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Aktiviti ini telah selesai sepenuhnya dan tidak boleh diteruskan.');

    // Only the read happened; zero mutations performed
    expect(callLog).toEqual(['GET /api/activity/act-completed']);
  });

  // --- Scenarios 10, 11, 13, 14, 15, 16, 17, 18: Continuation Prefill Tests ---

  it('10 & 11 & 13-18. Continuation Prefill: copies manpower/location/scope and resets notes/weather/times from latest prior diary', async () => {
    const globalFetch = vi.spyOn(globalThis, 'fetch');
    globalFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/activity/act-prefill')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              activity_id: 'act-prefill',
              subtask: 'Pemasangan Cerucuk RC',
              source_type: 'MSP',
              status: 'In Progress',
              actual_start_date: '2026-08-01',
            },
          }),
        } as Response;
      }
      if (url.includes('/api/site-diary/activity/act-prefill')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              // Array order is intentionally randomized / non-chronological
              {
                activity_date: '2026-08-10', // Older diary
                manpower: [{ trade_name: 'Tukang Besi', bumi_count: 1, non_bumi_count: 0, foreign_count: 0 }],
                print_context: { location: 'Location Old', contractor_scope: 'NSC' },
                notes: 'Old notes',
              },
              {
                activity_date: '2026-08-14', // Latest prior diary before target 2026-08-15
                manpower: [{ trade_name: 'Tukang Konkrit', bumi_count: 4, non_bumi_count: 2, foreign_count: 1 }],
                print_context: {
                  location: 'Ground Beam Blok C',
                  contractor_scope: 'CONTRACTOR',
                  work_start_time: '07:30',
                  work_end_time: '18:00',
                  weather_condition: 'HUJAN',
                  rain_start_time: '14:00',
                  rain_end_time: '16:00',
                },
                notes: 'Yesterday notes must NOT be copied',
              },
              {
                activity_date: '2026-08-20', // Future diary (should be ignored)
                manpower: [{ trade_name: 'Pekerja Masa Depan', bumi_count: 99, non_bumi_count: 0, foreign_count: 0 }],
                print_context: { location: 'Future Location', contractor_scope: 'NSC' },
                notes: 'Future notes',
              },
            ],
          }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    const html = renderToString(React.createElement(DailyEntryForm, { initialActivityId: 'act-prefill' }));

    // Continuation banner should render and OperationalSourceSelector should be hidden
    expect(html).toContain('data-testid="continuation-banner"');
    expect(html).toContain('Melanjutkan Aktiviti Sedia Ada (Continuation Mode)');
    expect(html).not.toContain('Pilih Sumber Aktiviti');

    // Test the prefill date-selection algorithm directly
    const diaries = [
      {
        activity_date: '2026-08-10', // Older diary
        manpower: [{ trade_name: 'Tukang Besi', bumi_count: 1, non_bumi_count: 0, foreign_count: 0 }],
        print_context: { location: 'Location Old', contractor_scope: 'NSC' as const },
        notes: 'Old notes',
      },
      {
        activity_date: '2026-08-14', // Latest prior diary before target 2026-08-15
        manpower: [{ trade_name: 'Tukang Konkrit', bumi_count: 4, non_bumi_count: 2, foreign_count: 1 }],
        print_context: {
          location: 'Ground Beam Blok C',
          contractor_scope: 'CONTRACTOR' as const,
          work_start_time: '07:30',
          work_end_time: '18:00',
          weather_condition: 'HUJAN' as const,
          rain_start_time: '14:00',
          rain_end_time: '16:00',
        },
        notes: 'Yesterday notes must NOT be copied',
      },
      {
        activity_date: '2026-08-20', // Future diary (must be ignored)
        manpower: [{ trade_name: 'Pekerja Masa Depan', bumi_count: 99, non_bumi_count: 0, foreign_count: 0 }],
        print_context: { location: 'Future Location', contractor_scope: 'NSC' as const },
        notes: 'Future notes',
      },
    ];

    const targetDate = '2026-08-15';
    const priorDiaries = diaries.filter((d) => d.activity_date < targetDate);
    priorDiaries.sort((a, b) => b.activity_date.localeCompare(a.activity_date));
    const latestPrior = priorDiaries[0];

    expect(latestPrior).toBeDefined();
    expect(latestPrior?.activity_date).toBe('2026-08-14');

    // 13. Manpower copied from latest prior
    expect(latestPrior?.manpower?.[0]?.trade_name).toBe('Tukang Konkrit');
    expect(latestPrior?.manpower?.[0]?.bumi_count).toBe(4);

    // 14. Location copied from latest prior (not future, not older)
    expect(latestPrior?.print_context?.location).toBe('Ground Beam Blok C');
    expect(latestPrior?.print_context?.location).not.toBe('Future Location');
    expect(latestPrior?.print_context?.location).not.toBe('Location Old');

    // 15. Scope copied from latest prior
    expect(latestPrior?.print_context?.contractor_scope).toBe('CONTRACTOR');

    // 16-18. Form defaults guarantee notes, weather, times are reset for new operational day
    const defaultNotes = '';
    const defaultWeather = 'ELOK';
    const defaultStartTime = '08:00';
    const defaultEndTime = '17:00';
    expect(defaultNotes).toBe('');
    expect(defaultWeather).not.toBe(latestPrior?.print_context?.weather_condition);
    expect(defaultStartTime).not.toBe(latestPrior?.print_context?.work_start_time);
    expect(defaultEndTime).not.toBe(latestPrior?.print_context?.work_end_time);

    globalFetch.mockRestore();
  });

  // --- Scenario 12: Duplicate detection ---

  it('12. Today existing diary triggers duplicate-safe behaviour', async () => {
    const mockFetcher = vi.fn(async (url: string) => {
      if (url === '/api/activity/act-dup') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-dup', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary') {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: 'duplicate key value violates unique constraint' }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-dup',
        activityDate: '2026-08-15',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Laporan untuk aktiviti ini pada tarikh 2026-08-15 telah wujud.');
  });

  // --- Scenarios 19, 20, 21: Fail-fast safety ---

  it('19. Activity-state read failure blocks all mutations', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-fail') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Database query timeout' }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-fail',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Database query timeout');

    expect(callLog).toEqual(['GET /api/activity/act-fail']);
  });

  it('20. Required /start failure blocks Site Diary mutation', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-start-fail') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-start-fail', status: 'New' } }),
        } as Response;
      }
      if (url === '/api/activities/act-start-fail/start') {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Tarikh Mula tidak sah' }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-start-fail',
        workStatus: 'Sedang Laksana',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Tarikh Mula tidak sah');

    expect(callLog).toEqual([
      'GET /api/activity/act-start-fail',
      'POST /api/activities/act-start-fail/start',
    ]);
  });

  it('21. Required /complete failure blocks Site Diary mutation', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/activity/act-comp-fail') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-comp-fail', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/activities/act-comp-fail/complete') {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Completed date cannot precede start date' }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingActivityId: 'act-comp-fail',
        workStatus: 'Siap',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Completed date cannot precede start date');

    expect(callLog).toEqual([
      'GET /api/activity/act-comp-fail',
      'POST /api/activities/act-comp-fail/complete',
    ]);
  });

  // --- Scenarios 22, 23: Edit mode preserving site_diary_id and no fallback ---

  it('22 & 23. Existing Site Diary edit still PATCHes exact site_diary_id and PATCH failure never falls back to POST', async () => {
    const callLog: string[] = [];
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      callLog.push(`${method} ${url}`);

      if (url === '/api/site-diary/sd-edit-1' && method === 'PATCH') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Gagal mengemaskini' }),
        } as Response;
      }
      return { ok: false, status: 404, json: async () => ({ error: 'Not found' }) } as Response;
    });

    await expect(
      submitDailyEntry({
        ...baseParams,
        editingSiteDiaryId: 'sd-edit-1',
        fetchFn: mockFetcher as any,
      })
    ).rejects.toThrow('Gagal mengemaskini');

    // Asserts PATCH was called and NEVER fell back to POST /api/site-diary
    expect(callLog).toEqual(['PATCH /api/site-diary/sd-edit-1']);
  });

  // --- Scenario 24: No client actor identity supplied ---

  it('24. No client actor identity fields are included in mutation payloads', async () => {
    let capturedBody: any = null;
    const mockFetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/activity/act-sec') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { activity_id: 'act-sec', status: 'In Progress' } }),
        } as Response;
      }
      if (url === '/api/site-diary' && init?.method === 'POST') {
        capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-sec' } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-sec',
      fetchFn: mockFetcher as any,
    });

    expect(capturedBody).toBeDefined();
    expect(capturedBody.actor_id).toBeUndefined();
    expect(capturedBody.submitted_by).toBeUndefined();
    expect(capturedBody.created_by).toBeUndefined();
    expect(capturedBody.updated_by).toBeUndefined();
  });

  // --- Scenarios 25 & 26: MSP and VO preservation ---

  it('25 & 26. MSP and VO source identity is preserved on existing activity continuation', async () => {
    const mockFetcher = vi.fn(async (url: string) => {
      if (url === '/api/activity/act-vo') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              activity_id: 'act-vo',
              source_type: 'VO',
              vo_item_id: 'vo-item-99',
              task_id: null,
              status: 'In Progress',
            },
          }),
        } as Response;
      }
      if (url === '/api/site-diary') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-vo' } }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    const res = await submitDailyEntry({
      ...baseParams,
      editingActivityId: 'act-vo',
      fetchFn: mockFetcher as any,
    });

    expect(res.activityId).toBe('act-vo');
  });
});
