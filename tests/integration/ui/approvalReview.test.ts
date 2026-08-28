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
    approval_date: approvalStatus === 'Approved' ? '2026-08-19T02:00:00.000Z' : null,
    approval_comment: null,
    approved_by: approvalStatus === 'Approved' ? 'actor-B' : null,
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
      if (url.endsWith('/api/approval/approval-A/review')) return json({ data: approval() });
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();

    expect(container.textContent).toContain('Bukti diary-A');
    expect(decisionButton('Luluskan')).toBeTruthy();
    await act(async () => decisionButton('Luluskan')?.click());

    // Does NOT immediately navigate away
    expect(onSuccess).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Rekod Berjaya Diluluskan (Approved)');
    expect(container.textContent).toContain('diary-A');

    // Terminal back button triggers onSuccess
    const backBtn = container.querySelector('[data-testid="terminal-back-btn"]') as HTMLButtonElement;
    expect(backBtn).toBeTruthy();
    expect(backBtn.textContent).toContain('Kembali ke Kelulusan');
    await act(async () => backBtn.click());
    expect(onSuccess).toHaveBeenCalledTimes(1);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/approval/approval-A',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('blocks decisions when the exact Approval belongs to a different Site Diary', async () => {
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/approval/approval-A/review')) {
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

  it.each([
    ['programme_id', 'programme-B'],
    ['revision_id', 'revision-B'],
    ['activity_id', 'activity-B'],
  ])('blocks decisions when Approval %s does not match the Site Diary', async (field, value) => {
    global.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/approval/approval-A/review')) {
        return json({ data: { ...approval(), [field]: value } });
      }
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    expect(container.textContent).toContain('Konteks rekod kelulusan tidak sepadan');
    expect(decisionButton('Luluskan')).toBeUndefined();
  });

  it.each(['Approved', 'Returned', 'Rejected', 'Cancelled'])(
    'blocks decisions when the exact Approval is no longer reviewable: %s',
    async (status) => {
      global.fetch = vi.fn(async (input) => {
        const url = String(input);
        if (url.endsWith('/api/approval/approval-A/review')) {
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
      if (url.endsWith('/api/approval/approval-A/review')) return oldApproval.promise;
      if (url.endsWith('/api/site-diary/diary-B')) return Promise.resolve(json({ data: diary('diary-B') }));
      if (url.endsWith('/api/approval/approval-B/review')) {
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

  it('handles any HTTP 409 structurally, refreshes once, never retries PATCH, and removes terminal controls', async () => {
    let reviewReads = 0;
    let diaryReads = 0;
    const fetchMock = vi.fn(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return json({ error: 'State changed elsewhere' }, 409);
      if (url.endsWith('/api/approval/approval-A/review')) {
        reviewReads += 1;
        return json({ data: approval('approval-A', 'diary-A', reviewReads === 1 ? 'Pending' : 'Approved') });
      }
      if (url.endsWith('/api/site-diary/diary-A')) {
        diaryReads += 1;
        return json({ data: diary() });
      }
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });
    global.fetch = fetchMock;

    await render();
    await act(async () => decisionButton('Luluskan')?.click());

    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(1);
    expect(reviewReads).toBe(2);
    expect(diaryReads).toBe(2);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(container.textContent).toContain('tidak lagi menunggu semakan');
    expect(decisionButton('Luluskan')).toBeUndefined();
  });

  it.each([403, 404, 500])('does not refresh or retry after HTTP %i', async (status) => {
    let reviewReads = 0;
    let diaryReads = 0;
    let patches = 0;
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        patches += 1;
        return json({ error: 'failure' }, status);
      }
      if (url.endsWith('/api/approval/approval-A/review')) {
        reviewReads += 1;
        return json({ data: approval() });
      }
      if (url.endsWith('/api/site-diary/diary-A')) {
        diaryReads += 1;
        return json({ data: diary() });
      }
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await act(async () => decisionButton('Luluskan')?.click());
    expect({ reviewReads, diaryReads, patches }).toEqual({ reviewReads: 1, diaryReads: 1, patches: 1 });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not refresh or retry after a network failure', async () => {
    let reviewReads = 0;
    let diaryReads = 0;
    let patches = 0;
    global.fetch = vi.fn((input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        patches += 1;
        return Promise.reject(new Error('network unavailable'));
      }
      if (url.endsWith('/api/approval/approval-A/review')) {
        reviewReads += 1;
        return Promise.resolve(json({ data: approval() }));
      }
      if (url.endsWith('/api/site-diary/diary-A')) {
        diaryReads += 1;
        return Promise.resolve(json({ data: diary() }));
      }
      if (url.includes('/history')) return Promise.resolve(json({ data: { siteDiaryId: 'diary-A', events: [] } }));
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await act(async () => decisionButton('Luluskan')?.click());
    expect({ reviewReads, diaryReads, patches }).toEqual({ reviewReads: 1, diaryReads: 1, patches: 1 });
    expect(container.textContent).toContain('network unavailable');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('prevents double submission before React can repaint', async () => {
    const patch = deferred<Response>();
    let patches = 0;
    global.fetch = vi.fn((input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        patches += 1;
        return patch.promise;
      }
      if (url.endsWith('/api/approval/approval-A/review')) return Promise.resolve(json({ data: approval() }));
      if (url.endsWith('/api/site-diary/diary-A')) return Promise.resolve(json({ data: diary() }));
      if (url.includes('/history')) return Promise.resolve(json({ data: { siteDiaryId: 'diary-A', events: [] } }));
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await act(async () => {
      decisionButton('Luluskan')?.click();
      decisionButton('Luluskan')?.click();
    });
    expect(patches).toBe(1);
    await act(async () => patch.resolve(json({ data: approval('approval-A', 'diary-A', 'Approved') })));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Rekod Berjaya Diluluskan (Approved)');
    const backBtn = container.querySelector('[data-testid="terminal-back-btn"]') as HTMLButtonElement;
    await act(async () => backBtn.click());
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('ignores stale decision success after review context changes', async () => {
    const patch = deferred<Response>();
    global.fetch = vi.fn((input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return patch.promise;
      if (url.endsWith('/api/approval/approval-A/review')) return Promise.resolve(json({ data: approval() }));
      if (url.endsWith('/api/site-diary/diary-A')) return Promise.resolve(json({ data: diary() }));
      if (url.endsWith('/api/approval/approval-B/review')) return Promise.resolve(json({ data: approval('approval-B', 'diary-B') }));
      if (url.endsWith('/api/site-diary/diary-B')) return Promise.resolve(json({ data: diary('diary-B') }));
      if (url.includes('/history')) return Promise.resolve(json({ data: { siteDiaryId: 'diary', events: [] } }));
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await act(async () => decisionButton('Luluskan')?.click());
    await render('diary-B', 'approval-B');
    await act(async () => patch.resolve(json({ data: approval('approval-A', 'diary-A', 'Approved') })));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Bukti diary-B');
  });

  it('ignores stale decision failure after review context changes', async () => {
    const patch = deferred<Response>();
    global.fetch = vi.fn((input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return patch.promise;
      if (url.endsWith('/api/approval/approval-A/review')) return Promise.resolve(json({ data: approval() }));
      if (url.endsWith('/api/site-diary/diary-A')) return Promise.resolve(json({ data: diary() }));
      if (url.endsWith('/api/approval/approval-B/review')) return Promise.resolve(json({ data: approval('approval-B', 'diary-B') }));
      if (url.endsWith('/api/site-diary/diary-B')) return Promise.resolve(json({ data: diary('diary-B') }));
      if (url.includes('/history')) return Promise.resolve(json({ data: { siteDiaryId: 'diary', events: [] } }));
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await act(async () => decisionButton('Luluskan')?.click());
    await render('diary-B', 'approval-B');
    await act(async () => patch.reject(new Error('stale failure')));

    expect(container.textContent).not.toContain('stale failure');
    expect(container.textContent).toContain('Bukti diary-B');
  });

  // H. ApprovalReview successful Approved PATCH renders Approved state, same site_diary_id, approved_by, comment
  it('[Test H] successful Approved PATCH parses returned Approval, does not call onSuccess immediately, and renders terminal state with site_diary_id, approved_by, comment', async () => {
    const returnedApproval = {
      ...approval('approval-A', 'diary-A', 'Approved'),
      approved_by: 'reviewer@jkr.gov.my',
      approval_comment: 'Kerja dilaksanakan mengikut spesifikasi JKR.',
      approval_date: '2026-08-28T11:00:00.000Z',
    };

    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return json({ data: returnedApproval });
      if (url.endsWith('/api/approval/approval-A/review')) return json({ data: approval() });
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();

    const commentInput = container.querySelector('#approvalComment') as HTMLTextAreaElement;
    await act(async () => {
      commentInput.value = 'Kerja dilaksanakan mengikut spesifikasi JKR.';
      commentInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(decisionButton('Luluskan')).toBeTruthy();
    await act(async () => decisionButton('Luluskan')?.click());

    // DOES NOT immediately call onSuccess
    expect(onSuccess).not.toHaveBeenCalled();

    // Renders Approved state
    expect(container.querySelector('[data-testid="terminal-approval-status"]')?.textContent).toContain('Approved');
    // Renders same site_diary_id
    expect(container.querySelector('[data-testid="terminal-site-diary-id"]')?.textContent).toBe('diary-A');
    // Renders approved_by
    expect(container.querySelector('[data-testid="terminal-approved-by"]')?.textContent).toBe('reviewer@jkr.gov.my');
    // Preserves comment
    expect(container.querySelector('[data-testid="terminal-approval-comment"]')?.textContent).toBe('Kerja dilaksanakan mengikut spesifikasi JKR.');
  });

  // I. Only explicit "Kembali" action invokes navigation callback after terminal success
  it('[Test I] only explicit "Kembali ke Kelulusan" click invokes navigation callback after terminal success', async () => {
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return json({ data: approval('approval-A', 'diary-A', 'Approved') });
      if (url.endsWith('/api/approval/approval-A/review')) return json({ data: approval() });
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();
    await act(async () => decisionButton('Luluskan')?.click());

    expect(onSuccess).not.toHaveBeenCalled();

    const backBtn = container.querySelector('[data-testid="terminal-back-btn"]') as HTMLButtonElement;
    expect(backBtn).toBeTruthy();
    await act(async () => backBtn.click());

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  // J. Existing Returned / Rejected behaviour does not regress
  it('[Test J] Returned and Rejected decisions require comments and invoke onSuccess on success', async () => {
    global.fetch = vi.fn(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        const body = JSON.parse(init.body as string);
        return json({ data: approval('approval-A', 'diary-A', body.approval_status) });
      }
      if (url.endsWith('/api/approval/approval-A/review')) return json({ data: approval() });
      if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
      if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
      throw new Error(`Unexpected request: ${url}`);
    });

    await render();

    // Pulangkan and Tolak disabled without comment
    expect((decisionButton('Pulangkan') as HTMLButtonElement).disabled).toBe(true);
    expect((decisionButton('Tolak') as HTMLButtonElement).disabled).toBe(true);

    const commentInput = container.querySelector('#approvalComment') as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(commentInput, 'Perlu pembetulan maklumat tenaga kerja');
      commentInput.dispatchEvent(new Event('input', { bubbles: true }));
      commentInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect((decisionButton('Pulangkan') as HTMLButtonElement).disabled).toBe(false);

    // Returned decision calls onSuccess directly
    await act(async () => decisionButton('Pulangkan')?.click());
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  // K. Approved 200 with missing/mismatched canonical Approval fails closed
  it('[Test K] [Correction C] Approved 200 with missing or mismatched canonical Approval data fails closed', async () => {
    const invalidPayloads = [
      { name: 'null data', payload: { data: null } },
      { name: 'mismatched approval_id', payload: { data: { ...approval('other-approval', 'diary-A', 'Approved'), approved_by: 'rev-1' } } },
      { name: 'mismatched site_diary_id', payload: { data: { ...approval('approval-A', 'other-diary', 'Approved'), approved_by: 'rev-1' } } },
      { name: 'wrong status', payload: { data: { ...approval('approval-A', 'diary-A', 'Pending'), approved_by: 'rev-1' } } },
      { name: 'empty approved_by', payload: { data: { ...approval('approval-A', 'diary-A', 'Approved'), approved_by: '' } } },
    ];

    for (const { payload } of invalidPayloads) {
      onSuccess.mockClear();
      global.fetch = vi.fn(async (input, init) => {
        const url = String(input);
        if (init?.method === 'PATCH') return json(payload);
        if (url.endsWith('/api/approval/approval-A/review')) return json({ data: approval() });
        if (url.endsWith('/api/site-diary/diary-A')) return json({ data: diary() });
        if (url.includes('/history')) return json({ data: { siteDiaryId: 'diary-A', events: [] } });
        throw new Error(`Unexpected request: ${url}`);
      });

      await render();
      await act(async () => decisionButton('Luluskan')?.click());

      // MUST NOT call onSuccess
      expect(onSuccess).not.toHaveBeenCalled();
      // MUST NOT render fake terminal success
      expect(container.querySelector('[data-testid="terminal-approval-status"]')).toBeNull();
      // MUST render safe action error
      expect(container.textContent).toContain('Respons kelulusan tidak sah. Muat semula rekod sebelum meneruskan.');
    }
  });
});
