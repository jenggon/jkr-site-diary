import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/app/site-diary/AktivitiEntryForm.tsx'), 'utf8');

describe('F4.5 AKTIVITI continuation parity', () => {
  it('uses the locked daily snapshot and binary weather components', () => {
    expect(source).toContain("SiteDiaryDailyWorkStatus");
    expect(source).toContain("'MULA'");
    expect(source).toContain("'LAKSANA'");
    expect(source).toContain("'SIAP'");
    expect(source).toContain("'MULA_DAN_SIAP'");
    expect(source).toContain('<WeatherEvidenceSection');
    expect(source).not.toContain('MENDUNG');
    expect(source).not.toContain('RIBUT');
    expect(source).toContain('daily_work_status: dailyStatus');
    expect(source).toContain('rain_intervals: weather.intervals');
    expect(source).toContain('weather_suggested_intervals: weather.suggestedIntervals');
  });

  it('starts workforce empty while preserving latest-prior continuation prefill', () => {
    expect(source).toContain('const [manpower, setManpower] = useState<ManpowerRow[]>([])');
    expect(source).toContain('<SmartWorkforceEntry');
    expect(source).toContain(".filter((diary) => diary.activity_date < targetDate)");
    expect(source).toContain(".sort((a, b) => b.activity_date.localeCompare(a.activity_date))[0]");
    expect(source).toContain('setManpower(latestPrior.manpower.map((row) => ({ ...row })))');
    expect(source).not.toContain('DEFAULT_TRADES');
  });

  it('keeps canonical activity identity and rechecks lifecycle before write', () => {
    expect(source).toContain('record.activity_id !== activityId');
    expect(source).toContain('record.programme_id !== programmeId');
    expect(source).toContain('record.revision_id !== revisionId');
    expect(source).toContain('latest.activity_id !== selectedActivityId');
    expect(source).toContain("if (latest.status === 'Completed')");
    expect(source).toContain('activity_id: selectedActivityId');
    expect(source).toContain("/api/activities/${encodeURIComponent(selectedActivityId)}/complete");
    expect(source).toContain("/api/activities/${encodeURIComponent(selectedActivityId)}/start");
  });

  it('retains async invalidation protection and canonical actual-start authority with user-context copy', () => {
    expect(source).toContain('generationRef');
    expect(source).toContain('AbortController');
    expect(source).toContain('abortRef.current?.abort()');
    expect(source).toContain("const canonicalActualStart = activity?.actual_start_date?.trim() || ''");
    expect(source).toContain('Tarikh sebenar kerja mula di tapak.');
    expect(source).not.toContain('Bukan tarikh MSP.');
    expect(source).not.toContain('Bukan tarikh mula terancang MSP.');
  });
});
