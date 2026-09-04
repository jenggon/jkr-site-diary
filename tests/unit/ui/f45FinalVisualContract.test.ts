import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const catat = source('src/app/site-diary/CatatEntryForm.tsx');
const aktiviti = source('src/app/site-diary/AktivitiEntryForm.tsx');
const workspace = source('src/app/site-diary/SiteDiaryWorkspace.tsx');
const postSave = source('src/app/site-diary/PostSaveConfirmation.tsx');
const workforce = source('src/app/site-diary/SmartWorkforceEntry.tsx');
const weather = source('src/app/site-diary/WeatherEvidenceSection.tsx');
const forecast = source('src/app/site-diary/ProjectWeatherPulse.tsx');
const css = source('src/app/ngamsoi-f45-harmony.css');
const sealCss = source('src/app/ngamsoi-f45-seal.css');
const layout = source('src/app/layout.tsx');

describe('F4.5 final NGAMSOI visual reconciliation', () => {
  it('loads the visual seal after F4.5 harmony and locks sharp-sleek operational geometry', () => {
    const n07 = layout.indexOf('ngamsoi-n07-navigation.css');
    const f45 = layout.indexOf('ngamsoi-f45-harmony.css');
    const seal = layout.indexOf('ngamsoi-f45-seal.css');
    expect(n07).toBeGreaterThanOrEqual(0);
    expect(f45).toBeGreaterThan(n07);
    expect(seal).toBeGreaterThan(f45);
    expect(sealCss).toContain('F4.5 VISUAL SEAL AUTHORITY');
    expect(sealCss).toContain('--ng-f45-radius: 0;');
    expect(sealCss).toContain('--ng-f45-radius-small: 0;');
  });

  it('uses explicit semantic Spine states in the locked operational order', () => {
    for (const file of [catat, aktiviti]) {
      for (const step of ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save']) {
        expect(file).toContain(`data-entry-step=\"${step}\"`);
      }
      expect(file).toContain('data-spine-state={stateFor(');
    }
    expect(css).toContain("[data-spine-state='complete']");
    expect(css).toContain("[data-spine-state='current']");
    expect(css).toContain("[data-spine-state='upcoming']");
    expect(sealCss).toContain("padding-left: 0 !important");
    expect(sealCss).toContain("var(--ng-spine-x) - var(--ng-step-offset) - .38rem");
    expect(sealCss).toContain("[data-spine-state='complete']::before");
    expect(sealCss).toContain("--ng-f45-success: #3fb950");
  });

  it('keeps normal working hours at 08:00 to 17:00 and surfaces a 24-hour product summary', () => {
    for (const file of [catat, aktiviti]) {
      expect(file).toContain("useState('08:00')");
      expect(file).toContain("useState('17:00')");
      expect(file).toContain('data-testid="work-time-summary"');
      expect(file).toContain('{workStartTime} → {workEndTime}');
      expect(file).toContain("timeExpanded ? 'Tutup' : 'Ubah'");
    }
    expect(css).toContain('native picker only on Ubah');
  });

  it('keeps post-save confirmation stable, visible and action-oriented until the user chooses', () => {
    expect(postSave).toContain('Disimpan');
    expect(postSave).toContain('Kena boh! Ngamsoi.');
    expect(postSave).toContain('Tunjuk Rekod');
    expect(postSave).toContain('Tambah Aktiviti');
    expect(postSave).toContain('ng-post-save__action--primary');
    expect(postSave).toContain('ng-post-save__action--secondary');
    expect(catat).not.toContain('softReset');
    expect(catat).not.toContain('window.setTimeout');
    expect(aktiviti).not.toContain('finishAndReturn');
    expect(aktiviti).not.toContain('window.setTimeout');
    expect(catat).toContain("throw new Error('ID Buku Harian tidak dapat ditentukan.')");
    expect(catat).not.toContain(': activityId;');
    expect(catat).toContain('setWeather({ ...EMPTY_WEATHER_EVIDENCE })');
    expect(catat).toContain('window.requestAnimationFrame');
  });

  it('routes post-save actions through the existing workspace rather than redesigning REKOD', () => {
    expect(workspace).toContain("const showRecords = useCallback(() => navigateToTab('RECORDS')");
    expect(workspace).toContain("const startNewObservation = useCallback(() => navigateToTab('NEW')");
    expect(workspace).toContain('<DiaryManagementList />');
    expect(workspace).toContain('<CatatEntryForm onShowRecords={showRecords} />');
    expect(workspace).toContain('onAddActivity={startNewObservation}');
  });

  it('keeps one PEKERJA authority with TRE suggestions, observed B/BB/A rows and the hardhat glyph', () => {
    expect(workforce).toContain('<div className="ng-entry-heading">PEKERJA</div>');
    expect(workforce).toContain('data-testid="tre-trade-suggestions"');
    expect(workforce).toContain("bumi_count: 0, non_bumi_count: 0, foreign_count: 0");
    expect(workforce).toContain('className="ng-workforce__overall-icon"');
    expect(workforce).not.toContain('◒');
    expect(css).toContain('.ng-workforce--smart .ng-workforce__header { display: none !important; }');
    expect(css).toContain('.ng-workforce--smart .ng-workforce__matrix-head strong { display: none !important; }');
  });

  it('keeps official weather binary and visually distinct from forecast', () => {
    expect(weather).toContain('ELOK');
    expect(weather).toContain('HUJAN');
    expect(weather).not.toContain('MENDUNG');
    expect(weather).not.toContain('RIBUT');
    expect(weather).toContain("value.source === 'USER_CONFIRMED' ? 'Disahkan' : 'Manual'");
    expect(forecast).toContain('<small>RAMALAN</small>');
    expect(forecast).not.toContain('title=');
  });

  it('locks medium header to a lighter one-line core strip and preserves phone bottom navigation', () => {
    expect(sealCss).toContain('@media (min-width: 768px) and (max-width: 1199px)');
    expect(sealCss).toContain('grid-template-columns: .78fr .72fr .72fr 1.58fr');
    expect(sealCss).toContain('min-height: 2.05rem !important');
    expect(css).toContain(".ng-project-pulse--f45 .ng-project-weather { display: none !important; }");
    expect(css).toContain('.ng-workspace-nav--desktop.is-overlay-open');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('.ng-workspace-nav--mobile');
    expect(workspace).toContain('data-workspace-nav="desktop"');
    expect(workspace).toContain('data-workspace-nav="mobile"');
    expect(workspace).toContain('data-tooltip={navigationExpanded ? undefined : item.meaning}');
  });

  it('keeps REKOD, print, approval and mark geometry outside the F4.5 visual seal', () => {
    expect(sealCss).not.toMatch(/DiaryManagementList|DiaryDetail|DiaryHistoryTimeline|ngamsoi-mark-svg/);
    expect(catat).not.toMatch(/DailyEntryFeedback|\/print\//);
    expect(aktiviti).not.toMatch(/DailyEntryFeedback|\/print\//);
  });
});
