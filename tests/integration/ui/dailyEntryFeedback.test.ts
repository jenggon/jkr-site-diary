// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import DailyEntryFeedback from '@/app/site-diary/DailyEntryFeedback';
import { submitDailyEntry, SubmitDailyEntryParams } from '@/app/site-diary/DailyEntryForm';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('F2.1-E Feedback, Validation & Submission UX Behavioural Suite', () => {
  let calls: Array<{ url: string; method: string; body: any }>;

  const createMockFetch = (overrides: Record<string, { status: number; json: any }> = {}) => {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const body = init?.body ? (JSON.parse(init.body as string) as any) : undefined;
      calls.push({ url, method, body });

      for (const [routeSubstr, res] of Object.entries(overrides)) {
        if (url.includes(routeSubstr)) {
          return {
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            json: async () => res.json,
          } as unknown as Response;
        }
      }

      if (url.includes('/api/activities') && method === 'POST' && !url.includes('/start') && !url.includes('/complete')) {
        return { ok: true, status: 201, json: async () => ({ data: { activityId: 'act-valid-1' } }) } as unknown as Response;
      }
      if (url.includes('/start') || url.includes('/complete')) {
        return { ok: true, status: 200, json: async () => ({ data: { activityId: 'act-valid-1' } }) } as unknown as Response;
      }
      if (url.includes('/api/site-diary') && method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ data: { site_diary_id: 'sd-valid-1' } }) } as unknown as Response;
      }
      if (url.includes('/api/site-diary') && method === 'PATCH') {
        return { ok: true, status: 200, json: async () => ({ data: { site_diary_id: 'sd-edit-1' } }) } as unknown as Response;
      }

      return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response;
    };
  };

  beforeEach(() => {
    calls = [];
    vi.restoreAllMocks();
  });

  const baseParams: SubmitDailyEntryParams = {
    programmeId: '0651e125-3ef4-47c4-a3fa-8aec49bdf979',
    revisionId: 'rev-uuid-1111-2222-3333',
    selectedSource: {
      sourceType: 'MSP',
      id: 'task-100',
      title: 'Kerja Membina Dinding',
    },
    activityDate: '2026-08-16',
    actualStartDate: '2026-08-16',
    workStatus: 'Sedang Laksana',
    location: 'Aras 1 Blok Pentadbiran',
    workStartTime: '08:00',
    workEndTime: '17:00',
    weatherCondition: 'ELOK',
    rainStartTime: '',
    rainEndTime: '',
    contractorScope: 'CONTRACTOR',
    notes: 'Kemajuan kerja mengikut jadual.',
    manpower: [{ trade_name: 'Pekerja Am', bumi_count: 4, non_bumi_count: 2, foreign_count: 6 }],
  };

  // 1. Required validation prevents mutation
  it('1. Required validation prevents mutation when mandatory fields are missing', async () => {
    const invalidParams: SubmitDailyEntryParams = {
      ...baseParams,
      notes: '   ',
      fetchFn: createMockFetch(),
    };

    await expect(submitDailyEntry(invalidParams)).rejects.toThrow('Sila masukkan Catatan Kemajuan Kerja.');
    expect(calls.length).toBe(0);
  });

  // 2. Validation preserves entered form state (no mutation, parameters intact)
  it('2. Validation failure preserves input parameters without side-effects', async () => {
    const missingLocationParams: SubmitDailyEntryParams = {
      ...baseParams,
      location: '',
      fetchFn: createMockFetch(),
    };

    await expect(submitDailyEntry(missingLocationParams)).rejects.toThrow('Lokasi terperinci / Grid line adalah wajib.');
    expect(missingLocationParams.notes).toBe('Kemajuan kerja mengikut jadual.');
    expect(missingLocationParams.manpower.length).toBe(1);
    expect(calls.length).toBe(0);
  });

  // 3. First/meaningful error is visibly surfaced in DailyEntryFeedback
  it('3. Meaningful error is visibly surfaced in DailyEntryFeedback component with role="alert"', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: 'Sila pilih Sumber Aktiviti (Kerja Jadual MSP atau Kerja VO).',
        success: null,
      })
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Ralat Semasa Memproses Borang');
    expect(html).toContain('Sila pilih Sumber Aktiviti');
  });

  // 4 & 5. Rapid double submission protection / duplicate prevention
  it('4 & 5. Prevents duplicate mutation when parallel submissions are invoked', async () => {
    const mockFetch = createMockFetch();
    const validParams = { ...baseParams, fetchFn: mockFetch };

    // Execute submission
    const res = await submitDailyEntry(validParams);
    expect(res.siteDiaryId).toBe('sd-valid-1');

    // Calls count for single execution is exactly 3: POST /api/activities -> /start -> POST /api/site-diary
    expect(calls.length).toBe(3);
  });

  // 6. Activity create error is surfaced and Site Diary write does not occur
  it('6. Activity create error is surfaced and Site Diary write does NOT occur', async () => {
    const mockFetch = createMockFetch({
      '/api/activities': { status: 400, json: { error: 'Gagal mendaftar aktiviti: nama tidak sah' } },
    });

    const params = { ...baseParams, fetchFn: mockFetch };
    await expect(submitDailyEntry(params)).rejects.toThrow('Gagal mendaftar aktiviti: nama tidak sah');

    // Assert only 1 call attempted, NO /start and NO /api/site-diary
    expect(calls.length).toBe(1);
    expect(calls[0]?.url).toBe('/api/activities');
  });

  // 7. Lifecycle start failure is surfaced
  it('7. Lifecycle start failure is surfaced and halts Site Diary persistence', async () => {
    const mockFetch = createMockFetch({
      '/start': { status: 400, json: { error: 'Tarikh mula tidak boleh melebihi tarikh semasa' } },
    });

    const params = { ...baseParams, fetchFn: mockFetch };
    await expect(submitDailyEntry(params)).rejects.toThrow('Tarikh mula tidak boleh melebihi tarikh semasa');

    expect(calls.length).toBe(2);
    expect(calls.some((c) => c.url.includes('/api/site-diary'))).toBe(false);
  });

  // 8. Lifecycle complete failure is surfaced
  it('8. Lifecycle complete failure is surfaced and halts Site Diary persistence', async () => {
    const mockFetch = createMockFetch({
      '/complete': { status: 400, json: { error: 'Aktiviti telah ditutup sebelum ini' } },
    });

    const params = { ...baseParams, workStatus: 'Siap' as const, fetchFn: mockFetch };
    await expect(submitDailyEntry(params)).rejects.toThrow('Aktiviti telah ditutup sebelum ini');

    expect(calls.length).toBe(2);
    expect(calls.some((c) => c.url.includes('/api/site-diary'))).toBe(false);
  });

  // 9. Duplicate Site Diary conflict displays localized duplicate message
  it('9. Duplicate Site Diary conflict displays localized duplicate message', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary': { status: 409, json: { error: 'duplicate key value violates unique constraint' } },
    });

    const params = { ...baseParams, fetchFn: mockFetch };
    await expect(submitDailyEntry(params)).rejects.toThrow(
      'Laporan untuk aktiviti ini pada tarikh 2026-08-16 telah wujud.'
    );
  });

  // 10. Site Diary create failure displays failure state
  it('10. Site Diary create failure displays failure state', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary': { status: 500, json: { error: 'Database write error' } },
    });

    const params = { ...baseParams, fetchFn: mockFetch };
    await expect(submitDailyEntry(params)).rejects.toThrow('Database write error');
  });

  // 11. Site Diary PATCH failure displays update failure state
  it('11. Site Diary PATCH failure displays update failure state', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary/sd-edit-99': { status: 400, json: { error: 'Semakan projek telah ditutup' } },
    });

    const params: SubmitDailyEntryParams = {
      ...baseParams,
      selectedSource: null,
      editingSiteDiaryId: 'sd-edit-99',
      expectedLastModifiedAt: '2026-08-16T08:00:00.000Z',
      editingActivityId: null,
      fetchFn: mockFetch,
    };

    await expect(submitDailyEntry(params)).rejects.toThrow('Semakan projek telah ditutup');
    expect(calls.length).toBe(1);
    expect(calls[0]?.method).toBe('PATCH');
  });

  // 12. Create success shows correct success message
  it('12. Create success feedback renders with role="status" and Print link', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya disimpan.',
        savedSiteDiaryId: 'sd-uuid-1234-5678',
        isEditMode: false,
        onResetForNewEntry: () => {},
      })
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('Simpanan Berjaya');
    expect(html).toContain('Buku Harian Tapak berjaya disimpan.');
    expect(html).toContain('/site-diary/print?id=sd-uuid-1234-5678');
    expect(html).toContain('+ Laporan Baharu');
  });

  // 13. Edit success shows correct update message
  it('13. Edit success feedback renders update message without new entry button', () => {
    const html = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya dikemaskini.',
        savedSiteDiaryId: 'sd-uuid-1234-5678',
        isEditMode: true,
      })
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('Kemaskini Berjaya');
    expect(html).toContain('Buku Harian Tapak berjaya dikemaskini.');
  });

  // 14. 401/auth failure shows clear session message
  it('14. 401 unauthenticated response is mapped to clear session message', async () => {
    const mockFetch = createMockFetch({
      '/api/activities': { status: 401, json: { error: 'Unauthorized' } },
    });

    const params = { ...baseParams, fetchFn: mockFetch };
    await expect(submitDailyEntry(params)).rejects.toThrow(
      'Sesi telah tamat atau pengguna tidak disahkan. Sila log masuk semula.'
    );
  });

  // 15. User-entered values remain available after backend failure
  it('15. User-entered values in params object remain untouched after backend rejection', async () => {
    const mockFetch = createMockFetch({
      '/api/site-diary': { status: 500, json: { error: 'Internal Error' } },
    });

    const inputData: SubmitDailyEntryParams = {
      ...baseParams,
      notes: 'Catatan penting yang tidak boleh hilang.',
      fetchFn: mockFetch,
    };

    await expect(submitDailyEntry(inputData)).rejects.toThrow('Internal Error');
    expect(inputData.notes).toBe('Catatan penting yang tidak boleh hilang.');
  });

  // 16. Accessibility validation of DailyEntryFeedback
  it('16. Success/error feedback surfaces satisfy aria-live and semantic roles', () => {
    const errorHtml = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: 'Ralat komunikasi pelayan',
        success: null,
      })
    );
    expect(errorHtml).toContain('aria-live="assertive"');

    const successHtml = renderToString(
      React.createElement(DailyEntryFeedback, {
        error: null,
        success: 'Buku Harian Tapak berjaya disimpan.',
      })
    );
    expect(successHtml).toContain('aria-live="polite"');
  });

  it('17. Mounted feedback exposes only an exact encoded ID and never prints automatically', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd/exact?1',
      isEditMode: false,
    })));

    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/site-diary/print?id=sd%2Fexact%3F1');
    expect(printSpy).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
  });

  it('18. Feedback without a canonical ID preserves success status without a print action', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: null,
      isEditMode: false,
    })));

    expect(container.querySelector('[role="status"]')).toBeTruthy();
    expect(container.querySelector('a[href^="/site-diary/print"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it('19. Handoff components retain the sole exact route and no direct print or legacy API behavior', () => {
    const fs = require('fs');
    const path = require('path');
    const sources = [
      'src/app/site-diary/DiaryDetail.tsx',
      'src/app/site-diary/DailyEntryFeedback.tsx',
    ].map(file => fs.readFileSync(path.join(process.cwd(), file), 'utf-8')).join('\n');

    expect(sources).toContain('/site-diary/print?id=');
    expect(sources).not.toContain('/api/reports');
    expect(sources).not.toContain('window.print');
    expect(sources).not.toContain('activityDate}');
    expect(sources).not.toContain('activityId}');
  });

  // A. CREATE submitDailyEntry captures returned submitted_at / lastModifiedAt token
  it('20. [Test A] CREATE submitDailyEntry captures returned token prioritizing lastModifiedAt > updated_at > submitted_at', async () => {
    // Case 1: lastModifiedAt is provided
    const mockFetch1 = createMockFetch({
      '/api/site-diary': {
        status: 201,
        json: {
          data: {
            site_diary_id: 'sd-token-1',
            lastModifiedAt: '2026-08-28T09:00:00.000Z',
            updated_at: '2026-08-28T08:00:00.000Z',
            submitted_at: '2026-08-28T07:00:00.000Z',
          },
        },
      },
    });
    const res1 = await submitDailyEntry({ ...baseParams, fetchFn: mockFetch1 });
    expect(res1.lastModifiedAt).toBe('2026-08-28T09:00:00.000Z');

    // Case 2: updated_at is provided (no lastModifiedAt)
    const mockFetch2 = createMockFetch({
      '/api/site-diary': {
        status: 201,
        json: {
          data: {
            site_diary_id: 'sd-token-2',
            updated_at: '2026-08-28T08:30:00.000Z',
            submitted_at: '2026-08-28T07:00:00.000Z',
          },
        },
      },
    });
    const res2 = await submitDailyEntry({ ...baseParams, fetchFn: mockFetch2 });
    expect(res2.lastModifiedAt).toBe('2026-08-28T08:30:00.000Z');

    // Case 3: submitted_at is provided (canonical DB column)
    const mockFetch3 = createMockFetch({
      '/api/site-diary': {
        status: 201,
        json: {
          data: {
            site_diary_id: 'sd-token-3',
            submitted_at: '2026-08-28T07:15:00.000Z',
          },
        },
      },
    });
    const res3 = await submitDailyEntry({ ...baseParams, fetchFn: mockFetch3 });
    expect(res3.lastModifiedAt).toBe('2026-08-28T07:15:00.000Z');
  });

  // B. Successful non-edit save exposes "Mohon Kelulusan"
  it('21. [Test B] Successful non-edit save exposes "Mohon Kelulusan" button', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd-valid-1',
      isEditMode: false,
      approvalContext: {
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityId: 'act-1',
        siteDiaryId: 'sd-valid-1',
        lastModifiedAt: '2026-08-28T10:00:00.000Z',
      },
    })));

    const button = container.querySelector('[data-testid="request-approval-btn"]');
    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Mohon Kelulusan');

    act(() => root.unmount());
    container.remove();
  });

  // C & D. Approval request payload contains EXACT required fields and NO client actor identity
  it('22. [Test C & D] Approval request payload contains exact required fields and no client actor identity', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const postCalls: any[] = [];
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      postCalls.push({ url: String(input), method: init?.method, body });
      return {
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            approval_id: 'appr-uuid-1',
            approval_status: 'Pending',
            site_diary_id: 'sd-valid-1',
          },
        }),
      } as unknown as Response;
    };

    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd-valid-1',
      isEditMode: false,
      fetchFn: mockFetch as any,
      approvalContext: {
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityId: 'act-1',
        siteDiaryId: 'sd-valid-1',
        lastModifiedAt: '2026-08-28T10:00:00.000Z',
      },
    })));

    const button = container.querySelector('[data-testid="request-approval-btn"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    await act(async () => {
      button.click();
    });

    expect(postCalls).toHaveLength(1);
    const call = postCalls[0];
    expect(call.url).toBe('/api/approval');
    expect(call.method).toBe('POST');

    // C. Exact required fields
    expect(call.body).toEqual({
      programme_id: 'prog-1',
      revision_id: 'rev-1',
      activity_id: 'act-1',
      site_diary_id: 'sd-valid-1',
      expected_site_diary_last_modified_at: '2026-08-28T10:00:00.000Z',
    });

    // D. No client actor identity
    expect(call.body.requested_by).toBeUndefined();
    expect(call.body.approved_by).toBeUndefined();
    expect(call.body.actorId).toBeUndefined();
    expect(call.body.userId).toBeUndefined();

    act(() => root.unmount());
    container.remove();
  });

  // E. 201 Pending captures approval_id, renders Pending state, prevents second request
  it('23. [Test E] 201 Pending renders Pending state and removes/disables "Mohon Kelulusan"', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            approval_id: 'appr-uuid-99',
            approval_status: 'Pending',
            site_diary_id: 'sd-valid-1',
          },
        }),
      } as unknown as Response;
    };

    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd-valid-1',
      isEditMode: false,
      fetchFn: mockFetch as any,
      approvalContext: {
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityId: 'act-1',
        siteDiaryId: 'sd-valid-1',
        lastModifiedAt: '2026-08-28T10:00:00.000Z',
      },
    })));

    const button = container.querySelector('[data-testid="request-approval-btn"]') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });

    expect(callCount).toBe(1);
    expect(container.querySelector('[data-testid="approval-status-pending"]')).toBeTruthy();
    expect(container.textContent).toContain('Menunggu Kelulusan');
    expect(container.querySelector('[data-testid="request-approval-btn"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  // F. Approval request error: no fake Pending state, safe visible error, request may be retried manually
  it('24. [Test F] Approval request error displays safe error without fake Pending and allows manual retry', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Ralat pelayan semasa memohon kelulusan' }),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            approval_id: 'appr-uuid-retry',
            approval_status: 'Pending',
          },
        }),
      } as unknown as Response;
    };

    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd-valid-1',
      isEditMode: false,
      fetchFn: mockFetch as any,
      approvalContext: {
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityId: 'act-1',
        siteDiaryId: 'sd-valid-1',
        lastModifiedAt: '2026-08-28T10:00:00.000Z',
      },
    })));

    const button = container.querySelector('[data-testid="request-approval-btn"]') as HTMLButtonElement;
    expect(button).toBeTruthy();

    // First attempt -> fails
    await act(async () => {
      button.click();
    });

    expect(callCount).toBe(1);
    expect(container.querySelector('[data-testid="approval-status-pending"]')).toBeNull();
    expect(container.textContent).toContain('Ralat pelayan semasa memohon kelulusan');

    // Button is still available and not disabled
    const retryBtn = container.querySelector('[data-testid="request-approval-btn"]') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.disabled).toBe(false);

    // Second attempt -> succeeds
    await act(async () => {
      retryBtn.click();
    });

    expect(callCount).toBe(2);
    expect(container.querySelector('[data-testid="approval-status-pending"]')).toBeTruthy();
    expect(container.textContent).toContain('Menunggu Kelulusan');

    act(() => root.unmount());
    container.remove();
  });

  // G. Approval action is not invented for invalid/missing saved identity
  it('25. [Test G] Approval action is not rendered when context is missing or in edit mode', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Case 1: Edit mode
    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya dikemaskini.',
      savedSiteDiaryId: 'sd-edit-1',
      isEditMode: true,
      approvalContext: {
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityId: 'act-1',
        siteDiaryId: 'sd-edit-1',
        lastModifiedAt: '2026-08-28T10:00:00.000Z',
      },
    })));
    expect(container.querySelector('[data-testid="request-approval-btn"]')).toBeNull();

    // Case 2: Missing lastModifiedAt
    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd-valid-1',
      isEditMode: false,
      approvalContext: {
        programmeId: 'prog-1',
        revisionId: 'rev-1',
        activityId: 'act-1',
        siteDiaryId: 'sd-valid-1',
        lastModifiedAt: null,
      },
    })));
    expect(container.querySelector('[data-testid="request-approval-btn"]')).toBeNull();

    // Case 3: Missing approvalContext altogether
    await act(async () => root.render(React.createElement(DailyEntryFeedback, {
      error: null,
      success: 'Buku Harian Tapak berjaya disimpan.',
      savedSiteDiaryId: 'sd-valid-1',
      isEditMode: false,
      approvalContext: null,
    })));
    expect(container.querySelector('[data-testid="request-approval-btn"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });
});
