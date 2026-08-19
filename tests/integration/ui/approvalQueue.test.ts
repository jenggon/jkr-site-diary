// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

const context = vi.hoisted(() => ({ programmeId: 'programme-A' as string | null }));
vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({ programmeId: context.programmeId }),
}));

import ApprovalQueue from '@/app/site-diary/ApprovalQueue';

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

function item(programmeId: string) {
  return {
    approval_id: `approval-${programmeId}`,
    site_diary_id: `diary-${programmeId}`,
    programme_id: programmeId,
    activity_name: `Activity ${programmeId}`,
    activity_date: '2026-08-19',
    approval_status: 'Pending',
    requested_at: '2026-08-19T01:00:00.000Z',
    requester_name: 'Requester',
  };
}

describe('F2.4-B03-R1 ApprovalQueue request ownership', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    context.programmeId = 'programme-A';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(programmeId: string | null) {
    context.programmeId = programmeId;
    await act(async () => {
      root.render(React.createElement(ApprovalQueue, { onSelectReview: vi.fn() }));
    });
  }

  it('ignores late A success and stale finally after B succeeds even when the mock ignores abort', async () => {
    const old = deferred<Response>();
    global.fetch = vi.fn((input) => String(input).includes('programme-A')
      ? old.promise
      : Promise.resolve(json({ data: [item('programme-B')] })));

    await render('programme-A');
    await render('programme-B');
    expect(container.textContent).toContain('Activity programme-B');

    await act(async () => old.resolve(json({ data: [item('programme-A')] })));
    expect(container.textContent).toContain('Activity programme-B');
    expect(container.textContent).not.toContain('Activity programme-A');
    expect(container.textContent).not.toContain('Memuatkan');
  });

  it('ignores late A failure across A to B to A generations', async () => {
    const firstA = deferred<Response>();
    let aCalls = 0;
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.includes('programme-A') && aCalls++ === 0) return firstA.promise;
      const programme = url.includes('programme-B') ? 'programme-B' : 'programme-A';
      return Promise.resolve(json({ data: [item(programme)] }));
    });

    await render('programme-A');
    await render('programme-B');
    await render('programme-A');
    expect(container.textContent).toContain('Activity programme-A');

    await act(async () => firstA.reject(new Error('stale failure')));
    expect(container.textContent).not.toContain('stale failure');
    expect(container.textContent).toContain('Activity programme-A');
  });

  it('does not mutate state when a request settles after unmount', async () => {
    const pending = deferred<Response>();
    global.fetch = vi.fn(() => pending.promise);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await render('programme-A');
    act(() => root.unmount());
    await act(async () => pending.resolve(json({ data: [item('programme-A')] })));
    expect(consoleError).not.toHaveBeenCalled();
    root = createRoot(container);
  });

  it('retries the current programme after a transient failure', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(json({ error: 'temporary' }, 500))
      .mockResolvedValueOnce(json({ data: [item('programme-A')] }));

    await render('programme-A');
    expect(container.textContent).toContain('Cuba Semula');
    const retry = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('Cuba Semula'));
    await act(async () => retry?.click());
    expect(container.textContent).toContain('Activity programme-A');
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/programme/programme-A/approval-queue',
      expect.any(Object)
    );
  });

  it('offers retry for transient errors but not 403', async () => {
    global.fetch = vi.fn(async () => json({ error: 'forbidden' }, 403));
    await render('programme-A');
    expect(container.textContent).toContain('Tiada akses');
    expect(container.textContent).not.toContain('Cuba Semula');
  });
});
