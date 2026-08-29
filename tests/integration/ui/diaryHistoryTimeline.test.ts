// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DiaryHistoryTimeline from '@/app/site-diary/DiaryHistoryTimeline';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
function json(data: unknown, status = 200): Response { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
function payload(id: string, description: string) { return { data: { siteDiaryId: id, events: [{ logId: `log-${id}`, eventType: 'UPDATE', loggedAt: '2026-08-18T09:00:00Z', actorLabel: 'Pengguna sistem', snapshotAvailable: true, changes: [{ kind: 'FIELD', field: 'notes', description }] }] } }; }

describe('F2.3-B05 mounted read-only Diary history timeline', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); vi.restoreAllMocks(); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  async function render(id: string) { await act(async () => root.render(React.createElement(DiaryHistoryTimeline, { siteDiaryId: id }))); }

  it('renders normalized current/historical event content without raw JSON, actor UUID, or mutation controls', async () => {
    global.fetch = vi.fn(async () => json(payload('diary-current', 'Lokasi: Pier 1 → Pier 2')));
    await render('diary-current');
    expect(container.textContent).toContain('Sejarah Perubahan');
    expect(container.textContent).toContain('Lokasi: Pier 1 → Pier 2');
    expect(container.textContent).toContain('Pengguna sistem');
    expect(container.textContent).not.toContain('actor-uuid');
    expect(container.textContent).not.toContain('snapshot_data');
    expect([...container.querySelectorAll('button')].some((button) => /edit|simpan|padam/i.test(button.textContent ?? ''))).toBe(false);
  });

  it('blocks stale A success, stale A error, and stale finally from replacing B', async () => {
    const requestA = deferred<Response>();
    global.fetch = vi.fn((input) => String(input).includes('diary-A') ? requestA.promise : Promise.resolve(json(payload('diary-B', 'B TERKINI'))));
    await render('diary-A');
    await render('diary-B');
    expect(container.textContent).toContain('B TERKINI');
    await act(async () => requestA.resolve(json(payload('diary-A', 'A LAMBAT'))));
    expect(container.textContent).toContain('B TERKINI');
    expect(container.textContent).not.toContain('A LAMBAT');
    expect(container.textContent).not.toContain('Memuatkan sejarah');

    const errorA = deferred<Response>();
    global.fetch = vi.fn((input) => String(input).includes('diary-C') ? errorA.promise : Promise.resolve(json(payload('diary-D', 'D TERKINI'))));
    await render('diary-C');
    await render('diary-D');
    await act(async () => errorA.reject(new Error('RALAT C LAMBAT')));
    expect(container.textContent).toContain('D TERKINI');
    expect(container.textContent).not.toContain('RALAT C LAMBAT');
  });

  it('back/unmount or programme/context replacement invalidates pending history', async () => {
    const pending = deferred<Response>();
    global.fetch = vi.fn(() => pending.promise);
    await render('programme-A-diary');
    act(() => root.unmount());
    await act(async () => pending.resolve(json(payload('programme-A-diary', 'TIDAK BOLEH KEMBALI'))));
    expect(container.textContent).toBe('');
  });

  it('retry uses the current exact diary identity and supports no-history state', async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (input) => { calls.push(String(input)); return calls.length === 1 ? json({ error: 'network' }, 500) : json({ data: { siteDiaryId: 'diary-retry', events: [] } }); });
    await render('diary-retry');
    expect(container.textContent).toContain('network');
    const retry = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Cuba Semula')) as HTMLButtonElement;
    await act(async () => retry.click());
    expect(calls).toEqual(['/api/site-diary/diary-retry/history', '/api/site-diary/diary-retry/history']);
    expect(container.textContent).toContain('Tiada sejarah perubahan');
  });

  it('a post-edit remount fetches and displays the new UPDATE event', async () => {
    const oldResponse = deferred<Response>();
    let version = 0;
    global.fetch = vi.fn(() => { version += 1; return version === 1 ? oldResponse.promise : Promise.resolve(json(payload('diary-edit', 'UPDATE SELEPAS EDIT'))); });
    await render('diary-edit');
    act(() => root.unmount());
    root = createRoot(container);
    await render('diary-edit');
    expect(container.textContent).toContain('UPDATE SELEPAS EDIT');
    await act(async () => oldResponse.resolve(json(payload('diary-edit', 'VERSI LAMA LAMBAT'))));
    expect(container.textContent).toContain('UPDATE SELEPAS EDIT');
    expect(container.textContent).not.toContain('VERSI LAMA LAMBAT');
  });
});
