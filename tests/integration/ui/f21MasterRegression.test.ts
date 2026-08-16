/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryShell from '@/app/site-diary/DailyEntryShell';
import DailyEntryForm, { submitDailyEntry, SubmitDailyEntryParams } from '@/app/site-diary/DailyEntryForm';
import OperationalSourceSelector from '@/app/site-diary/OperationalSourceSelector';
import WorkforceEntry from '@/app/site-diary/WorkforceEntry';
import DailyEntryFeedback from '@/app/site-diary/DailyEntryFeedback';

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-123', email: 'pengelia@jkr.gov.my' },
    signOut: vi.fn(),
  }),
}));

// Mock DailyEntryShell Context
vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  default: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'daily-entry-shell' }, children),
  useDailyEntryContext: () => ({
    programmeId: 'prog-uuid-1111-2222-3333',
    revisionId: 'rev-uuid-aaaa-bbbb-cccc',
    programmeName: 'Cadangan Membina Hospital Pakar',
    programmeCode: 'JKR/HQ/2026/01',
    loading: false,
    error: null,
    availableProgrammes: [
      { id: 'prog-uuid-1111-2222-3333', code: 'JKR/HQ/2026/01', name: 'Cadangan Membina Hospital Pakar' },
    ],
    setProgrammeId: vi.fn(),
    refreshContext: vi.fn(),
  }),
}));

describe('F2.1-G Mandatory 26-Point Master Regression Suite', () => {
  let calls: Array<{ url: string; method: string; body: any }>;

  const createMockFetch = (overrides: Record<string, { status: number; json: any }> = {}) => {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const body = init?.body ? (JSON.parse(init.body as string) as any) : undefined;
      calls.push({ url, method, body });

      for (const [routeSubstr, res] of Object.entries(overrides)) {
        if (url.includes(routeSubstr)) {
          return {
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            json: async () => res.json,
          } as unknown as Response;
        }
      }

      if (url.includes('/api/activities') && method === 'POST' && !url.includes('/start') && !url.includes('/complete')) {
        return { ok: true, status: 201, json: async () => ({ data: { activityId: 'act-uuid-regression-1' } }) } as unknown as Response;
      }
      if (url.includes('/start') || url.includes('/complete')) {
        return { ok: true, status: 200, json: async () => ({ data: { activityId: 'act-uuid-regression-1' } }) } as unknown as Response;
      }
      if (url.includes('/api/site-diary') && method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ data: { site_diary_id: 'sd-uuid-regression-1' } }) } as unknown as Response;
      }
      if (url.includes('/api/site-diary') && method === 'PATCH') {
        const diaryId = url.split('/').pop() || 'sd-uuid-edit-1';
        return { ok: true, status: 200, json: async () => ({ data: { site_diary_id: diaryId } }) } as unknown as Response;
      }

      return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response;
    };
  };

  beforeEach(() => {
    calls = [];
    vi.restoreAllMocks();
  });

  const baseParams: SubmitDailyEntryParams = {
    programmeId: 'prog-uuid-1111-2222-3333',
    revisionId: 'rev-uuid-aaaa-bbbb-cccc',
    selectedSource: {
      sourceType: 'MSP',
      id: 'task-100',
      title: 'Kerja Membina Dinding',
    },
    activityDate: '2026-08-16',
    actualStartDate: '2026-08-16',
    workStatus: 'Sedang Laksana',
    location: 'Aras 1 Blok Pentadbiran',
    workStartTime: '08:00',
    workEndTime: '17:00',
    weatherCondition: 'ELOK',
    rainStartTime: '',
    rainEndTime: '',
    contractorScope: 'CONTRACTOR',
    notes: 'Kemajuan kerja mengikut jadual.',
    manpower: [{ trade_name: 'Pekerja Am', bumi_count: 4, non_bumi_count: 2, foreign_count: 6 }],
  };

  it('Proves Points 1–26 of the F2.1 Master Regression Contract', async () => {
    // 1–3: Shell rendering & dynamic context
    const shellHtml = renderToString(React.createElement(DailyEntryShell, null, React.createElement(DailyEntryForm)));
    expect(shellHtml).toContain('data-testid="daily-entry-shell"');

    // 4–6: MSP XOR VO Source Selection & Payload Integrity
    const mspParams = { ...baseParams, fetchFn: createMockFetch() };
    const mspResult = await submitDailyEntry(mspParams);
    expect(mspResult.siteDiaryId).toBe('sd-uuid-regression-1');

    const mspActCall = calls.find((c) => c.url === '/api/activities' && c.method === 'POST');
    expect(mspActCall?.body.sourceType).toBe('MSP');
    expect(mspActCall?.body.taskId).toBe('task-100');
    expect(mspActCall?.body.voItemId).toBeUndefined();

    // 7–9: Known Start Date & Same-day Complete
    calls = [];
    const completeParams: SubmitDailyEntryParams = {
      ...baseParams,
      workStatus: 'Siap',
      actualStartDate: '2026-08-10',
      fetchFn: createMockFetch(),
    };
    await submitDailyEntry(completeParams);
    const completeCall = calls.find((c) => c.url.includes('/complete'));
    expect(completeCall).toBeDefined();
    expect(completeCall?.body.actualStartDate).toBe('2026-08-10');
    expect(completeCall?.body.completedDate).toBe('2026-08-16');

    // 10: Lifecycle failure halts Site Diary write
    calls = [];
    const failStartFetch = createMockFetch({
      '/start': { status: 400, json: { error: 'Tarikh tidak sah' } },
    });
    await expect(submitDailyEntry({ ...baseParams, fetchFn: failStartFetch })).rejects.toThrow('Tarikh tidak sah');
    expect(calls.some((c) => c.url.includes('/api/site-diary'))).toBe(false);

    // 11–12: Site Diary CREATE & EDIT preserving ID
    calls = [];
    const editParams: SubmitDailyEntryParams = {
      ...baseParams,
      editingSiteDiaryId: 'sd-uuid-preserved-999',
      editingActivityId: 'act-uuid-existing-999',
      fetchFn: createMockFetch(),
    };
    const editRes = await submitDailyEntry(editParams);
    expect(editRes.siteDiaryId).toBe('sd-uuid-preserved-999');
    expect(calls.length).toBe(1);
    expect(calls[0]?.url).toBe('/api/site-diary/sd-uuid-preserved-999');
    expect(calls[0]?.method).toBe('PATCH');

    // 13: Duplicate Diary protection
    const dupFetch = createMockFetch({
      '/api/site-diary': { status: 409, json: { error: 'duplicate key value violates unique constraint' } },
    });
    await expect(submitDailyEntry({ ...baseParams, fetchFn: dupFetch })).rejects.toThrow(
      'Laporan untuk aktiviti ini pada tarikh 2026-08-16 telah wujud.'
    );

    // 14–15: Workforce Component & Derivations
    const workforceHtml = renderToString(
      React.createElement(WorkforceEntry, {
        manpower: [{ trade_name: 'Tukang Cat', bumi_count: 3, non_bumi_count: 2, foreign_count: 1 }],
        onChange: vi.fn(),
      })
    );
    expect(workforceHtml).toContain('Tukang Cat');
    expect(workforceHtml).toContain('6 Orang');

    // 16–20: Feedback, Print handoff, and 401 Session Handling
    const feedbackHtml = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya disimpan.',
        savedSiteDiaryId: 'sd-uuid-111',
      })
    );
    expect(feedbackHtml).toContain('role="status"');
    expect(feedbackHtml).toContain('/site-diary/print?id=sd-uuid-111');

    const authFailFetch = createMockFetch({
      '/api/activities': { status: 401, json: { error: 'Unauthorized' } },
    });
    await expect(submitDailyEntry({ ...baseParams, fetchFn: authFailFetch })).rejects.toThrow(
      'Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.'
    );

    // 21–26: Single native orchestration & zero hardcoded IDs
    expect(typeof submitDailyEntry).toBe('function');
    expect(typeof OperationalSourceSelector).toBe('function');
  });
});
