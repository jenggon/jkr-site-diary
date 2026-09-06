import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('N09A R2A visual/controller contract', () => {
  it('uses a dedicated PATCH-only records editor instead of the CATAT lifecycle controller', () => {
    const records = source('src/app/site-diary/RecordsEditForm.tsx');
    const management = source('src/app/site-diary/DiaryManagementList.tsx');

    expect(management).toContain("data-record-edit-authority=\"N09A-R2A\"");
    expect(management).toContain('<RecordsEditForm');
    expect(management).not.toContain('initialSiteDiaryId={editingSiteDiaryId}');

    expect(records).toContain("method: 'PATCH'");
    expect(records).toContain('/api/site-diary/${encodeURIComponent(detail.site_diary_id)}');
    expect(records).not.toContain('/api/activities/${');
    expect(records).not.toContain('/start`');
    expect(records).not.toContain('/complete`');
  });

  it('keeps immutable edit facts read-only and exposes only supported official weather choices', () => {
    const records = source('src/app/site-diary/RecordsEditForm.tsx');
    const weather = source('src/app/site-diary/WeatherEvidenceSection.tsx');

    expect(records).toContain("readOnlyFact('TARIKH'");
    expect(records).toContain("readOnlyFact('MULA SEBENAR'");
    expect(records).toContain("readOnlyFact('STATUS'");
    expect(records).toContain('initializationMode="PRESERVE"');
    expect(weather).toContain("initializationMode?: 'AUTO' | 'PRESERVE'");
    expect(weather).toContain("if (initializationMode === 'PRESERVE')");
    expect(weather).not.toContain('MENDUNG');
    expect(weather).not.toContain('RIBUT');
  });

  it('uses truthful exact-record print copy and a strong parent-back affordance', () => {
    const detail = source('src/app/site-diary/DiaryDetail.tsx');

    expect(detail).toContain('data-record-print-exact');
    expect(detail).toContain('Cetak Rekod Ini');
    expect(detail).not.toContain('>Cetak Buku Harian Tapak</Link>');
    expect(detail).toContain('data-record-back');
    expect(detail).toContain('← Kembali ke Senarai Rekod');
  });

  it('gives REKOD dates one bounded sharp visual authority without changing range semantics', () => {
    const css = source('src/app/ngamsoi-n09-r2a.css');
    const list = source('src/app/site-diary/DiaryManagementList.tsx');

    expect(css).toContain('[data-record-filters] input.ng-entry-date');
    expect(css).toContain('border-radius: 0 !important');
    expect(css).toContain('box-shadow: none !important');
    expect(list).toContain('type="date" value={dateFrom} max={currentLocalDate}');
    expect(list).toContain('type="date" value={dateTo} max={currentLocalDate}');
    expect(list).toContain('boundToToday(event.target.value, currentLocalDate)');
  });
});
