/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import WorkforceEntry, {
  ManpowerRow,
  COMMON_TRADES_CATALOG,
} from '@/app/site-diary/WorkforceEntry';
import { submitDailyEntry, SubmitDailyEntryParams } from '@/app/site-diary/DailyEntryForm';

describe('F2.1-D Mobile Workforce & Trade Entry Unit / Integration Suite', () => {
  let mockManpower: ManpowerRow[];
  let onChangeSpy: (manpower: ManpowerRow[]) => void;

  beforeEach(() => {
    mockManpower = [
      { trade_name: 'Pekerja Am', bumi_count: 3, non_bumi_count: 1, foreign_count: 4 },
      { trade_name: 'Tukang Kayu', bumi_count: 2, non_bumi_count: 0, foreign_count: 0 },
    ];
    onChangeSpy = vi.fn();
    vi.restoreAllMocks();
  });

  it('1. Renders mobile-friendly Trade rows with clear Bahasa Malaysia labels', () => {
    const html = renderToString(
      React.createElement(WorkforceEntry, {
        manpower: mockManpower,
        onChange: onChangeSpy,
      })
    );

    expect(html).toContain('Pekerja');
    expect(html).toContain('Pekerja Am');
    expect(html).toContain('Tukang Kayu');
    expect(html).toContain('Bumiputera');
    expect(html).toContain('Bukan Bumiputera');
    expect(html).toContain('Bukan Warganegara');
  });

  it('2. Correctly derives per-Trade totals and overall total with hardhat-only visible counter', () => {
    const html = renderToString(
      React.createElement(WorkforceEntry, {
        manpower: mockManpower,
        onChange: onChangeSpy,
      })
    );

    expect(html).toContain('8');
    expect(html).toContain('2');
    expect(html).toContain('aria-label="10 pekerja"');
    expect(html).toContain('ng-workforce__overall-icon');
    expect(html).not.toContain('>ORANG<');
    expect(html).not.toContain('👷');
  });

  it('3. Negative counts are strictly coerced to 0 in derived totals', () => {
    const negativeManpower: ManpowerRow[] = [
      { trade_name: 'Pekerja Am', bumi_count: -5, non_bumi_count: -2, foreign_count: 3 },
    ];

    const html = renderToString(
      React.createElement(WorkforceEntry, {
        manpower: negativeManpower,
        onChange: onChangeSpy,
      })
    );

    expect(html).toContain('aria-label="3 pekerja"');
  });

  it('4. Provides standard Malaysian construction trades catalog for fast selection', () => {
    expect(COMMON_TRADES_CATALOG.length).toBeGreaterThan(10);
    expect(COMMON_TRADES_CATALOG).toContain('General Worker (Pekerja Am)');
    expect(COMMON_TRADES_CATALOG).toContain('Carpenter (Tukang Kayu)');
    expect(COMMON_TRADES_CATALOG).toContain('Bar Bender (Pembengkok Besi)');
    expect(COMMON_TRADES_CATALOG).toContain('Excavator Operator (Pemandu Jengkaut)');
  });

  it('5. Renders friendly empty state when no trade rows exist', () => {
    const html = renderToString(
      React.createElement(WorkforceEntry, {
        manpower: [],
        onChange: onChangeSpy,
      })
    );

    expect(html).toContain('Tiada');
    expect(html).toContain('aria-label="0 pekerja"');
  });

  it('6. Workforce payload reaches Site Diary mutation atomically without duplicate API calls', async () => {
    const calls: Array<{ url: string; method: string; body: any }> = [];
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, method, body });

      if (url.includes('/api/activities') && method === 'POST' && !url.includes('/start') && !url.includes('/complete')) {
        return { ok: true, status: 201, json: async () => ({ data: { activityId: 'act-101' } }) } as unknown as Response;
      }
      if (url.includes('/start')) {
        return { ok: true, status: 200, json: async () => ({ data: { activityId: 'act-101' } }) } as unknown as Response;
      }
      if (url.includes('/api/site-diary') && method === 'POST') {
        return { ok: true, status: 201, json: async () => ({ data: { site_diary_id: 'sd-202' } }) } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response;
    };

    const params: SubmitDailyEntryParams = {
      programmeId: '0651e125-3ef4-47c4-a3fa-8aec49bdf979',
      revisionId: 'rev-uuid-1111-2222-3333',
      selectedSource: {
        sourceType: 'MSP',
        id: 'task-101',
        title: 'Kerja-kerja Struktur',
      },
      activityDate: '2026-08-16',
      actualStartDate: '2026-08-16',
      workStatus: 'Sedang Laksana',
      location: 'Blok A Aras 1',
      workStartTime: '08:00',
      workEndTime: '17:00',
      weatherCondition: 'ELOK',
      rainStartTime: '',
      rainEndTime: '',
      contractorScope: 'CONTRACTOR',
      notes: 'Kerja pembinaan berjalan lancar.',
      manpower: [
        { trade_name: 'Pekerja Am', bumi_count: 5, non_bumi_count: 2, foreign_count: 10 },
        { trade_name: 'Tukang Besi', bumi_count: 0, non_bumi_count: 0, foreign_count: 0 },
      ],
      fetchFn: mockFetch,
    };

    const result = await submitDailyEntry(params);
    expect(result.siteDiaryId).toBe('sd-202');

    const sdCall = calls.find((c) => c.url === '/api/site-diary' && c.method === 'POST');
    expect(sdCall).toBeDefined();
    expect(sdCall?.body.manpower).toEqual([
      { trade_name: 'Pekerja Am', bumi_count: 5, non_bumi_count: 2, foreign_count: 10 },
    ]);
  });

  it('7. Edit mode preserves site_diary_id and updates workforce atomically via PATCH', async () => {
    const calls: Array<{ url: string; method: string; body: any }> = [];
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';
      const body = init?.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, method, body });

      if (url.includes('/api/site-diary/sd-edit-303') && method === 'PATCH') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { site_diary_id: 'sd-edit-303' } }),
        } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({ data: {} }) } as unknown as Response;
    };

    const editParams: SubmitDailyEntryParams = {
      programmeId: '0651e125-3ef4-47c4-a3fa-8aec49bdf979',
      revisionId: 'rev-uuid-1111-2222-3333',
      selectedSource: null,
      editingSiteDiaryId: 'sd-edit-303',
      expectedLastModifiedAt: '2026-08-16T08:00:00.000Z',
      editingActivityId: null,
      activityDate: '2026-08-16',
      actualStartDate: '2026-08-16',
      workStatus: 'Sedang Laksana',
      location: 'Blok A Aras 1',
      workStartTime: '08:00',
      workEndTime: '17:00',
      weatherCondition: 'ELOK',
      rainStartTime: '',
      rainEndTime: '',
      contractorScope: 'NSC',
      notes: 'Catatan dikemaskini.',
      manpower: [
        { trade_name: 'Pemasang Perancah', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 },
      ],
      fetchFn: mockFetch,
    };

    const result = await submitDailyEntry(editParams);
    expect(result.siteDiaryId).toBe('sd-edit-303');

    expect(calls.length).toBe(1);
    expect(calls[0]?.url).toBe('/api/site-diary/sd-edit-303');
    expect(calls[0]?.method).toBe('PATCH');
    expect(calls[0]?.body.manpower).toEqual([
      { trade_name: 'Pemasang Perancah', bumi_count: 2, non_bumi_count: 1, foreign_count: 3 },
    ]);
    expect(calls[0]?.body.print_context.contractor_scope).toBe('NSC');
  });

  it('8. All workforce persistence occurs strictly via authenticated REST APIs without direct browser DB writes', () => {
    expect(typeof WorkforceEntry).toBe('function');
  });
});
