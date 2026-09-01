// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

import DailyEntryShell, { useDailyEntryContext } from '@/app/site-diary/DailyEntryShell';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function ContextProbe() {
  const context = useDailyEntryContext();
  return React.createElement(
    'section',
    null,
    React.createElement('output', { 'data-testid': 'context' }, [
      context.programmeId ?? 'NONE',
      context.revisionId ?? 'NO_REVISION',
      context.revisionState,
      context.error ?? 'NO_ERROR',
    ].join('|')),
    React.createElement('button', { onClick: () => context.setProgrammeId('programme-B') }, 'SWITCH_B'),
  );
}

describe('F2.6-B03 DailyEntryShell Programme and Revision ownership', () => {
  let container: HTMLDivElement;
  let root: Root;
  let summaryA: ReturnType<typeof deferred<Response>>;
  let summaryB: ReturnType<typeof deferred<Response>>;

  const contextText = () => container.querySelector('[data-testid="context"]')?.textContent ?? '';
  const switchToB = async () => {
    const button = [...container.querySelectorAll('button')]
      .find((candidate) => candidate.textContent === 'SWITCH_B') as HTMLButtonElement;
    await act(async () => button.click());
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    summaryA = deferred<Response>();
    summaryB = deferred<Response>();

    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/programme?status=Active') {
        return Promise.resolve(json({ data: [
          { id: 'programme-A', code: 'A', name: 'Programme A' },
          { id: 'programme-B', code: 'B', name: 'Programme B' },
        ] }));
      }
      if (url.includes('/api/project-summary?programmeId=programme-A')) return summaryA.promise;
      if (url.includes('/api/project-summary?programmeId=programme-B')) return summaryB.promise;
      if (url === '/api/programme-revision?programmeId=programme-A') {
        return Promise.resolve(json({ data: [{
          revisionId: 'revision-A',
          revisionNumber: 1,
          revisionStatus: 'Approved',
          isCurrentRevision: true,
        }] }));
      }
      if (url === '/api/programme-revision?programmeId=programme-B') {
        return Promise.resolve(json({ data: [{
          revisionId: 'revision-B',
          revisionNumber: 2,
          revisionStatus: 'Approved',
          isCurrentRevision: true,
        }] }));
      }
      if (url.includes('/api/programme/programme-')) {
        const id = url.endsWith('programme-B') ? 'B' : 'A';
        return Promise.resolve(json({ data: { programmeCode: id, programmeName: `Programme ${id}` } }));
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('immediately invalidates Revision A and ignores its late summary under Programme B', async () => {
    await act(async () => root.render(
      React.createElement(DailyEntryShell, { initialProgrammeId: 'programme-A' }, React.createElement(ContextProbe))
    ));
    expect(contextText()).toContain('programme-A|NO_REVISION|RESOLVING');

    await switchToB();
    expect(contextText()).toContain('programme-B|NO_REVISION|RESOLVING');

    await act(async () => summaryA.resolve(json({
      revision_id: 'revision-A', start_date: '2026-01-01', finish_date: '2026-12-31',
    })));
    expect(contextText()).not.toContain('revision-A');

    await act(async () => summaryB.resolve(json({
      revision_id: 'revision-B', start_date: '2027-01-01', finish_date: '2027-12-31',
    })));
    expect(contextText()).toContain('programme-B|revision-B|RESOLVED|NO_ERROR');
  });

  it('prevents a late Programme A summary failure from becoming Programme B error state', async () => {
    await act(async () => root.render(
      React.createElement(DailyEntryShell, { initialProgrammeId: 'programme-A' }, React.createElement(ContextProbe))
    ));
    await switchToB();

    await act(async () => summaryB.resolve(json({ revision_id: 'revision-B' })));
    expect(contextText()).toContain('programme-B|revision-B|RESOLVED|NO_ERROR');

    await act(async () => summaryA.reject(new Error('stale Programme A failure')));
    expect(contextText()).toContain('programme-B|revision-B|RESOLVED|NO_ERROR');
    expect(container.textContent).not.toContain('stale Programme A failure');
  });

  it('represents no-current-revision Programme B without reusing Revision A', async () => {
    await act(async () => root.render(
      React.createElement(DailyEntryShell, { initialProgrammeId: 'programme-A' }, React.createElement(ContextProbe))
    ));
    await act(async () => summaryA.resolve(json({ revision_id: 'revision-A' })));
    expect(contextText()).toContain('programme-A|revision-A|RESOLVED');

    await switchToB();
    expect(contextText()).toContain('programme-B|NO_REVISION|RESOLVING');
    await act(async () => summaryB.resolve(json({ revision_id: null })));

    expect(contextText()).toContain('programme-B|NO_REVISION|UNAVAILABLE|NO_ERROR');
    expect(contextText()).not.toContain('revision-A');
  });

  it('performs only read requests while Programme navigation changes context', async () => {
    await act(async () => root.render(
      React.createElement(DailyEntryShell, { initialProgrammeId: 'programme-A' }, React.createElement(ContextProbe))
    ));
    await switchToB();
    await act(async () => summaryB.resolve(json({ revision_id: 'revision-B' })));

    const fetchMock = vi.mocked(fetch);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.method ?? 'GET').toBe('GET');
    }
  });
});
