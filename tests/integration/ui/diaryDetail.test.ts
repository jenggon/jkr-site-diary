// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DiaryDetail from '@/app/site-diary/DiaryDetail';

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

const currentRevision = { programmeId: 'programme-A', revisionId: 'revision-current', revisionNumber: 3, revisionTitle: 'Kerja Utama', revisionStatus: 'Approved', isCurrentRevision: true, isReadOnly: false };
const historicalRevision = { programmeId: 'programme-A', revisionId: 'revision-history', revisionNumber: 1, revisionTitle: 'Tender Asal', revisionStatus: 'Superseded', isCurrentRevision: false, isReadOnly: true };

function projection(overrides: Record<string, unknown> = {}) {
  return { siteDiaryId: 'diary-A', activityId: 'activity-A', activityDate: '2026-08-17', programmeId: 'programme-A', revisionId: 'revision-current', revisionNumber: 3, revisionTitle: 'Kerja Utama', revisionStatus: 'Approved', isCurrentRevision: true, isReadOnly: false, activityTitle: 'Pemasangan Galang', activityStatus: 'In Progress', sourceType: 'MSP', sourceReference: 'WBS 1.2', location: 'Pier 3', contractorScope: 'CONTRACTOR', diaryStatus: 'In Progress', submittedAt: '2026-08-17T08:00:00.000Z', updatedAt: null, lastModifiedAt: '2026-08-17T08:00:00.000Z', enrichmentComplete: true, ...overrides } as any;
}

function detail(overrides: Record<string, unknown> = {}) {
  return { site_diary_id: 'diary-A', programme_id: 'programme-A', revision_id: 'revision-current', activity_id: 'activity-A', activity_date: '2026-08-17', weather: null, notes: 'Kerja berjalan lancar', status: 'In Progress', manpower: [{ trade_name: 'Tukang Besi', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 }], print_context: { location: 'Pier 3', work_start_time: '08:00', work_end_time: '17:00', weather_condition: 'ELOK', rain_start_time: null, rain_end_time: null, contractor_scope: 'CONTRACTOR' }, submitted_by: 'actor', submitted_at: '2026-08-17T08:00:00.000Z', updated_at: null, ...overrides };
}

describe('F2.3-B04 mounted canonical Diary detail', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onBack = vi.fn();
  const onEdit = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
    onBack.mockReset();
    onEdit.mockReset();
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  async function render(row = projection(), programmeId = 'programme-A') {
    await act(async () => root.render(React.createElement(DiaryDetail, { projection: row, programmeId, onBack, onEdit })));
  }
  async function click(label: string) {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label)) as HTMLButtonElement;
    expect(button).toBeTruthy();
    await act(async () => button.click());
  }

  function printLink(): HTMLAnchorElement | null {
    return [...container.querySelectorAll('a')].find((item) => item.textContent?.includes('Cetak Rekod Ini')) ?? null;
  }

  it('renders canonical current evidence, Pelaksana and workforce readback, then revalidates exact edit handoff', async () => {
    global.fetch = vi.fn(async (input) => String(input).includes('/site-diary/') ? json({ data: detail() }) : json({ data: [currentRevision] }));
    await render();
    expect(container.textContent).toContain('Kerja berjalan lancar');
    expect(container.textContent).toContain('Tukang Besi');
    expect(container.textContent).toContain('Sejarah Perubahan');
    expect(container.textContent).toContain('Pelaksana');
    expect(container.textContent).toContain('Kontraktor Utama');
    expect(container.textContent).not.toContain('CONTRACTOR');
    expect(container.textContent).toContain('B');
    expect(container.textContent).toContain('BB');
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('JUMLAH 6');
    expect(container.querySelector('[data-record-workforce-matrix]')).toBeTruthy();
    expect(container.textContent).toContain('Edit Rekod');
    expect(container.textContent).toContain('← Kembali ke Senarai Rekod');
    expect(printLink()?.getAttribute('href')).toBe('/site-diary/print?id=diary-A');
    await click('Edit Rekod');
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith('diary-A');
  });

  it('renders historical evidence read-only with an exact historical print handoff', async () => {
    const historyProjection = projection({ revisionId: 'revision-history', revisionNumber: 1, revisionTitle: 'Tender Asal', revisionStatus: 'Superseded', isCurrentRevision: false, isReadOnly: true, activityTitle: null, sourceType: null, sourceReference: null });
    global.fetch = vi.fn(async (input) => String(input).includes('/site-diary/')
      ? json({ data: detail({ revision_id: 'revision-history', manpower: [], notes: '', print_context: null }) })
      : json({ data: [currentRevision, historicalRevision] }));
    await render(historyProjection);
    expect(container.textContent).toContain('Sejarah / Baca Sahaja');
    expect(container.textContent).toContain('Sejarah Perubahan');
    expect(container.textContent).toContain('Tiada rekod tenaga kerja');
    expect(container.textContent).toContain('Tidak tersedia');
    expect(container.textContent).not.toContain('Edit Rekod');
    expect(container.textContent).toContain('← Kembali ke Senarai Rekod');
    expect(printLink()?.getAttribute('href')).toBe('/site-diary/print?id=diary-A');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('does not expose a print handoff before a canonical exact ID is validated and marks loading sharp', async () => {
    const pending = deferred<Response>();
    global.fetch = vi.fn((input) => String(input).includes('/site-diary/')
      ? pending.promise
      : Promise.resolve(json({ data: [currentRevision] })));

    await render(projection({ siteDiaryId: '' }));

    expect(printLink()).toBeNull();
    expect(container.textContent).toContain('Memuatkan butiran rekod');
    expect(container.querySelector('[data-record-detail-state="loading"]')).toBeTruthy();
  });

  it('fails closed for identity mismatch and supports 401/network retry', async () => {
    let attempt = 0;
    global.fetch = vi.fn(async (input) => {
      if (!String(input).includes('/site-diary/')) return json({ data: [currentRevision] });
      attempt += 1;
      if (attempt === 1) return json({ error: 'unauthorized' }, 401);
      return json({ data: detail({ site_diary_id: 'wrong-diary' }) });
    });
    await render();
    expect(container.textContent).toContain('Sesi telah tamat');
    expect(container.querySelector('[data-record-detail-state="error"]')).toBeTruthy();
    await click('Cuba Semula');
    expect(container.textContent).toContain('Identiti rekod tidak sepadan');
    expect(container.textContent).not.toContain('Edit Rekod');
  });

  it('guards A to B stale success, stale error, and stale finally loading authority', async () => {
    const requestA = deferred<Response>();
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/site-diary/diary-A')) return requestA.promise;
      if (url.includes('/site-diary/diary-B')) return Promise.resolve(json({ data: detail({ site_diary_id: 'diary-B', activity_id: 'activity-B', notes: 'BUKTI B' }) }));
      return Promise.resolve(json({ data: [currentRevision] }));
    });
    await render();
    await render(projection({ siteDiaryId: 'diary-B', activityId: 'activity-B', activityTitle: 'Aktiviti B' }));
    expect(container.textContent).toContain('BUKTI B');
    expect(printLink()?.getAttribute('href')).toBe('/site-diary/print?id=diary-B');
    await act(async () => requestA.resolve(json({ data: detail({ notes: 'BUKTI A LAMBAT' }) })));
    expect(container.textContent).toContain('BUKTI B');
    expect(container.textContent).not.toContain('BUKTI A LAMBAT');
    expect(container.textContent).not.toContain('Memuatkan butiran');
    expect(printLink()?.getAttribute('href')).toBe('/site-diary/print?id=diary-B');
  });

  it('uses only the canonical encoded diary ID and performs no print mutation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes('/site-diary/')
      ? json({ data: detail({ site_diary_id: 'diary/A?exact', activity_id: 'activity-other', activity_date: '1999-01-01' }) })
      : json({ data: [currentRevision] }));
    global.fetch = fetchMock;
    await render(projection({ siteDiaryId: 'diary/A?exact', activityId: 'activity-other', activityDate: '2099-12-31' }));

    expect(printLink()?.getAttribute('href')).toBe('/site-diary/print?id=diary%2FA%3Fexact');
    expect(printLink()?.getAttribute('href')).not.toContain('activity-other');
    expect(printLink()?.getAttribute('href')).not.toContain('1999-01-01');
    for (const call of fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>) {
      expect((call[1]?.method ?? 'GET').toUpperCase()).toBe('GET');
    }
  });

  it('ignores a stale A network error after B has become authoritative', async () => {
    const requestA = deferred<Response>();
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('/site-diary/diary-A')) return requestA.promise;
      if (url.includes('/site-diary/diary-B')) return Promise.resolve(json({ data: detail({ site_diary_id: 'diary-B', activity_id: 'activity-B', notes: 'B KEKAL' }) }));
      return Promise.resolve(json({ data: [currentRevision] }));
    });
    await render();
    await render(projection({ siteDiaryId: 'diary-B', activityId: 'activity-B' }));
    await act(async () => requestA.reject(new Error('ralat A lambat')));
    expect(container.textContent).toContain('B KEKAL');
    expect(container.textContent).not.toContain('ralat A lambat');
  });

  it('programme change and back during pending request prevent stale detail return', async () => {
    const pending = deferred<Response>();
    global.fetch = vi.fn((input) => String(input).includes('/site-diary/') ? pending.promise : Promise.resolve(json({ data: [currentRevision] })));
    await render();
    await render(projection({ programmeId: 'programme-B' }), 'programme-B');
    act(() => root.unmount());
    await act(async () => pending.resolve(json({ data: detail() })));
    expect(container.textContent).toBe('');
  });

  it('supersession between detail and Edit click prevents handoff and double click cannot bypass authority', async () => {
    let revisionRead = 0;
    global.fetch = vi.fn(async (input) => {
      if (String(input).includes('/site-diary/')) return json({ data: detail() });
      revisionRead += 1;
      return json({ data: revisionRead === 1 ? [currentRevision] : [{ ...currentRevision, isCurrentRevision: false, isReadOnly: true, revisionStatus: 'Superseded' }] });
    });
    await render();
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('Edit Rekod')) as HTMLButtonElement;
    await act(async () => { button.click(); button.click(); });
    expect(onEdit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('kini sejarah');
    expect(container.textContent).not.toContain('Edit Rekod');
  });
});
