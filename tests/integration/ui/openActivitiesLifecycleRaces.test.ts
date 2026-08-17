// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import OpenActivitiesList from '@/app/site-diary/OpenActivitiesList';
import DailyEntryForm from '@/app/site-diary/DailyEntryForm';
import { OpenActivityDto } from '@/types/openActivity';
import { ActivityStatus, ActivitySourceType } from '@/types/activity';

// Enable React 19 act environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const todayIso = new Date().toISOString().split('T')[0] ?? '';

let currentProgrammeContext = {
  programmeId: 'prog-selangor-001',
  revisionId: 'rev-auth-v2',
  programmes: [
    { id: 'prog-selangor-001', name: 'Projek Pembinaan Hospital Cyberjaya', code: 'PRJ-CYBER-01' },
    { id: 'prog-kedah-002', name: 'Projek Lebuhraya Baling', code: 'PRJ-BALING-02' },
  ],
  isLoading: false,
  error: null,
  setSelectedProgrammeId: (id: string) => {
    currentProgrammeContext.programmeId = id;
  },
  refreshProgrammes: vi.fn(),
};

vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => currentProgrammeContext,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-supervisor-01', email: 'supervisor@jkr.gov.my' },
    session: { access_token: 'mock-jwt-token-123' },
    loading: false,
    signOut: vi.fn(),
  }),
}));

function createDeferred<T = any>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('F2.2-B03R3 — Real Component Race & Invalidation Lifecycle Suite', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentProgrammeContext = {
      programmeId: 'prog-selangor-001',
      revisionId: 'rev-auth-v2',
      programmes: [
        { id: 'prog-selangor-001', name: 'Projek Pembinaan Hospital Cyberjaya', code: 'PRJ-CYBER-01' },
        { id: 'prog-kedah-002', name: 'Projek Lebuhraya Baling', code: 'PRJ-BALING-02' },
      ],
      isLoading: false,
      error: null,
      setSelectedProgrammeId: (id: string) => {
        currentProgrammeContext.programmeId = id;
      },
      refreshProgrammes: vi.fn(),
    };
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const sampleActivityA: OpenActivityDto = {
    activityId: 'act-uuid-A',
    programmeId: 'prog-A',
    sourceType: ActivitySourceType.MSP,
    taskId: 'task-A',
    ahi: '1.1',
    subtask: 'Aktiviti Program A (Pemasangan RC)',
    subtaskDisplayName: 'Aktiviti Program A (Pemasangan RC)',
    ahiDisplayName: 'Struktur Asas',
    status: ActivityStatus.InProgress,
    isLocked: false,
    createdAt: '2026-08-17T08:00:00Z',
    createdBy: 'usr-supervisor-01',
  };

  const sampleActivityB: OpenActivityDto = {
    activityId: 'act-uuid-B',
    programmeId: 'prog-B',
    sourceType: ActivitySourceType.MSP,
    taskId: 'task-B',
    ahi: '2.1',
    subtask: 'Aktiviti Program B (Kerja Kumbahan)',
    subtaskDisplayName: 'Aktiviti Program B (Kerja Kumbahan)',
    ahiDisplayName: 'Mekanikal & Elektrikal',
    status: ActivityStatus.New,
    isLocked: false,
    createdAt: '2026-08-17T08:00:00Z',
    createdBy: 'usr-supervisor-01',
  };

  // ----------------------------------------------------------------------------------
  // TEST 1 — Programme A → B stale success
  // ----------------------------------------------------------------------------------
  it('TEST 1 — Programme A -> B stale success: resolves B first, stale A is ignored', async () => {
    const defA = createDeferred<{ data: OpenActivityDto[] }>();
    const defB = createDeferred<{ data: OpenActivityDto[] }>();

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('programmeId=prog-A')) {
        return defA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url.includes('programmeId=prog-B')) {
        return defB.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }) as any;

    // 1. Mount real OpenActivitiesList with Programme A
    await act(async () => {
      root.render(
        React.createElement(OpenActivitiesList, {
          programmeId: 'prog-A',
          onSelectActivity: vi.fn(),
          onCreateNewActivity: vi.fn(),
        })
      );
    });

    // Verify loading indicator is present
    expect(container.querySelector('[data-testid="open-activities-loading"]')).toBeTruthy();

    // 2. Rerender with Programme B while A is still pending
    await act(async () => {
      root.render(
        React.createElement(OpenActivitiesList, {
          programmeId: 'prog-B',
          onSelectActivity: vi.fn(),
          onCreateNewActivity: vi.fn(),
        })
      );
    });

    // 3. Resolve B first
    await act(async () => {
      defB.resolve({ data: [sampleActivityB] });
    });

    // Assert: B is visible
    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');
    expect(container.querySelector('[data-testid="open-activities-loading"]')).toBeNull();

    // 4. Resolve A last
    await act(async () => {
      defA.resolve({ data: [sampleActivityA] });
    });

    // Assert: B remains authoritative and visible, A never overwrites, loading state does not flicker
    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');
    expect(container.innerHTML).not.toContain('Aktiviti Program A (Pemasangan RC)');
    expect(container.querySelector('[data-testid="open-activities-loading"]')).toBeNull();
  });

  // ----------------------------------------------------------------------------------
  // TEST 2 — Programme A → B stale error
  // ----------------------------------------------------------------------------------
  it('TEST 2 — Programme A -> B stale error: A rejects after B succeeds, no error banner displayed', async () => {
    const defA = createDeferred<{ data: OpenActivityDto[] }>();
    const defB = createDeferred<{ data: OpenActivityDto[] }>();

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('programmeId=prog-A')) {
        return defA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url.includes('programmeId=prog-B')) {
        return defB.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    }) as any;

    // 1. Mount with Programme A
    await act(async () => {
      root.render(
        React.createElement(OpenActivitiesList, {
          programmeId: 'prog-A',
          onSelectActivity: vi.fn(),
          onCreateNewActivity: vi.fn(),
        })
      );
    });

    // 2. Switch to Programme B
    await act(async () => {
      root.render(
        React.createElement(OpenActivitiesList, {
          programmeId: 'prog-B',
          onSelectActivity: vi.fn(),
          onCreateNewActivity: vi.fn(),
        })
      );
    });

    // 3. Resolve B successfully
    await act(async () => {
      defB.resolve({ data: [sampleActivityB] });
    });

    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');
    expect(container.querySelector('[data-testid="open-activities-error"]')).toBeNull();

    // 4. Reject A afterward
    await act(async () => {
      defA.reject(new Error('Koneksi terputus untuk Program A'));
    });

    // Assert: B remains visible, no stale A error banner displayed, loading not affected
    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');
    expect(container.querySelector('[data-testid="open-activities-error"]')).toBeNull();
    expect(container.querySelector('[data-testid="open-activities-loading"]')).toBeNull();
  });

  // ----------------------------------------------------------------------------------
  // TEST 3 — Activity A → B stale prefill (Comprehensive Manpower + Identity Proof)
  // ----------------------------------------------------------------------------------
  it('TEST 3 — Activity A -> B stale prefill: proves distinct B manpower, location, scope, and identity survive late A resolution', async () => {
    const defActA = createDeferred<any>();
    const defDiaryA = createDeferred<any>();
    const defActB = createDeferred<any>();
    const defDiaryB = createDeferred<any>();

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/activities/open')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [sampleActivityA, sampleActivityB] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url === '/api/activity/act-uuid-A') {
        return defActA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url === '/api/site-diary/activity/act-uuid-A') {
        return defDiaryA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url === '/api/activity/act-uuid-B') {
        return defActB.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url === '/api/site-diary/activity/act-uuid-B') {
        return defDiaryB.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    }) as any;

    // 1. Mount DailyEntryForm
    await act(async () => {
      root.render(React.createElement(DailyEntryForm, {}));
    });

    // 2. Select Activity A
    const continueButtons = container.querySelectorAll('[data-testid^="continue-activity-"]');
    expect(continueButtons.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      (continueButtons[0] as HTMLButtonElement).click();
    });

    // 3. Select Activity B while Activity A prefill is still in-flight
    await act(async () => {
      root.render(React.createElement(DailyEntryForm, { initialActivityId: 'act-uuid-B' }));
    });

    // 4. Resolve B completely with clearly distinct authoritative values
    await act(async () => {
      defActB.resolve({
        data: {
          subtask: 'Aktiviti B - Kerja Konkrit Aras 3',
          source_type: 'MSP',
          status: 'In Progress',
          actual_start_date: '2026-08-10',
        },
      });
      defDiaryB.resolve({
        data: [
          {
            activity_date: '2026-08-15',
            manpower: [
              { trade_name: 'General Worker (Pekerja Am)', bumi_count: 7, non_bumi_count: 4, foreign_count: 2 },
              { trade_name: 'Bar Bender (Pembengkok Besi)', bumi_count: 5, non_bumi_count: 3, foreign_count: 1 },
            ],
            print_context: {
              location: 'Blok B, Aras 3, Grid 5-8',
              contractor_scope: 'NSC',
            },
          },
        ],
      });
    });

    // Assert: B banner and print context fields are populated
    expect(container.innerHTML).toContain('Aktiviti B - Kerja Konkrit Aras 3');
    const locationInput = container.querySelector('input[placeholder*="Grid"]') as HTMLInputElement;
    expect(locationInput?.value).toBe('Blok B, Aras 3, Grid 5-8');

    const scopeSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(scopeSelect?.value).toBe('NSC');

    // Assert: B manpower is rendered with authoritative counts (Pekerja Am: 7, 4, 2; Bar Bender: 5, 3, 1)
    const genWorkerBumi = container.querySelector('input[aria-label="Bilangan Bumiputera untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    const genWorkerNonBumi = container.querySelector('input[aria-label="Bilangan Bukan Bumiputera untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    const genWorkerForeign = container.querySelector('input[aria-label="Bilangan Bukan Warganegara untuk General Worker (Pekerja Am)"]') as HTMLInputElement;

    expect(genWorkerBumi?.value).toBe('7');
    expect(genWorkerNonBumi?.value).toBe('4');
    expect(genWorkerForeign?.value).toBe('2');

    const barBenderBumi = container.querySelector('input[aria-label="Bilangan Bumiputera untuk Bar Bender (Pembengkok Besi)"]') as HTMLInputElement;
    const barBenderNonBumi = container.querySelector('input[aria-label="Bilangan Bukan Bumiputera untuk Bar Bender (Pembengkok Besi)"]') as HTMLInputElement;
    const barBenderForeign = container.querySelector('input[aria-label="Bilangan Bukan Warganegara untuk Bar Bender (Pembengkok Besi)"]') as HTMLInputElement;

    expect(barBenderBumi?.value).toBe('5');
    expect(barBenderNonBumi?.value).toBe('3');
    expect(barBenderForeign?.value).toBe('1');

    // 5. Resolve Activity A LAST with completely distinct stale values
    await act(async () => {
      defActA.resolve({
        data: {
          subtask: 'Aktiviti A - Cerucuk RC (STALE)',
          source_type: 'VO',
          status: 'New',
          actual_start_date: '2026-08-01',
        },
      });
      defDiaryA.resolve({
        data: [
          {
            activity_date: '2026-08-14',
            manpower: [
              { trade_name: 'General Worker (Pekerja Am)', bumi_count: 91, non_bumi_count: 82, foreign_count: 73 },
              { trade_name: 'Concretor (Tukang Konkrit)', bumi_count: 50, non_bumi_count: 40, foreign_count: 30 },
            ],
            print_context: {
              location: 'STALE LOCATION A (999)',
              contractor_scope: 'CONTRACTOR',
            },
          },
        ],
      });
    });

    // Assert: Every B value remains strictly unchanged; zero A values leak into state
    expect(container.innerHTML).toContain('Aktiviti B - Kerja Konkrit Aras 3');
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (STALE)');
    expect(locationInput.value).toBe('Blok B, Aras 3, Grid 5-8');
    expect(scopeSelect.value).toBe('NSC');

    // Assert: Manpower remains strictly B (7/4/2 and 5/3/1) and does NOT contain A's 91/82/73 or 50/40/30
    expect(genWorkerBumi.value).toBe('7');
    expect(genWorkerNonBumi.value).toBe('4');
    expect(genWorkerForeign.value).toBe('2');
    expect(barBenderBumi.value).toBe('5');
    expect(barBenderNonBumi.value).toBe('3');
    expect(barBenderForeign.value).toBe('1');

    // Assert: Stale A's Concretor trade was never added, and stale A counts (91/82/73) are absent
    expect(container.querySelector('input[aria-label="Bilangan Bumiputera untuk Concretor (Tukang Konkrit)"]')).toBeNull();
    expect(container.querySelector('input[value="91"]')).toBeNull();
    expect(container.querySelector('input[value="82"]')).toBeNull();
    expect(container.querySelector('input[value="73"]')).toBeNull();
  });

  // ----------------------------------------------------------------------------------
  // TEST 4 — Back invalidation (Full-State Clean New Entry Proof)
  // ----------------------------------------------------------------------------------
  it('TEST 4 — Back invalidation: proves all continuation fields are invalidated and re-entering New Activity starts with canonical defaults', async () => {
    const defActA = createDeferred<any>();
    const defDiaryA = createDeferred<any>();

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/activities/open')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [sampleActivityA] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url === '/api/activity/act-uuid-A') {
        return defActA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url === '/api/site-diary/activity/act-uuid-A') {
        return defDiaryA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    }) as any;

    // 1. Mount DailyEntryForm
    await act(async () => {
      root.render(React.createElement(DailyEntryForm, {}));
    });

    // 2. Select Activity A
    const continueButton = container.querySelector('[data-testid^="continue-activity-"]') as HTMLButtonElement;
    expect(continueButton).toBeTruthy();

    await act(async () => {
      continueButton.click();
    });

    // In continuation mode, the back button is rendered in continuation-banner
    const backBtn = container.querySelector('[data-testid="back-to-open-activities-btn"]') as HTMLButtonElement;
    expect(backBtn).toBeTruthy();

    // 3. Click "Kembali ke Aktiviti Terbuka"
    await act(async () => {
      backBtn.click();
    });

    // Assert: Continuation banner is gone, Open Activities list is active
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.querySelector('#panel-open-activities')).toBeTruthy();

    // 4. Resolve A late with comprehensive data
    await act(async () => {
      defActA.resolve({
        data: {
          subtask: 'Aktiviti A - Cerucuk RC (STALE LATE)',
          source_type: 'VO',
          status: 'In Progress',
          actual_start_date: '2026-08-01',
        },
      });
      defDiaryA.resolve({
        data: [
          {
            activity_date: '2026-08-14',
            manpower: [
              { trade_name: 'General Worker (Pekerja Am)', bumi_count: 88, non_bumi_count: 77, foreign_count: 66 },
            ],
            print_context: {
              location: 'STALE GRID 99-100',
              contractor_scope: 'NSC',
              work_start_time: '07:30',
              work_end_time: '18:30',
              weather_condition: 'HUJAN',
              rain_start_time: '14:00',
              rain_end_time: '16:00',
            },
            notes: 'Stale progress notes from activity A',
          },
        ],
      });
    });

    // Assert: Continuation remains exited, banner is not restored
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (STALE LATE)');

    // 5. User switches to "+ Laporan Baharu" tab
    const newTabBtn = container.querySelector('[data-testid="tab-new-activity"]') as HTMLButtonElement;
    await act(async () => {
      newTabBtn.click();
    });

    // 6. Comprehensive assertions across ALL form fields for canonical NEW_ACTIVITY defaults:
    // A. No continuation banner or identity
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (STALE LATE)');

    // B. Operational source selector is present (not locked/bypassed)
    expect(container.querySelector('[data-testid="operational-source-selector"]') || container.innerHTML.includes('Sumber Aktiviti')).toBeTruthy();

    // C. Tarikh Laporan Harian & Tarikh Mula Sebenar start with todayIso
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect((dateInputs[0] as HTMLInputElement)?.value).toBe(todayIso);
    expect((dateInputs[1] as HTMLInputElement)?.value).toBe(todayIso);

    // D. Work status defaults to 'Sedang Laksana'
    const statusSelect = container.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(statusSelect?.value).toBe('Sedang Laksana');

    // E. Location is blank
    const locationInput = container.querySelector('input[placeholder*="Grid"]') as HTMLInputElement;
    expect(locationInput?.value).toBe('');

    // F. Contractor scope defaults to 'CONTRACTOR' (not stale 'NSC')
    const scopeSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(scopeSelect?.value).toBe('CONTRACTOR');

    // G. Weather condition defaults to 'ELOK' (not stale 'HUJAN')
    const weatherSelect = container.querySelectorAll('select')[2] as HTMLSelectElement;
    expect(weatherSelect?.value).toBe('ELOK');

    // H. Work start & end time default to 08:00 and 17:00 (not stale 07:30 / 18:30)
    const timeInputs = container.querySelectorAll('input[type="time"]');
    expect((timeInputs[0] as HTMLInputElement)?.value).toBe('08:00');
    expect((timeInputs[1] as HTMLInputElement)?.value).toBe('17:00');

    // I. Rain times are not rendered (since weather is ELOK, not HUJAN)
    expect(container.innerHTML).not.toContain('Masa Mula Hujan');

    // J. Manpower counts are all 0 (no leaked 88/77/66)
    const genWorkerBumi = container.querySelector('input[aria-label="Bilangan Bumiputera untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    const genWorkerNonBumi = container.querySelector('input[aria-label="Bilangan Bukan Bumiputera untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    const genWorkerForeign = container.querySelector('input[aria-label="Bilangan Bukan Warganegara untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    expect(genWorkerBumi?.value).toBe('0');
    expect(genWorkerNonBumi?.value).toBe('0');
    expect(genWorkerForeign?.value).toBe('0');

    // K. Notes are blank
    const notesTextarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(notesTextarea?.value).toBe('');

    // L. No stale error/success/saved banner
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('[data-testid="success-banner"]')).toBeNull();
  });

  // ----------------------------------------------------------------------------------
  // TEST 5 — Programme invalidation (Full-State Exposing Proof Under Programme B)
  // ----------------------------------------------------------------------------------
  it('TEST 5 — Programme invalidation: proves switching programme invalidates prefill and entering New Activity under Programme B has clean defaults', async () => {
    const defActA = createDeferred<any>();
    const defDiaryA = createDeferred<any>();

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('programmeId=prog-selangor-001')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [sampleActivityA] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url.includes('programmeId=prog-kedah-002')) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: [sampleActivityB] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      if (url === '/api/activity/act-uuid-A') {
        return defActA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      if (url === '/api/site-diary/activity/act-uuid-A') {
        return defDiaryA.promise.then(
          (res) => new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: {} }), { status: 200 }));
    }) as any;

    // 1. Start with Programme Selangor
    currentProgrammeContext.programmeId = 'prog-selangor-001';

    await act(async () => {
      root.render(React.createElement(DailyEntryForm, {}));
    });

    // 2. Select Activity A
    const continueBtn = container.querySelector('[data-testid^="continue-activity-"]') as HTMLButtonElement;
    await act(async () => {
      continueBtn.click();
    });

    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeTruthy();

    // 3. Switch context to Programme Kedah
    currentProgrammeContext.programmeId = 'prog-kedah-002';
    await act(async () => {
      root.render(React.createElement(DailyEntryForm, {}));
    });

    // Assert: Continuation mode is immediately exited on programme change, Programme Kedah list active
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');

    // 4. Resolve old Activity A late with rich data
    await act(async () => {
      defActA.resolve({
        data: {
          subtask: 'Aktiviti A - Cerucuk RC (OLD PROG SELANGOR)',
          source_type: 'MSP',
          status: 'In Progress',
          actual_start_date: '2026-08-01',
        },
      });
      defDiaryA.resolve({
        data: [
          {
            activity_date: '2026-08-14',
            manpower: [
              { trade_name: 'General Worker (Pekerja Am)', bumi_count: 55, non_bumi_count: 44, foreign_count: 33 },
            ],
            print_context: {
              location: 'OLD SELANGOR LOCATION (GRID 1-4)',
              contractor_scope: 'NSC',
              weather_condition: 'RIBUT',
              work_start_time: '06:00',
              work_end_time: '20:00',
            },
            notes: 'Old Selangor progress notes',
          },
        ],
      });
    });

    // Assert: Activity A identity remains cleared, Programme Kedah remains authoritative
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (OLD PROG SELANGOR)');
    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');

    // 5. Expose form by switching to "+ Laporan Baharu" under Programme Kedah
    const newTabBtn = container.querySelector('[data-testid="tab-new-activity"]') as HTMLButtonElement;
    await act(async () => {
      newTabBtn.click();
    });

    // 6. Comprehensive assertions on exposed form state:
    // A. No Activity A identity or banner
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (OLD PROG SELANGOR)');

    // B. Location is blank (not 'OLD SELANGOR LOCATION')
    const locationInput = container.querySelector('input[placeholder*="Grid"]') as HTMLInputElement;
    expect(locationInput?.value).toBe('');

    // C. Scope is 'CONTRACTOR' (not stale 'NSC')
    const scopeSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(scopeSelect?.value).toBe('CONTRACTOR');

    // D. Weather is 'ELOK' (not stale 'RIBUT')
    const weatherSelect = container.querySelectorAll('select')[2] as HTMLSelectElement;
    expect(weatherSelect?.value).toBe('ELOK');

    // E. Work times are default '08:00' and '17:00' (not stale '06:00' / '20:00')
    const timeInputs = container.querySelectorAll('input[type="time"]');
    expect((timeInputs[0] as HTMLInputElement)?.value).toBe('08:00');
    expect((timeInputs[1] as HTMLInputElement)?.value).toBe('17:00');

    // F. Notes are blank
    const notesTextarea = container.querySelector('textarea') as HTMLTextAreaElement;
    expect(notesTextarea?.value).toBe('');

    // G. Manpower counts are all 0 (no leaked 55/44/33)
    const genWorkerBumi = container.querySelector('input[aria-label="Bilangan Bumiputera untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    const genWorkerNonBumi = container.querySelector('input[aria-label="Bilangan Bukan Bumiputera untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    const genWorkerForeign = container.querySelector('input[aria-label="Bilangan Bukan Warganegara untuk General Worker (Pekerja Am)"]') as HTMLInputElement;
    expect(genWorkerBumi?.value).toBe('0');
    expect(genWorkerNonBumi?.value).toBe('0');
    expect(genWorkerForeign?.value).toBe('0');
    expect(container.querySelector('input[value="55"]')).toBeNull();
    expect(container.querySelector('input[value="44"]')).toBeNull();
    expect(container.querySelector('input[value="33"]')).toBeNull();

    // H. No stale alerts or saved IDs
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('[data-testid="success-banner"]')).toBeNull();
  });
});
