import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const shell = source('src/app/site-diary/DailyEntryShell.tsx');
const catat = source('src/app/site-diary/CatatEntryForm.tsx');
const aktiviti = source('src/app/site-diary/AktivitiEntryForm.tsx');
const sourceSelector = source('src/app/site-diary/OperationalSourceSelector.tsx');
const sourcePresentation = source('src/app/site-diary/sourcePresentation.ts');
const workspace = source('src/app/site-diary/SiteDiaryWorkspace.tsx');
const postSave = source('src/app/site-diary/PostSaveConfirmation.tsx');
const workforce = source('src/app/site-diary/SmartWorkforceEntry.tsx');
const spineObserver = source('src/app/site-diary/F45SpineGeometryObserver.tsx');
const weather = source('src/app/site-diary/WeatherEvidenceSection.tsx');
const forecast = source('src/app/site-diary/ProjectWeatherPulse.tsx');
const authority = source('src/app/ngamsoi-f45-authority.css');
const postPhysical = source('src/app/ngamsoi-f45-post-physical.css');
const layout = source('src/app/layout.tsx');

describe('F4.5 final NGAMSOI visual reconciliation', () => {
  it('loads one F4.5 layout entrypoint after N07 and keeps the consolidated authority as its baseline', () => {
    const imports = [...layout.matchAll(/import "\.\/([^\"]+\.css)";/g)].flatMap((match) => match[1] ? [match[1]] : []);
    const f45Imports = imports.filter((name) => name.startsWith('ngamsoi-f45-'));
    expect(imports.at(-1)).toBe('ngamsoi-f45-post-physical.css');
    expect(f45Imports).toEqual(['ngamsoi-f45-post-physical.css']);
    expect(postPhysical).toContain('@import "./ngamsoi-f45-authority.css";');
    expect(authority).toContain('F4.5 UI AUTHORITY — CONSOLIDATED RUNTIME OWNER');
    expect(authority).toContain('--ng-f45-radius: 0;');
    expect(authority).toContain('--ng-f45-radius-small: 0;');
  });

  it('uses explicit semantic Spine states in the locked operational order and measured semantic anchors', () => {
    for (const file of [catat, aktiviti]) {
      for (const step of ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save']) {
        expect(file).toContain(`data-entry-step=\"${step}\"`);
      }
      expect(file).toContain('data-spine-state={stateFor(');
    }
    expect(catat).toContain('<div className="ng-entry-heading ng-source-section-heading">SUMBER</div>');
    expect(aktiviti).toContain('<div className="ng-entry-heading">SUMBER</div>');
    expect(authority).toContain("[data-spine-state='complete']");
    expect(authority).toContain("[data-spine-state='current']");
    expect(authority).toContain("[data-spine-state='upcoming']");
    expect(spineObserver).toContain("const STEP_KEYS = ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save'] as const;");
    expect(spineObserver).toContain("'.ng-save-action, .ng-save-complete-marker, .ng-saved-receipt'");
    expect(spineObserver).toContain("form.style.setProperty('--ng-spine-rail-top'");
    expect(spineObserver).toContain("form.style.setProperty('--ng-spine-rail-height'");
    expect(postPhysical).toContain("[data-spine-geometry='measured']::before");
    expect(postPhysical).toContain('top: calc(var(--ng-spine-node-y) - .38rem) !important;');
    expect(postPhysical).toContain('height: var(--ng-spine-rail-height) !important;');
    expect(authority).toContain('--ng-f45-success: #3fb950');
  });

  it('keeps normal working hours at 08:00 to 17:00 and surfaces a 24-hour product summary', () => {
    for (const file of [catat, aktiviti]) {
      expect(file).toContain("useState('08:00')");
      expect(file).toContain("useState('17:00')");
      expect(file).toContain('data-testid="work-time-summary"');
      expect(file).toContain('{workStartTime} → {workEndTime}');
      expect(file).toContain("timeExpanded ? 'Tutup' : 'Ubah'");
    }
    expect(authority).toContain('native picker only on Ubah');
  });

  it('uses concise field-language copy and discoverable same-day semantics without changing lifecycle or executor persistence', () => {
    for (const file of [catat, aktiviti]) {
      expect(file).toContain('<label>PELAKSANA</label>');
      expect(file).toContain('<option value="CONTRACTOR">Kontraktor Utama</option>');
      expect(file).toContain('<option value="NSC">NSC</option>');
      expect(file).toContain('contractor_scope: contractorScope');
      expect(file).not.toContain('Bukan tarikh MSP.');
      expect(file).not.toContain('>Mula + Siap<');
      expect(file).toContain("'MULA_DAN_SIAP'");
    }
    expect(catat).toContain('Tarikh kerja mula di tapak.');
    expect(catat).not.toContain('Tarikh sebenar kerja mula di tapak.');
    expect(catat).toContain('Boleh pilih MULA + SIAP jika kerja mula dan siap hari ini.');
    expect(catat).toContain('className="ng-daily-status__hint"');
  });

  it('keeps one visible SUMBER hierarchy while presenting field-language source labels over unchanged MSP/VO semantics', () => {
    expect(catat).toContain('ng-source-section-heading">SUMBER');
    expect(sourceSelector).not.toContain('Sumber Aktiviti');
    expect(sourceSelector).not.toContain('>Sumber<');
    expect(sourcePresentation).toContain("MSP: 'Skop Kontrak'");
    expect(sourcePresentation).toContain("VO: 'Perubahan Skop (VO)'");
    expect(sourceSelector).toContain('operationalSourceLabel');
    expect(sourceSelector).not.toContain('VO / APK');
    expect(sourceSelector).not.toContain('Jadual MSP');
    expect(catat).toContain('max={todayIso()}');
    expect(catat).toContain('data-date-authority="HARIAN"');
    expect(postPhysical).toContain('ONE OUTER SUMBER HIERARCHY');
    expect(postPhysical).toContain('h3::after');
    expect(postPhysical).toContain('content: none !important;');
  });

  it('promotes post-save confirmation to a Completion Seal and a deterministic saved receipt without changing identity authority', () => {
    expect(postSave).toContain('role="dialog"');
    expect(postSave).toContain('aria-modal="true"');
    expect(postSave).toContain('ng-vo-dialog ng-post-save ng-completion-seal');
    expect(postSave).toContain('ng-completion-seal__node');
    expect(postSave).toContain('data-testid="post-save-close"');
    expect(postSave).toContain('Tutup pengesahan simpan');
    expect(postSave).toContain('data-testid="post-save-receipt"');
    expect(postSave).toContain('data-testid="post-save-receipt-show-records"');
    expect(postSave).toContain('data-testid="post-save-receipt-add-activity"');
    expect(postSave).toContain('ng-dialog-close ng-completion-seal__close');
    expect(postSave).toContain('Disimpan');
    expect(postSave).toContain('Kena boh! Ngamsoi.');
    expect(postSave).toContain('Tunjuk Rekod');
    expect(postSave).toContain('Tambah Aktiviti');
    expect(postSave).toContain('data-entry-step="save"');
    expect(postSave).toContain('data-spine-state="complete"');
    expect(postSave).toContain('focus({ preventScroll: true })');
    expect(postSave).toContain("if (event.key === 'Escape')");
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
    expect(workforce).toContain('<F45SpineGeometryObserver />');
    expect(workforce).not.toContain('◒');
    expect(authority).toContain('.ng-workforce--smart .ng-workforce__header { display: none !important; }');
    expect(authority).toContain('.ng-workforce--smart .ng-workforce__matrix-head strong { display: none !important; }');
  });

  it('keeps official weather binary while removing redundant manual copy and preserving deterministic forecast separation', () => {
    expect(weather).toContain('ELOK');
    expect(weather).toContain('HUJAN');
    expect(weather).not.toContain('MENDUNG');
    expect(weather).not.toContain('RIBUT');
    expect(weather).toContain('Cadangan cuaca');
    expect(weather).toContain('Disahkan');
    expect(weather).not.toContain("'Manual'");
    expect(forecast).toContain('<small>RAMALAN CUACA</small>');
    expect(forecast).toContain('data-pulse="forecast"');
    expect(forecast).toContain('data-weather-state="loading"');
    expect(forecast).toContain('data-weather-state="unavailable"');
    expect(forecast).toContain('data-weather-state="rain"');
    expect(forecast).toContain('data-weather-state="dry"');
    expect(forecast).toContain('Ramalan belum tersedia');
    expect(forecast).not.toContain('Tiada data');
    expect(forecast).not.toContain('rainProbability ?? 0');
    expect(forecast).not.toContain('title=');
  });

  it('locks the exact four-fact dashboard with no duplicate programme label and completion-only green', () => {
    expect(shell).toContain('data-dashboard-facts="4"');
    expect(shell).toContain('data-pulse="programme"');
    expect(shell).toContain('data-pulse="remaining"');
    expect(shell).toContain('data-pulse="now"');
    expect(shell).not.toContain('data-pulse="day"');
    expect(shell).not.toContain('<small>HARI KE</small>');
    expect(shell.match(/<small>PROGRAM KERJA<\/small>/g)?.length).toBe(1);
    expect(shell).toContain('{pulse.remainingDays} HARI · SIAP {formatFinish(finishDate)}');
    expect(postPhysical).toContain('WX-006');
    expect(postPhysical).toContain('VIS-001');
    expect(postPhysical).toContain('grid-template-columns: repeat(4, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain('@media (min-width: 768px) and (max-width: 1199px)');
    expect(postPhysical).toContain('@media (max-width: 767px)');
    expect(postPhysical).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain(".ng-project-weather[data-pulse='forecast']");
    expect(postPhysical).toContain('.ng-project-pulse--f45::before');
    expect(postPhysical).toContain('border-bottom: 0 !important;');
    expect(postPhysical).not.toContain("grid-column: 1 / -1 !important;");
    expect(workspace).toContain('data-workspace-nav="desktop"');
    expect(workspace).toContain('data-workspace-nav="mobile"');
    expect(workspace).toContain('data-tooltip={navigationExpanded ? undefined : item.meaning}');
  });

  it('keeps REKOD, print, approval and mark geometry outside the bounded post-physical authority', () => {
    expect(postPhysical).not.toMatch(/DiaryManagementList|DiaryDetail|DiaryHistoryTimeline|ngamsoi-mark-svg|print_context|approvalRepository|supabase|migration/);
    expect(catat).not.toMatch(/DailyEntryFeedback|\/print\//);
    expect(aktiviti).not.toMatch(/DailyEntryFeedback|\/print\//);
  });
});
