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

describe('F2.2-B03R2 — Real Component Race & Invalidation Lifecycle Suite', () => {
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
  // TEST 3 — Activity A → B stale prefill
  // ----------------------------------------------------------------------------------
  it('TEST 3 — Activity A -> B stale prefill: selecting B while A is loading leaves all B values authoritative when A resolves', async () => {
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

    // 1. Mount DailyEntryForm (starts on Open Activities tab by default)
    await act(async () => {
      root.render(React.createElement(DailyEntryForm, {}));
    });

    // 2. Select Activity A
    const continueButtons = container.querySelectorAll('[data-testid^="continue-activity-"]');
    expect(continueButtons.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      (continueButtons[0] as HTMLButtonElement).click();
    });

    // 3. Now select Activity B while Activity A prefill is still in-flight
    // (Render form with initialActivityId='act-uuid-B' or trigger selection)
    await act(async () => {
      root.render(React.createElement(DailyEntryForm, { initialActivityId: 'act-uuid-B' }));
    });

    // 4. Resolve B completely
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
              { trade_name: 'Barbender (Tukang Besi)', bumi_count: 5, non_bumi_count: 2, foreign_count: 0 },
            ],
            print_context: {
              location: 'Blok B, Aras 3, Grid 5-8',
              contractor_scope: 'NSC',
            },
          },
        ],
      });
    });

    // Assert: B fields are populated in the DOM
    expect(container.innerHTML).toContain('Aktiviti B - Kerja Konkrit Aras 3');
    const locationInput = container.querySelector('input[placeholder*="Grid"]') as HTMLInputElement;
    expect(locationInput?.value).toBe('Blok B, Aras 3, Grid 5-8');

    const scopeSelect = container.querySelectorAll('select')[1] as HTMLSelectElement;
    expect(scopeSelect?.value).toBe('NSC');

    // 5. Resolve Activity A last
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
              { trade_name: 'Concretor (Tukang Konkrit)', bumi_count: 10, non_bumi_count: 10, foreign_count: 10 },
            ],
            print_context: {
              location: 'STALE LOCATION A',
              contractor_scope: 'CONTRACTOR',
            },
          },
        ],
      });
    });

    // Assert: All B values remain unchanged, A never overwrites
    expect(container.innerHTML).toContain('Aktiviti B - Kerja Konkrit Aras 3');
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (STALE)');
    expect(locationInput.value).toBe('Blok B, Aras 3, Grid 5-8');
    expect(scopeSelect.value).toBe('NSC');
  });

  // ----------------------------------------------------------------------------------
  // TEST 4 — Back invalidation
  // ----------------------------------------------------------------------------------
  it('TEST 4 — Back invalidation: clicking "Kembali ke Aktiviti Terbuka" invalidates prefill; late A resolution does not repopulate', async () => {
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

    // 4. Resolve A late
    await act(async () => {
      defActA.resolve({
        data: {
          subtask: 'Aktiviti A - Cerucuk RC',
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
              { trade_name: 'Concretor (Tukang Konkrit)', bumi_count: 8, non_bumi_count: 0, foreign_count: 0 },
            ],
            print_context: {
              location: 'Grid Line A-Z',
              contractor_scope: 'NSC',
            },
          },
        ],
      });
    });

    // Assert: Continuation remains exited, banner is not restored, no stale state
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC');

    // 5. User switches to + Laporan Baharu tab
    const newTabBtn = container.querySelector('[data-testid="tab-new-activity"]') as HTMLButtonElement;
    await act(async () => {
      newTabBtn.click();
    });

    // Assert: Form starts clean (empty location, default trades 0, no leaked A fields)
    const locationInput = container.querySelector('input[placeholder*="Grid"]') as HTMLInputElement;
    expect(locationInput?.value).toBe('');
  });

  // ----------------------------------------------------------------------------------
  // TEST 5 — Programme invalidation
  // ----------------------------------------------------------------------------------
  it('TEST 5 — Programme invalidation: switching programme while Activity A is loading invalidates prefill and clears identity', async () => {
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

    // Assert: Continuation mode is immediately exited on programme change
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();

    // 4. Resolve old Activity A late
    await act(async () => {
      defActA.resolve({
        data: {
          subtask: 'Aktiviti A - Cerucuk RC (OLD PROG)',
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
              { trade_name: 'Concretor (Tukang Konkrit)', bumi_count: 5, non_bumi_count: 0, foreign_count: 0 },
            ],
            print_context: {
              location: 'OLD SELANGOR LOCATION',
              contractor_scope: 'CONTRACTOR',
            },
          },
        ],
      });
    });

    // Assert: Activity A identity remains cleared, Programme Kedah remains authoritative, no stale fields repopulated
    expect(container.querySelector('[data-testid="continuation-banner"]')).toBeNull();
    expect(container.innerHTML).not.toContain('Aktiviti A - Cerucuk RC (OLD PROG)');
    expect(container.innerHTML).toContain('Aktiviti Program B (Kerja Kumbahan)');
  });
});
