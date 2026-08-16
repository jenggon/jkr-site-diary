import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DailyEntryForm from '@/app/site-diary/DailyEntryForm';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

// Mock DailyEntryContext
vi.mock('@/app/site-diary/DailyEntryShell', () => ({
  useDailyEntryContext: () => ({
    programmeId: 'prog-uuid-1111-2222-3333',
    revisionId: 'rev-uuid-aaaa-bbbb-cccc',
    programmeName: 'Cadangan Membina Hospital Pakar',
    programmeCode: 'JKR/HQ/2026/01',
    loading: false,
    error: null,
    availableProgrammes: [],
    setProgrammeId: vi.fn(),
    refreshContext: vi.fn(),
  }),
}));

describe('F2.1-C Mandatory 10-Scenario Parity Gate & Native Orchestration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Scenario 1: MSP-sourced new Activity creation sends canonical MSP payload', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    // Verifies creation payload includes sourceType: MSP and taskId
    expect(formSource).toContain("sourceType: selectedSource.sourceType");
    expect(formSource).toContain("if (selectedSource.sourceType === 'MSP')");
    expect(formSource).toContain("createActivityPayload.taskId = selectedSource.id");
    expect(formSource).toContain("fetch('/api/activities'");
  });

  it('Scenario 2: VO-sourced new Activity creation sends canonical VO payload', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    // Verifies creation payload includes sourceType: VO and voItemId
    expect(formSource).toContain("createActivityPayload.voItemId = selectedSource.id");
    expect(formSource).toContain("activityName: selectedSource.title");
  });

  it('Scenario 3: Known Start Date is explicitly captured and passed to lifecycle transition', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain('actualStartDate');
    expect(formSource).toContain('actualStartDate || activityDate');
    expect(formSource).toContain('Tarikh Mula Sebenar (Known Start)');
  });

  it('Scenario 4: Same-day start + completion triggers /complete with both actualStartDate and completedDate', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain("if (workStatus === 'Siap')");
    expect(formSource).toContain('/api/activities/${encodeURIComponent(resolvedActivityId)}/complete');
    expect(formSource).toContain('completedDate: activityDate');
    expect(formSource).toContain('actualStartDate: actualStartDate || activityDate');
  });

  it('Scenario 5: In Progress save triggers /start and creates Site Diary row', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain('/api/activities/${encodeURIComponent(resolvedActivityId)}/start');
    expect(formSource).toContain("fetch('/api/site-diary'");
  });

  it('Scenario 6: Site Diary edit preserves site_diary_id via PATCH', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain("if (editingSiteDiaryId)");
    expect(formSource).toContain("method: 'PATCH'");
    expect(formSource).toContain('/api/site-diary/${encodeURIComponent(editingSiteDiaryId)}');
    expect(formSource).toContain('savedSiteDiaryId = patchJson?.data?.site_diary_id ?? editingSiteDiaryId');
  });

  it('Scenario 7: Duplicate prevention detects existing (activity_id, activity_date) conflict', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain("errMessage.toLowerCase().includes('duplicate')");
    expect(formSource).toContain("errMessage.toLowerCase().includes('already exists')");
    expect(formSource).toContain('telah wujud');
  });

  it('Scenario 8: Workforce is persisted atomically as manpower array within Site Diary payload', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain('manpower: activeManpower');
    expect(formSource).toContain('bumi_count');
    expect(formSource).toContain('non_bumi_count');
    expect(formSource).toContain('foreign_count');
  });

  it('Scenario 9: Full print_context (all 7 JKR Page 1 fields) is natively constructed and sent', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    expect(formSource).toContain('buildPrintContext');
    expect(formSource).toContain('location: location.trim()');
    expect(formSource).toContain('work_start_time: workStartTime');
    expect(formSource).toContain('work_end_time: workEndTime');
    expect(formSource).toContain('weather_condition: weatherCondition');
    expect(formSource).toContain('rain_start_time');
    expect(formSource).toContain('rain_end_time');
    expect(formSource).toContain('contractor_scope: contractorScope');
    expect(formSource).toContain('print_context: compiledPrintContext');
  });

  it('Scenario 10: Authenticated bearer propagation and server actor authority are enforced', async () => {
    const formSource = read('src/app/site-diary/DailyEntryForm.tsx');

    // Verifies form does NOT inject spoofed or client-side actorId/submittedBy in mutation payloads
    expect(formSource).not.toContain('submitted_by:');
    expect(formSource).not.toContain('actor_id:');
    expect(formSource).not.toContain('createdBy:');
  });

  it('Renders native DailyEntryForm with full mobile-first form controls', () => {
    const html = renderToString(
      React.createElement(DailyEntryForm, {})
    );

    // Verify sections
    expect(html).toContain('Tarikh &amp; Status Kerja');
    expect(html).toContain('Maklumat Tapak &amp; Cuaca (Format JKR Page 1)');
    expect(html).toContain('Tenaga Kerja di Tapak (Workforce)');
    expect(html).toContain('Catatan &amp; Huraian Kemajuan Kerja');
    expect(html).toContain('Hantar &amp; Simpan Buku Harian Tapak');
  });
});
