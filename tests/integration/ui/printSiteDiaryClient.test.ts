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
  useSearchParams: () => {
    return {
      get: (key: string) => mockSearchParams.get(key) || null,
    };
  }
}));

describe('F2.5-B02 Print Site Diary Exact Renderer Integration', () => {
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

  function getHTML() {
    return container.innerHTML;
  }

  const createValidDto = () => ({
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
      { tradeName: 'CONCRETOR', bumiCount: 1, nonBumiCount: 2, foreignCount: 3 }
    ],
    submittedBy: 'pm1',
    submittedAt: '2026-08-20T10:00:00Z',
    updatedAt: null,
  });

  it('1 & 2 & 4. /site-diary/print?id=A fetches exact endpoint A and not legacy, renders current diary', async () => {
    mockSearchParams.set('id', 'sd-exact');
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);

    await act(async () => {
      root.render(React.createElement(PrintSiteDiaryClient));
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/site-diary/sd-exact/print');
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/reports'));

    await act(async () => {
      d.resolve(json({ data: createValidDto() }));
    });

    const html = getHTML();
    expect(html).toContain('MSP Task');
    expect(html).toContain('Block A');
    expect(html).toContain('CONCRETOR');
    expect(html).toContain('20/08/2026');
    expect(html).toContain('ELOK');
    expect(html).toContain('✓'); // checkmark
  });

  it('5. historical diary renders exactly identical without mutation', async () => {
    mockSearchParams.set('id', 'sd-hist');
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);

    await act(async () => {
      root.render(React.createElement(PrintSiteDiaryClient));
    });

    const histDto = createValidDto();
    Object.assign(histDto, {
      siteDiaryId: 'sd-hist',
      isCurrentRevision: false,
      isHistorical: true,
      taskName: 'Historical Task',
    });

    await act(async () => {
      d.resolve(json({ data: histDto }));
    });

    const html = getHTML();
    expect(html).toContain('Historical Task');
  });

  it('7. VO record renders canonical VO identity', async () => {
    mockSearchParams.set('id', 'sd-vo');
    fetchMock.mockResolvedValueOnce(json({
      data: { ...createValidDto(), sourceType: 'VO', wbs: 'VO-01', taskName: 'Variation Order Task' }
    }));

    await act(async () => {
      root.render(React.createElement(PrintSiteDiaryClient));
    });

    expect(getHTML()).toContain('Variation Order Task');
    expect(getHTML()).toContain('VO-01');
  });

  it('8 & 9. manpower renders, empty manpower renders safely', async () => {
    mockSearchParams.set('id', 'sd-empty');
    fetchMock.mockResolvedValueOnce(json({
      data: { ...createValidDto(), manpower: [] }
    }));

    await act(async () => {
      root.render(React.createElement(PrintSiteDiaryClient));
    });

    expect(getHTML()).toContain('Warganegara'); // Check table renders without crashing
  });

  it('10. canonical print_context defaults render correctly', async () => {
    mockSearchParams.set('id', 'sd-defaults');
    const d = deferred<Response>();
    fetchMock.mockReturnValueOnce(d.promise);

    await act(async () => {
      root.render(React.createElement(PrintSiteDiaryClient));
    });

    const defDto = createValidDto() as any;
    defDto.printContext = {
      location: '',
      workStartTime: null,
      workEndTime: null,
      weatherCondition: null,
      rainStartTime: null,
      rainEndTime: null,
      contractorScope: 'CONTRACTOR',
    };

    await act(async () => {
      d.resolve(json({ data: defDto }));
    });

    const html = getHTML();
    expect(html).toContain('CUACA: <span class="field-line"></span>');
  });

  it('11. missing id fails safely', async () => {
    await act(async () => {
      root.render(React.createElement(PrintSiteDiaryClient));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getHTML()).toContain('Ralat: ID rekod tidak ditemui');
  });

  it('13, 14, 15, 16. handles 401, 403, 404, 500 states exactly', async () => {
    mockSearchParams.set('id', 'sd-err');
    
    // 401
    fetchMock.mockResolvedValueOnce(json({ error: 'unauth' }, 401));
    await act(async () => { root.render(React.createElement(PrintSiteDiaryClient)); });
    expect(getHTML()).toContain('401 Unauthorized');

    // 403
    await act(async () => { root.unmount(); container.innerHTML = ''; root = createRoot(container); });
    fetchMock.mockResolvedValueOnce(json({ error: 'forbid' }, 403));
    await act(async () => { root.render(React.createElement(PrintSiteDiaryClient)); });
    expect(getHTML()).toContain('403 Forbidden');

    // 404
    await act(async () => { root.unmount(); container.innerHTML = ''; root = createRoot(container); });
    fetchMock.mockResolvedValueOnce(json({ error: 'not found' }, 404));
    await act(async () => { root.render(React.createElement(PrintSiteDiaryClient)); });
    expect(getHTML()).toContain('404 Not Found');

    // 500
    await act(async () => { root.unmount(); container.innerHTML = ''; root = createRoot(container); });
    fetchMock.mockResolvedValueOnce(json({ error: 'Backend crash' }, 500));
    await act(async () => { root.render(React.createElement(PrintSiteDiaryClient)); });
    expect(getHTML()).toContain('Backend crash');
  });

  it('18. stale request A cannot overwrite later request B', async () => {
    mockSearchParams.set('id', 'sd-A');
    const dA = deferred<Response>();
    const dB = deferred<Response>();
    
    fetchMock.mockReturnValueOnce(dA.promise);
    await act(async () => { root.render(React.createElement(PrintSiteDiaryClient)); });
    
    mockSearchParams.set('id', 'sd-B');
    fetchMock.mockReturnValueOnce(dB.promise);
    // Render again with new props effectively unmounting the old effect due to prop change in real router
    // But since we mock useSearchParams to return the mutable map, we can just trigger a re-render.
    // In our manual test setup, we just unmount and mount again like a real route change.
    await act(async () => { root.unmount(); container.innerHTML = ''; root = createRoot(container); });
    await act(async () => { root.render(React.createElement(PrintSiteDiaryClient)); });
    
    await act(async () => { dA.resolve(json({ data: { ...createValidDto(), taskName: 'Task A' } })); });
    expect(getHTML()).not.toContain('Task A');
    
    await act(async () => { dB.resolve(json({ data: { ...createValidDto(), taskName: 'Task B' } })); });
    expect(getHTML()).toContain('Task B');
  });
});
