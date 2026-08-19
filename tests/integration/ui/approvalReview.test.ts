// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ApprovalReview from '@/app/site-diary/ApprovalReview';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function diary(siteDiaryId = 'diary-A') {
  return {
    site_diary_id: siteDiaryId,
    programme_id: 'programme-A',
    revision_id: 'revision-A',
    activity_id: 'activity-A',
    activity_date: '2026-08-19',
    weather: 'Baik',
    notes: `Bukti ${siteDiaryId}`,
    status: 'In Progress',
    manpower: [],
    submitted_by: 'actor-A',
    submitted_at: '2026-08-19T01:00:00.000Z',
    updated_at: null,
  };
}

function approval(
  approvalId = 'approval-A',
  siteDiaryId = 'diary-A',
  approvalStatus = 'Pending'
) {
  return {
    approval_id: approvalId,
    programme_id: 'programme-A',
    revision_id: 'revision-A',
    activity_id: 'activity-A',
    site_diary_id: siteDiaryId,
    progress_id: null,
    approval_level: 1,
    approval_status: approvalStatus,
    approval_date: null,
    approval_comment: null,
    approved_by: null,
    requested_by: 'actor-A',
    requested_at: '2026-08-19T01:00:00.000Z',
    created_at: '2026-08-19T01:00:00.000Z',
    updated_at: null,
  };
}

describe('F2.4-B03-H01 exact Approval review boundary', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onBack = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.restoreAllMocks();
    onBack.mockReset();
    onSuccess.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  async function render(siteDiaryId = 'diary-A', approvalId = 'approval-A') {
    await act(async () => {
      root.render(React.createElement(ApprovalReview, {
        siteDiaryId,
        approvalId,
        onBack,
        onSuccess,
      }));
    });
  }

  function decisionButton(label: string): HTMLButtonElement | undefined {
    return [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes(label)
    ) as HTMLButtonElement | undefined;
  }

  it('enables decisions only after exact Pending Approval and Site Diary identities match', async () => {
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return json({ data: approval('approval-A', 'diary-A', 'Approved') });
      if (url.endsWith('/api/approval/approval-A')) return json({ data: approval() });
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();

    expect(container.textContent).toContain('Bukti diary-A');
    expect(decisionButton('Luluskan')).toBeTruthy();
    await act(async () => decisionButton('Luluskan')?.click());
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/approval/approval-A',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('blocks decisions when the exact Approval belongs to a different Site Diary', async () => {
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/approval/approval-A')) {
        return json({ data: approval('approval-A', 'diary-B') });
      }
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();

    expect(container.textContent).toContain('Konteks rekod kelulusan tidak sepadan');
    expect(decisionButton('Luluskan')).toBeUndefined();
    expect(decisionButton('Pulangkan')).toBeUndefined();
    expect(decisionButton('Tolak')).toBeUndefined();
  });

  it.each(['Approved', 'Returned', 'Rejected', 'Cancelled'])(
    'blocks decisions when the exact Approval is no longer reviewable: %s',
    async (status) => {
      global.fetch = vi.fn(async (input) => {
        const url = String(input);
        if (url.endsWith('/api/approval/approval-A')) {
          return json({ data: approval('approval-A', 'diary-A', status) });
        }
        if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
        throw new Error(`Unexpected request: ${url}`);
      });

      await render();

      expect(container.textContent).toContain('tidak lagi menunggu semakan');
      expect(decisionButton('Luluskan')).toBeUndefined();
    }
  );

  it('keeps newer request state authoritative when an aborted older request settles last', async () => {
    const oldDiary = deferred<Response>();
    const oldApproval = deferred<Response>();
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url.endsWith('/api/site-diary/diary-A')) return oldDiary.promise;
      if (url.endsWith('/api/approval/approval-A')) return oldApproval.promise;
      if (url.endsWith('/api/site-diary/diary-B')) return Promise.resolve(json({ data: diary('diary-B') }));
      if (url.endsWith('/api/approval/approval-B')) {
        return Promise.resolve(json({ data: approval('approval-B', 'diary-B') }));
      }
      if (url.includes('/history')) {
        return Promise.resolve(json({ data: { siteDiaryId: 'diary-B', events: [] } }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await render('diary-B', 'approval-B');
    expect(container.textContent).toContain('Bukti diary-B');

    await act(async () => {
      oldDiary.resolve(json({ data: diary('diary-A') }));
      oldApproval.resolve(json({ data: approval('approval-A', 'diary-A') }));
    });

    expect(container.textContent).toContain('Bukti diary-B');
    expect(container.textContent).not.toContain('Bukti diary-A');
    expect(container.textContent).not.toContain('Memuatkan butiran rekod');
    expect(decisionButton('Luluskan')).toBeTruthy();
  });
});
