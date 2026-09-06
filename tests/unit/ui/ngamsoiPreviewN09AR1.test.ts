// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { ngamsoiPreviewFetch } from '@/lib/ngamsoiPreview';

async function data(path: string, init?: RequestInit) {
  const response = await ngamsoiPreviewFetch(path, init);
  expect(response).toBeTruthy();
  return response!;
}

describe('N09A physical R1 interactive preview state', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/site-diary?preview=ngamsoi');
  });

  it('exposes current and historical REKOD, persists preview Save, preserves edit concurrency and audit state', async () => {
    const currentBefore = await (await data('/api/site-diary/revision/22222222-2222-4222-8222-222222222222?programmeId=11111111-1111-4111-8111-111111111111')).json();
    expect(currentBefore.data).toHaveLength(1);
    expect(currentBefore.data[0]).toMatchObject({ isCurrentRevision: true, isReadOnly: false, sourceType: 'MSP' });

    const historyBefore = await (await data('/api/site-diary/revision/66666666-6666-4666-8666-666666666666?programmeId=11111111-1111-4111-8111-111111111111')).json();
    expect(historyBefore.data).toHaveLength(1);
    expect(historyBefore.data[0]).toMatchObject({ isCurrentRevision: false, isReadOnly: true, sourceType: 'VO' });

    await data('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: 'MSP', activityName: 'Kerja ujian penerimaan fizikal', taskId: '33333333-3333-4333-8333-333333333333' }),
    });

    const saved = await (await data('/api/site-diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        programme_id: '11111111-1111-4111-8111-111111111111',
        revision_id: '22222222-2222-4222-8222-222222222222',
        activity_id: '44444444-4444-4444-8444-444444444444',
        activity_date: '2026-09-06',
        notes: 'Disimpan dari CATAT preview',
        manpower: [{ trade_name: 'Pembengkok Besi', bumi_count: 1, non_bumi_count: 0, foreign_count: 2 }],
        print_context: { location: 'Aras 2 · Grid 4–8', work_start_time: '08:00', work_end_time: '17:00', weather_condition: 'ELOK', rain_start_time: null, rain_end_time: null, contractor_scope: 'CONTRACTOR' },
      }),
    })).json();
    expect(saved.data.site_diary_id).toBe('55555555-5555-4555-8555-555555555555');

    const currentAfter = await (await data('/api/site-diary/revision/22222222-2222-4222-8222-222222222222?programmeId=11111111-1111-4111-8111-111111111111')).json();
    expect(currentAfter.data[0]).toMatchObject({ activityTitle: 'Kerja ujian penerimaan fizikal', location: 'Aras 2 · Grid 4–8', contractorScope: 'CONTRACTOR' });

    const detailResponse = await data('/api/site-diary/55555555-5555-4555-8555-555555555555');
    const detail = await detailResponse.json();
    expect(detail.data.notes).toBe('Disimpan dari CATAT preview');
    expect(detail.data.manpower[0]).toMatchObject({ bumi_count: 1, foreign_count: 2 });

    const token = detail.data.updated_at ?? detail.data.submitted_at;
    const patched = await data('/api/site-diary/55555555-5555-4555-8555-555555555555', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected_last_modified_at: token, notes: 'Edit preview berjaya', manpower: detail.data.manpower, print_context: detail.data.print_context }),
    });
    expect(patched.status).toBe(200);

    const history = await (await data('/api/site-diary/55555555-5555-4555-8555-555555555555/history')).json();
    expect(history.data.events.map((event: { eventType: string }) => event.eventType)).toEqual(['NEW', 'UPDATE']);

    const stale = await data('/api/site-diary/55555555-5555-4555-8555-555555555555', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expected_last_modified_at: token, notes: 'Stale edit' }),
    });
    expect(stale.status).toBe(409);
  });
});
