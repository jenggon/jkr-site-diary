// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DiaryManagementList from '@/app/site-diary/DiaryManagementList';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let context = { programmeId: 'programme-A' };
vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => context,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const current = {
  programmeId: 'programme-A', revisionId: 'revision-current', revisionNumber: 3,
  revisionTitle: 'Kerja Utama', revisionStatus: 'Approved', isCurrentRevision: true, isReadOnly: false,
};
const historyA = {
  programmeId: 'programme-A', revisionId: 'revision-history-A', revisionNumber: 1,
  revisionTitle: 'Tender Asal', revisionStatus: 'Superseded', isCurrentRevision: false, isReadOnly: true,
};
const historyB = {
  programmeId: 'programme-A', revisionId: 'revision-history-B', revisionNumber: 2,
  revisionTitle: 'Pindaan Saliran', revisionStatus: 'Superseded', isCurrentRevision: false, isReadOnly: true,
};

function diary(overrides: Record<string, unknown> = {}) {
  return {
    siteDiaryId: 'raw-site-diary-uuid', activityId: 'raw-activity-uuid', activityDate: '2026-08-17',
    programmeId: 'programme-A', revisionId: 'revision-current', revisionNumber: 3,
    revisionTitle: 'Kerja Utama', revisionStatus: 'Approved', isCurrentRevision: true, isReadOnly: false,
    activityTitle: 'Pemasangan Galang Jambatan', activityStatus: 'In Progress', sourceType: 'MSP',
    sourceReference: 'WBS 1.2.4', location: 'Pier P3', contractorScope: 'CONTRACTOR',
    diaryStatus: 'In Progress', submittedAt: '2026-08-17T08:00:00.000Z', updatedAt: null,
    lastModifiedAt: '2026-08-17T08:00:00.000Z', enrichmentComplete: true,
    ...overrides,
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('F2.3-B03 mounted Diary Management list', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    context = { programmeId: 'programme-A' };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function mount() {
    await act(async () => root.render(React.createElement(DiaryManagementList)));
  }

  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label));
    expect(button, `button ${label}`).toBeTruthy();
    await act(async () => (button as HTMLButtonElement).click());
  }

  async function change(label: string, value: string) {
    const field = container.querySelector(`[aria-label="${label}"]`) as HTMLInputElement | HTMLSelectElement | null;
    expect(field, `field ${label}`).toBeTruthy();
    if (!field) throw new Error(`field ${label} not found`);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(field, value);
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('resolves current by flag, renders human data, filters, and suppresses raw UUIDs', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/programme-revision')) return json({ data: [historyA, current, historyB] });
      return json({ data: [
        diary(),
        diary({ siteDiaryId: 'raw-two', activityTitle: 'Kerja Saliran VO', activityDate: '2026-08-10', sourceType: 'VO', sourceReference: 'VO-9', contractorScope: 'NSC' }),
      ] });
    }) as any;
    await mount();
    expect(container.textContent).toContain('Semakan 3 — Kerja Utama');
    expect(container.textContent).toContain('Pemasangan Galang Jambatan');
    expect(container.textContent).toContain('WBS 1.2.4');
    expect(container.textContent).toContain('Pier P3');
    expect(container.textContent).not.toContain('raw-site-diary-uuid');
    expect(container.textContent).not.toContain('raw-activity-uuid');

    await change('Tapis sumber', 'VO');
    expect(container.textContent).not.toContain('Pemasangan Galang Jambatan');
    expect(container.textContent).toContain('Kerja Saliran VO');
    await change('Tapis skop kontraktor', 'CONTRACTOR');
    expect(container.textContent).toContain('Tiada rekod sepadan dengan tapisan.');
    await change('Tapis sumber', 'ALL');
    await change('Tarikh mula', '2026-08-15');
    await change('Tapis skop kontraktor', 'ALL');
    expect(container.textContent).toContain('Pemasangan Galang Jambatan');
    expect(container.textContent).not.toContain('Kerja Saliran VO');
  });

  it('renders historical selector/read-only cards, no edit CTA, fallback, and empty historical states', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(init?.method).toBeUndefined();
      if (url.includes('/api/programme-revision')) return json({ data: [current, historyA] });
      if (url.includes('revision-history-A')) return json({ data: [diary({
        siteDiaryId: 'history-diary', revisionId: historyA.revisionId, isCurrentRevision: false,
        isReadOnly: true, activityTitle: null, sourceType: null, sourceReference: null, enrichmentComplete: false,
      })] });
      return json({ data: [] });
    }) as any;
    await mount();
    expect(container.textContent).toContain('Tiada rekod semasa.');
    await click('Semakan Terdahulu');
    expect(container.textContent).toContain('Semakan 1 — Tender Asal');
    await change('Pilih semakan sejarah', historyA.revisionId);
    expect(container.textContent).toContain('Sejarah / Baca Sahaja');
    expect(container.textContent).toContain('Maklumat aktiviti tidak tersedia');
    expect(container.textContent).not.toMatch(/Sunting|Edit/);
    expect((global.fetch as any).mock.calls.every((call: any[]) => !call[1]?.method || call[1].method === 'GET')).toBe(true);

    await click('Kembali ke Rekod Semasa');
    expect(container.textContent).toContain('Tiada rekod semasa.');
  });

  it('shows safe no-current, malformed-current, no-history, and 401 states', async () => {
    global.fetch = vi.fn(async () => json({ data: [historyA] })) as any;
    await mount();
    expect(container.textContent).toContain('Tiada semakan semasa yang sah');

    act(() => root.unmount());
    root = createRoot(container);
    global.fetch = vi.fn(async () => json({ data: [current, { ...current, revisionId: 'another-current' }] })) as any;
    await mount();
    expect(container.textContent).toContain('Maklumat semakan semasa tidak konsisten');

    act(() => root.unmount());
    root = createRoot(container);
    global.fetch = vi.fn(async (input: RequestInfo | URL) => String(input).includes('/api/programme-revision')
      ? json({ data: [current] }) : json({ error: 'unauthorized' }, 401)) as any;
    await mount();
    expect(container.textContent).toContain('Sesi telah tamat');
    await click('Semakan Terdahulu');
    expect(container.textContent).toContain('Tiada semakan terdahulu.');
  });

  it('Programme A to B ignores stale success and clears historical selection', async () => {
    const revisionsA = deferred<Response>();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('programmeId=programme-A')) return revisionsA.promise;
      if (url.includes('/api/programme-revision') && url.includes('programme-B')) return Promise.resolve(json({ data: [{ ...current, programmeId: 'programme-B', revisionId: 'current-B', revisionTitle: 'Semakan B' }] }));
      if (url.includes('current-B')) return Promise.resolve(json({ data: [diary({ activityTitle: 'Aktiviti Program B', programmeId: 'programme-B', revisionId: 'current-B' })] }));
      return Promise.resolve(json({ data: [] }));
    }) as any;
    await mount();
    context = { programmeId: 'programme-B' };
    await act(async () => root.render(React.createElement(DiaryManagementList)));
    expect(container.textContent).toContain('Aktiviti Program B');
    await act(async () => revisionsA.resolve(json({ data: [current, historyA] })));
    expect(container.textContent).toContain('Aktiviti Program B');
    expect(container.textContent).not.toContain('Tender Asal');
  });

  it('Programme A stale error cannot replace Programme B success', async () => {
    const revisionsA = deferred<Response>();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('programmeId=programme-A')) return revisionsA.promise;
      if (url.includes('/api/programme-revision')) return Promise.resolve(json({ data: [{ ...current, programmeId: 'programme-B', revisionId: 'current-B' }] }));
      return Promise.resolve(json({ data: [diary({ activityTitle: 'Program B Kekal' })] }));
    }) as any;
    await mount();
    context = { programmeId: 'programme-B' };
    await act(async () => root.render(React.createElement(DiaryManagementList)));
    await act(async () => revisionsA.reject(new Error('Ralat lama A')));
    expect(container.textContent).toContain('Program B Kekal');
    expect(container.textContent).not.toContain('Ralat lama A');
  });

  it('historical A to B and historical to current keep the latest revision authoritative', async () => {
    const diaryA = deferred<Response>();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/programme-revision')) return Promise.resolve(json({ data: [current, historyA, historyB] }));
      if (url.includes('revision-history-A')) return diaryA.promise;
      if (url.includes('revision-history-B')) return Promise.resolve(json({ data: [diary({ activityTitle: 'Sejarah B', revisionId: historyB.revisionId })] }));
      return Promise.resolve(json({ data: [diary({ activityTitle: 'Rekod Semasa Kekal' })] }));
    }) as any;
    await mount();
    await click('Semakan Terdahulu');
    await change('Pilih semakan sejarah', historyA.revisionId);
    await change('Pilih semakan sejarah', historyB.revisionId);
    expect(container.textContent).toContain('Sejarah B');
    await act(async () => diaryA.resolve(json({ data: [diary({ activityTitle: 'Sejarah A Lewat' })] })));
    expect(container.textContent).toContain('Sejarah B');
    expect(container.textContent).not.toContain('Sejarah A Lewat');

    const lateHistory = deferred<Response>();
    (global.fetch as any).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('revision-history-A')) return lateHistory.promise;
      return Promise.resolve(json({ data: [diary({ activityTitle: 'Rekod Semasa Menang' })] }));
    });
    await change('Pilih semakan sejarah', historyA.revisionId);
    await click('Kembali ke Rekod Semasa');
    expect(container.textContent).toContain('Rekod Semasa Menang');
    await act(async () => lateHistory.resolve(json({ data: [diary({ activityTitle: 'Sejarah Lewat' })] })));
    expect(container.textContent).not.toContain('Sejarah Lewat');
  });

  it('rapid search ignores stale results/errors and stale finally cannot clear current loading', async () => {
    const bridge = deferred<Response>();
    const drainage = deferred<Response>();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/programme-revision')) return Promise.resolve(json({ data: [current] }));
      if (url.includes('text=bridge')) return bridge.promise;
      if (url.includes('text=drainage')) return drainage.promise;
      return Promise.resolve(json({ data: [] }));
    }) as any;
    await mount();
    await change('Cari aktiviti', 'bridge');
    await change('Cari aktiviti', 'drainage');
    await act(async () => bridge.resolve(json({ data: [diary({ activityTitle: 'Bridge Lama' })] })));
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    await act(async () => drainage.resolve(json({ data: [diary({ activityTitle: 'Drainage Baharu' })] })));
    expect(container.textContent).toContain('Drainage Baharu');
    expect(container.textContent).not.toContain('Bridge Lama');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows API error and retry uses current authoritative context', async () => {
    let diaryAttempt = 0;
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/programme-revision')) return json({ data: [current] });
      diaryAttempt += 1;
      return diaryAttempt === 1 ? json({ error: 'Rangkaian gagal' }, 500) : json({ data: [diary({ activityTitle: 'Berjaya Selepas Cuba Semula' })] });
    }) as any;
    await mount();
    expect(container.textContent).toContain('Rangkaian gagal');
    await click('Cuba Semula');
    expect(container.textContent).toContain('Berjaya Selepas Cuba Semula');
    expect(String((global.fetch as any).mock.calls.at(-1)?.[0])).toContain('programmeId=programme-A');
  });

  it('shows empty historical diary state and clears selected history on Programme change', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/programme-revision') && url.includes('programme-B')) {
        return json({ data: [{ ...current, programmeId: 'programme-B', revisionId: 'current-B', revisionTitle: 'Current B' }] });
      }
      if (url.includes('/api/programme-revision')) return json({ data: [current, historyA] });
      return json({ data: [] });
    }) as any;
    await mount();
    await click('Semakan Terdahulu');
    await change('Pilih semakan sejarah', historyA.revisionId);
    expect(container.textContent).toContain('Tiada rekod bagi semakan terdahulu ini.');
    context = { programmeId: 'programme-B' };
    await act(async () => root.render(React.createElement(DiaryManagementList)));
    expect(container.textContent).toContain('Semakan 3 — Current B');
    expect(container.textContent).not.toContain('Tender Asal');
    expect(container.querySelector('[aria-label="Pilih semakan sejarah"]')).toBeNull();
  });

  it('ignores a late stale search error after the newer search succeeds', async () => {
    const stale = deferred<Response>();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/programme-revision')) return Promise.resolve(json({ data: [current] }));
      if (url.includes('text=bridge')) return stale.promise;
      if (url.includes('text=drainage')) return Promise.resolve(json({ data: [diary({ activityTitle: 'Saliran Kekal' })] }));
      return Promise.resolve(json({ data: [] }));
    }) as any;
    await mount();
    await change('Cari aktiviti', 'bridge');
    await change('Cari aktiviti', 'drainage');
    expect(container.textContent).toContain('Saliran Kekal');
    await act(async () => stale.reject(new Error('Ralat carian lama')));
    expect(container.textContent).toContain('Saliran Kekal');
    expect(container.textContent).not.toContain('Ralat carian lama');
  });
});
