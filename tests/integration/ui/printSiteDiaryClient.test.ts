// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import PrintSiteDiaryClient from '@/app/site-diary/print/PrintSiteDiaryClient';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

let mockSearchParams = new Map<string, string>();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    session: { access_token: 'mock-token' },
    user: { id: 'mock-user' }
  })
}));

// ============================================================
// Test helpers
// ============================================================

function makeDto(overrides: Record<string, unknown> = {}) {
  return {
    siteDiaryId: 'sd-exact',
    activityId: 'act-1',
    programmeId: 'prog-1',
    programmeName: 'Test Prog',
    programmeCode: 'P1',
    revisionId: 'rev-1',
    revisionNumber: 1,
    revisionTitle: 'Rev 1',
    revisionStatus: 'APPROVED',
    isCurrentRevision: true,
    isHistorical: false,
    activityDate: '2026-08-20',
    diaryStatus: 'Submitted',
    activityStatus: 'In Progress',
    sourceType: 'MSP',
    wbs: '1.1',
    taskName: 'MSP Task',
    isCritical: true,
    weather: null,
    notes: 'Sample Notes',
    printContext: {
      location: 'Block A',
      workStartTime: '08:00',
      workEndTime: '17:00',
      weatherCondition: 'ELOK',
      rainStartTime: null,
      rainEndTime: null,
      contractorScope: 'CONTRACTOR',
    },
    manpower: [
      { tradeName: 'CONCRETOR', bumiCount: 1, nonBumiCount: 2, foreignCount: 3 },
    ],
    submittedBy: 'pm1',
    submittedAt: '2026-08-20T10:00:00Z',
    updatedAt: null,
    ...overrides,
  };
}

describe('F2.5-B02-R1 Print Site Diary Hardened Renderer', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: any;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    mockSearchParams = new Map();
  });

  afterEach(() => {
    act(() => { root.unmount(); });
    container.remove();
    vi.restoreAllMocks();
  });

  const render = () => root.render(React.createElement(PrintSiteDiaryClient));
  const getHTML = () => container.innerHTML;
  const isButtonDisabled = () => {
    const btn = container.querySelector('button[type="button"]');
    return btn ? (btn as HTMLButtonElement).disabled : true;
  };

  // ============================================================
  // T1 — Exact endpoint usage and legacy exclusion
  // ============================================================
  it('T1: exact endpoint called, legacy /api/reports never called', async () => {
    mockSearchParams.set('id', 'sd-exact');
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);

    await act(async () => { render(); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/site-diary/sd-exact/print', expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/reports'));

    await act(async () => { d.resolve(json({ data: makeDto() })); });
    expect(getHTML()).toContain('MSP Task');
    expect(getHTML()).toContain('Block A');
    expect(getHTML()).toContain('CONCRETOR');
  });

  // ============================================================
  // T2 — R1-1: Response identity mismatch rejected
  // ============================================================
  it('T2: response identity mismatch — DTO B returned for request A must be rejected', async () => {
    mockSearchParams.set('id', 'sd-A');
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);

    await act(async () => { render(); });

    // Server returns DTO with siteDiaryId = 'sd-B' but we requested 'sd-A'
    const dtoB = makeDto({ siteDiaryId: 'sd-B' });
    await act(async () => { d.resolve(json({ data: dtoB })); });

    const html = getHTML();
    expect(html).not.toContain('MSP Task'); // diary must NOT render
    expect(html).toContain('Gagal memuatkan laporan'); // bounded error shown
    expect(isButtonDisabled()).toBe(true);  // print disabled
  });

  // ============================================================
  // T3 — R1-3: 200 with missing data object rejected
  // ============================================================
  it('T3: 200 response with missing data field fails safely', async () => {
    mockSearchParams.set('id', 'sd-exact');
    fetchMock.mockResolvedValueOnce(json({ ok: true })); // no 'data' key

    await act(async () => { render(); });

    const html = getHTML();
    expect(html).not.toContain('MSP Task');
    expect(html).toContain('Gagal memuatkan laporan');
    expect(isButtonDisabled()).toBe(true);
  });

  // ============================================================
  // T4 — R1-3: Malformed success payload rejected
  // ============================================================
  it('T4: malformed success payload (missing printContext) fails safely', async () => {
    mockSearchParams.set('id', 'sd-exact');
    const broken = makeDto({ siteDiaryId: 'sd-exact' }) as any;
    delete broken.printContext;
    fetchMock.mockResolvedValueOnce(json({ data: broken }));

    await act(async () => { render(); });

    expect(getHTML()).not.toContain('MSP Task');
    expect(getHTML()).toContain('Gagal memuatkan laporan');
    expect(isButtonDisabled()).toBe(true);
  });

  // ============================================================
  // T5 — R1-2: A→B same mounted component clears A immediately
  // ============================================================
  it('T5: A→B param change on same mounted component: A clears immediately while B loads', async () => {
    // Mount with id=sd-A
    mockSearchParams.set('id', 'sd-A');
    const dA = deferred<Response>();
    fetchMock.mockReturnValueOnce(dA.promise);

    await act(async () => { render(); });

    // Resolve A successfully so diary is populated
    await act(async () => {
      dA.resolve(json({ data: makeDto({ siteDiaryId: 'sd-A', taskName: 'Task A' }) }));
    });
    expect(getHTML()).toContain('Task A');

    // Now switch to id=sd-B — same mounted component, B pending
    mockSearchParams.set('id', 'sd-B');
    const dB = deferred<Response>();
    fetchMock.mockReturnValueOnce(dB.promise);

    // Trigger re-render (simulating router param change on same component)
    await act(async () => { render(); });

    // Task A must be gone IMMEDIATELY — diary cleared at start of B request
    expect(getHTML()).not.toContain('Task A');
    // Print button disabled during B's pending load
    expect(isButtonDisabled()).toBe(true);

    // Resolve B
    await act(async () => {
      dB.resolve(json({ data: makeDto({ siteDiaryId: 'sd-B', taskName: 'Task B' }) }));
    });
    expect(getHTML()).toContain('Task B');
    expect(getHTML()).not.toContain('Task A');
  });

  // ============================================================
  // T6 — R1-2: Stale A success cannot overwrite B
  // ============================================================
  it('T6: stale A success cannot overwrite B after param switches', async () => {
    mockSearchParams.set('id', 'sd-A');
    const dA = deferred<Response>();
    fetchMock.mockReturnValueOnce(dA.promise);
    await act(async () => { render(); });

    // Switch to B before A resolves
    mockSearchParams.set('id', 'sd-B');
    const dB = deferred<Response>();
    fetchMock.mockReturnValueOnce(dB.promise);
    await act(async () => { render(); });

    // B resolves first
    await act(async () => {
      dB.resolve(json({ data: makeDto({ siteDiaryId: 'sd-B', taskName: 'Task B' }) }));
    });
    expect(getHTML()).toContain('Task B');

    // A resolves late — must NOT overwrite B
    await act(async () => {
      dA.resolve(json({ data: makeDto({ siteDiaryId: 'sd-A', taskName: 'Task A' }) }));
    });
    expect(getHTML()).toContain('Task B');
    expect(getHTML()).not.toContain('Task A');
  });

  // ============================================================
  // T7 — R1-2: Stale A error cannot overwrite B
  // ============================================================
  it('T7: stale A error cannot overwrite B after param switches', async () => {
    mockSearchParams.set('id', 'sd-A');
    const dA = deferred<Response>();
    fetchMock.mockReturnValueOnce(dA.promise);
    await act(async () => { render(); });

    // Switch to B
    mockSearchParams.set('id', 'sd-B');
    const dB = deferred<Response>();
    fetchMock.mockReturnValueOnce(dB.promise);
    await act(async () => { render(); });

    // B resolves successfully
    await act(async () => {
      dB.resolve(json({ data: makeDto({ siteDiaryId: 'sd-B', taskName: 'Task B' }) }));
    });
    expect(getHTML()).toContain('Task B');

    // A rejects late — must NOT clear B or show error
    await act(async () => {
      dA.reject(new Error('stale error'));
    });
    expect(getHTML()).toContain('Task B');
    expect(getHTML()).not.toContain('Ralat');
    expect(getHTML()).not.toContain('Gagal');
  });

  // ============================================================
  // T8 — R1-4: 500 raw internal detail never surfaced
  // ============================================================
  it('T8: 500 sensitive internal text never shown in UI', async () => {
    mockSearchParams.set('id', 'sd-exact');
    fetchMock.mockResolvedValueOnce(json({ error: 'sensitive internal database detail' }, 500));

    await act(async () => { render(); });

    const html = getHTML();
    expect(html).not.toContain('sensitive internal database detail');
    expect(html).not.toContain('database');
    // Shows a bounded generic message instead
    expect(html).toContain('Gagal memuatkan laporan');
  });

  // ============================================================
  // T9 — R1-4: 400 uses bounded copy, not raw backend text
  // ============================================================
  it('T9: 400 uses bounded user-facing copy', async () => {
    mockSearchParams.set('id', 'sd-bad-id');
    fetchMock.mockResolvedValueOnce(json({ error: 'invalid UUID format at column id' }, 400));

    await act(async () => { render(); });

    const html = getHTML();
    expect(html).not.toContain('invalid UUID format');
    expect(html).toContain('Permintaan tidak sah');
    expect(isButtonDisabled()).toBe(true);
  });

  // ============================================================
  // T10 — R1-5: null activityStatus selects no status
  // ============================================================
  it('T10: null activityStatus renders no status checkmark selected', async () => {
    mockSearchParams.set('id', 'sd-null-status');
    fetchMock.mockResolvedValueOnce(json({
      data: makeDto({ siteDiaryId: 'sd-null-status', activityStatus: null }),
    }));

    await act(async () => { render(); });

    const html = getHTML();
    // Task renders
    expect(html).toContain('MSP Task');
    // All three status column cells must be empty (no checkmark in any)
    // The StatusCells component renders 3 tds. With workStatus='', none match.
    // Parse the table to confirm no checkmarks appear in the status columns.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('.activity-table tbody tr:not([key^="blank"])');
    const dataRow = Array.from(rows).find(r => r.textContent?.includes('MSP Task'));
    if (dataRow) {
      const tds = Array.from(dataRow.querySelectorAll('td'));
      // td index 3,4,5 are Mula, Sedang Laksana, Siap
      expect(tds[3]?.textContent?.trim()).toBe('');
      expect(tds[4]?.textContent?.trim()).toBe('');
      expect(tds[5]?.textContent?.trim()).toBe('');
    }
  });

  // ============================================================
    // ============================================================
  // T11 — R1-6: SAMBUNGAN label with em-dash preserved (source check)
  // ============================================================
  it('T11: source contains SAMBUNGAN em-dash label, not ASCII hyphen', () => {
    // Static source assertion — verifies visual contract at the source level (R1-6)
    const fs = require('fs');
    const source: string = fs.readFileSync(
      require('path').join(process.cwd(), 'src/app/site-diary/print/PrintSiteDiaryClient.tsx'),
      'utf-8'
    );
    expect(source).toContain('SAMBUNGAN');
    // Must contain the em-dash U+2014, not ASCII hyphen
    expect(source).toContain('\u2014');
    expect(source).not.toContain('SAMBUNGAN -');
    expect(source).not.toContain("SAMBUNGAN -");
  });

  // ============================================================
  // T12 — No mutation requests introduced
  // ============================================================
  it('T12: no POST/PUT/PATCH/DELETE requests made', async () => {
    mockSearchParams.set('id', 'sd-exact');
    fetchMock.mockResolvedValueOnce(json({ data: makeDto() }));

    await act(async () => { render(); });

    const calls = fetchMock.mock.calls as [string, RequestInit?][];
    for (const [url, init] of calls) {
      const method = (init?.method ?? 'GET').toUpperCase();
      expect(method).toBe('GET');
      expect(url).not.toContain('/api/reports');
    }
  });

  // ============================================================
  // T13 — 401/403/404 use bounded messages
  // ============================================================
  it('T13: 401 shows session-expired message', async () => {
    mockSearchParams.set('id', 'sd-err');
    fetchMock.mockResolvedValueOnce(json({ error: 'jwt expired' }, 401));
    await act(async () => { render(); });
    const html = getHTML();
    expect(html).not.toContain('jwt expired');
    expect(html).toContain('Sesi tamat tempoh');
    expect(isButtonDisabled()).toBe(true);
  });

  it('T14: 403 shows access-denied message', async () => {
    mockSearchParams.set('id', 'sd-err');
    await act(async () => { root.unmount(); container.innerHTML = ''; root = createRoot(container); });
    fetchMock.mockResolvedValueOnce(json({ error: 'forbidden' }, 403));
    await act(async () => { render(); });
    expect(getHTML()).toContain('Akses ditolak');
    expect(getHTML()).not.toContain('forbidden');
  });

  it('T15: 404 shows not-found message', async () => {
    mockSearchParams.set('id', 'sd-err');
    await act(async () => { root.unmount(); container.innerHTML = ''; root = createRoot(container); });
    fetchMock.mockResolvedValueOnce(json({ error: 'not found' }, 404));
    await act(async () => { render(); });
    expect(getHTML()).toContain('Rekod tidak dijumpai');
    expect(getHTML()).not.toContain('not found');
  });

  // ============================================================
  // T16 — Missing id fails safely without fetch
  // ============================================================
  it('T16: missing id param fails safely without any fetch call', async () => {
    await act(async () => { render(); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getHTML()).toContain('ID rekod tidak ditemui');
    expect(isButtonDisabled()).toBe(true);
  });

  // ============================================================
  // T17 — R1-2: B→A: 200 {} after switch cannot restore prior diary
  // ============================================================
  it('T17: A renders, switch to B which returns 200 empty data — A must not reappear', async () => {
    mockSearchParams.set('id', 'sd-A');
    const dA = deferred<Response>();
    fetchMock.mockReturnValueOnce(dA.promise);
    await act(async () => { render(); });
    await act(async () => {
      dA.resolve(json({ data: makeDto({ siteDiaryId: 'sd-A', taskName: 'Task A' }) }));
    });
    expect(getHTML()).toContain('Task A');

    // Switch to B — B will return 200 with no data
    mockSearchParams.set('id', 'sd-B');
    const dB = deferred<Response>();
    fetchMock.mockReturnValueOnce(dB.promise);
    await act(async () => { render(); });

    // A is already gone (cleared at start of B request)
    expect(getHTML()).not.toContain('Task A');

    // B returns 200 with no 'data' field
    await act(async () => { dB.resolve(json({ ok: true })); });

    // A must NOT reappear; error state shown instead
    expect(getHTML()).not.toContain('Task A');
    expect(getHTML()).toContain('Gagal memuatkan laporan');
  });

  // ============================================================
  // T18 ?" R2-1: Network error must be bounded
  // ============================================================
  it('T18: fetch network rejection with sensitive internal detail is bounded', async () => {
    mockSearchParams.set('id', 'sd-exact');
    fetchMock.mockRejectedValueOnce(new Error('sensitive internal network detail proxy timeout 504'));
    await act(async () => { render(); });

    const html = getHTML();
    expect(html).not.toContain('sensitive internal network detail');
    expect(html).not.toContain('proxy timeout');
    expect(html).toContain('Gagal memuatkan laporan. Sila cuba lagi.');
    expect(isButtonDisabled()).toBe(true);
  });

  // ============================================================
  // T19 ?" R2-2: printContext validation (Array)
  // ============================================================
  it('T19: printContext as array is rejected', async () => {
    mockSearchParams.set('id', 'sd-exact');
    const invalidDto = makeDto();
    (invalidDto as any).printContext = [];
    fetchMock.mockResolvedValueOnce(json({ data: invalidDto }));

    await act(async () => { render(); });
    expect(getHTML()).not.toContain('MSP Task');
    expect(getHTML()).toContain('Gagal memuatkan laporan');
    expect(isButtonDisabled()).toBe(true);
  });

  // ============================================================
  // T20 ?" R2-2: printContext validation (Empty object missing fields)
  // ============================================================
  it('T20: printContext as empty object missing required fields is rejected', async () => {
    mockSearchParams.set('id', 'sd-exact');
    const invalidDto = makeDto();
    (invalidDto as any).printContext = {};
    fetchMock.mockResolvedValueOnce(json({ data: invalidDto }));

    await act(async () => { render(); });
    expect(getHTML()).not.toContain('MSP Task');
    expect(getHTML()).toContain('Gagal memuatkan laporan');
  });

  // ============================================================
  // T21 ?" R2-2: printContext validation (Invalid contractorScope)
  // ============================================================
  it('T21: invalid contractorScope is rejected', async () => {
    mockSearchParams.set('id', 'sd-exact');
    const invalidDto = makeDto();
    (invalidDto as any).printContext.contractorScope = 'INVALID_SCOPE';
    fetchMock.mockResolvedValueOnce(json({ data: invalidDto }));

    await act(async () => { render(); });
    expect(getHTML()).not.toContain('MSP Task');
    expect(getHTML()).toContain('Gagal memuatkan laporan');
  });

  // ============================================================
  // T22 ?" R2-2: printContext validation (Valid Canonical Renders)
  // ============================================================
  it('T22: valid canonical printContext still renders unchanged', async () => {
    mockSearchParams.set('id', 'sd-exact');
    fetchMock.mockResolvedValueOnce(json({ data: makeDto() }));

    await act(async () => { render(); });
    expect(getHTML()).toContain('MSP Task');
    expect(getHTML()).toContain('ELOK');
    expect(getHTML()).not.toContain('Gagal memuatkan laporan');
    expect(isButtonDisabled()).toBe(false);
  });

  it('T23: historical exact workforce overflow preserves identity and page contract', async () => {
    mockSearchParams.set('id', 'sd-historical');
    const manpower = Array.from({ length: 16 }, (_, index) => ({
      tradeName: `Trade ${String(index + 1).padStart(2, '0')}`,
      bumiCount: index + 1,
      nonBumiCount: index + 2,
      foreignCount: index + 3,
    }));
    fetchMock.mockResolvedValueOnce(json({
      data: makeDto({
        siteDiaryId: 'sd-historical',
        activityId: 'act-historical',
        revisionId: 'rev-superseded',
        revisionNumber: 2,
        revisionStatus: 'SUPERSEDED',
        isCurrentRevision: false,
        isHistorical: true,
        activityDate: '2025-03-04',
        wbs: 'HIST-7.2',
        taskName: 'Historical exact task',
        manpower,
      }),
    }));

    await act(async () => { render(); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/site-diary/sd-historical/print', expect.anything());
    expect(getHTML()).not.toContain('/api/reports');
    expect(getHTML()).toContain('Historical exact task');
    expect(getHTML()).toContain('HIST-7.2');
    expect(container.querySelectorAll('.continuation-page')).toHaveLength(2);
    expect(Array.from(container.querySelectorAll('.continuation-label')).map(node => node.textContent)).toEqual([
      'SAMBUNGAN — 04/03/2025',
      'SAMBUNGAN — 04/03/2025',
    ]);
    expect(Array.from(container.querySelectorAll('.page-number')).map(node => node.textContent)).toEqual([
      '1/3',
      '2/3',
      '3/3',
    ]);
    for (const row of manpower) {
      expect(getHTML().match(new RegExp(`>${row.tradeName}<`, 'g'))).toHaveLength(1);
    }
  });
});
