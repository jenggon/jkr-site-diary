import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveRainIntervalSeed } from '@/lib/weather/rainIntervalSeed';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const layout = source('src/app/layout.tsx');
const shell = source('src/app/site-diary/DailyEntryShell.tsx');
const catat = source('src/app/site-diary/CatatEntryForm.tsx');
const aktiviti = source('src/app/site-diary/AktivitiEntryForm.tsx');
const authority = source('src/app/ngamsoi-f45-authority.css');
const postPhysical = source('src/app/ngamsoi-f45-post-physical.css');
const observer = source('src/app/site-diary/F45SpineGeometryObserver.tsx');
const postSave = source('src/app/site-diary/PostSaveConfirmation.tsx');
const forecast = source('src/app/site-diary/ProjectWeatherPulse.tsx');

describe('F4.5 UI authority cutover', () => {
  it('keeps one explicit F4.5 layout entrypoint and one bounded post-physical owner', () => {
    const imports = [...layout.matchAll(/import "\.\/([^\"]+\.css)";/g)].flatMap((match) => match[1] ? [match[1]] : []);
    const f45Imports = imports.filter((name) => name.startsWith('ngamsoi-f45-'));
    expect(imports.at(-1)).toBe('ngamsoi-f45-post-physical.css');
    expect(f45Imports).toEqual(['ngamsoi-f45-post-physical.css']);
    expect(postPhysical).toContain('@import "./ngamsoi-f45-authority.css";');
    expect(postPhysical.match(/@import/g)?.length).toBe(1);
    expect(authority).toContain('F4.5 UI AUTHORITY — CONSOLIDATED RUNTIME OWNER');
    expect(authority).not.toMatch(/@import[^;]*ngamsoi-f45-/i);
    expect(shell).not.toContain('<style jsx global>');
  });

  it('keeps CATAT and AKTIVITI on the locked direct-step DOM contract', () => {
    for (const file of [catat, aktiviti]) {
      expect(file).toContain('data-ui-authority="F45"');
      expect(file).not.toMatch(/<section className="ng-entry-step/);
      expect(file.match(/<div[^>]+data-entry-step=/g)?.length).toBe(7);
    }
    expect(authority).toContain("form[data-ui-authority='F45'][aria-label='Borang Buku Harian Tapak'] > .ng-entry-step[data-entry-step]");
    expect(authority).toContain('z-index: auto !important;');
    expect(authority).toContain('isolation: auto !important;');
  });

  it('upgrades the Spine from fixed Y offsets to measured semantic anchors without changing state authority', () => {
    expect(observer).toContain("const STEP_KEYS = ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save'] as const;");
    expect(observer).toContain("form.style.setProperty('--ng-spine-rail-top'");
    expect(observer).toContain("form.style.setProperty('--ng-spine-rail-height'");
    expect(observer).toContain("step.style.setProperty('--ng-spine-node-y'");
    expect(postPhysical).toContain("[data-spine-geometry='measured']::before");
    expect(postPhysical).toContain('top: var(--ng-spine-rail-top) !important;');
    expect(postPhysical).toContain('height: var(--ng-spine-rail-height) !important;');
    expect(postPhysical).toContain('top: calc(var(--ng-spine-node-y) - .38rem) !important;');
    expect(authority).toContain("[data-spine-state='complete']::before");
    expect(authority).toContain("var(--ng-f45-success, #3fb950)");
  });

  it('uses a dismissible Completion Seal while keeping the completed SIMPAN checkpoint', () => {
    expect(postSave).toContain('ng-vo-dialog-backdrop ng-post-save-backdrop');
    expect(postSave).toContain('ng-vo-dialog ng-post-save ng-completion-seal');
    expect(postSave).toContain('role="dialog"');
    expect(postSave).toContain('aria-modal="true"');
    expect(postSave).toContain('data-spine-state="complete"');
    expect(postSave).toContain('data-testid="post-save-close"');
    expect(postSave).toContain('ng-completion-seal__node');
    expect(postSave).toContain('setDismissed(true)');
    expect(postPhysical).toContain('z-index: var(--ng-layer-toast, 260) !important;');
    expect(postPhysical).toContain('.ng-completion-seal__node');
    expect(postPhysical).toContain('border-radius: 50% !important;');
  });

  it('locks exactly four dashboard facts with forecast as the fourth peer fact', () => {
    expect(shell).toContain('data-dashboard-facts="4"');
    expect(shell).toContain('data-pulse="programme"');
    expect(shell).toContain('data-pulse="remaining"');
    expect(shell).toContain('data-pulse="now"');
    expect(shell).not.toContain('data-pulse="day"');
    expect(forecast).toContain('data-pulse="forecast"');
    expect(forecast).toContain('<small>RAMALAN CUACA</small>');
    expect(postPhysical).toContain('grid-template-columns: repeat(4, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain(".ng-project-weather[data-pulse='forecast']");
    expect(postPhysical).not.toContain("grid-column: 1 / -1 !important;");
    expect(postPhysical).not.toMatch(/\.ng-project-weather[^\{]*\{[^\}]*display:\s*none\s*!important/s);
  });

  it('keeps user-facing executor and Actual Start copy deterministic without changing stored scope values', () => {
    for (const file of [catat, aktiviti]) {
      expect(file).toContain('<label>PELAKSANA</label>');
      expect(file).toContain('<option value="CONTRACTOR">Kontraktor Utama</option>');
      expect(file).toContain('<option value="NSC">NSC</option>');
      expect(file).toContain('contractor_scope: contractorScope');
      expect(file).toContain('Tarikh sebenar kerja mula di tapak.');
      expect(file).not.toContain('Bukan tarikh MSP.');
      expect(file).not.toContain('>Mula + Siap<');
    }
    expect(catat).toContain('ng-entry-heading ng-source-section-heading">SUMBER');
    expect(postPhysical).toContain('COPY-001: SUMBER USES THE SHARED SUB-HEADER GRAMMAR');
  });

  it('seeds same-day rain from the Kuala Lumpur tap hour, then skips occupied buckets', () => {
    const now = new Date('2026-09-04T07:37:00.000Z'); // 15:37 Asia/Kuala_Lumpur
    expect(resolveRainIntervalSeed({ date: '2026-09-04', existingIntervals: [], now })).toEqual({ start: '15:00', end: '16:00' });
    expect(resolveRainIntervalSeed({ date: '2026-09-04', existingIntervals: [{ start: '15:00', end: '16:00' }], now })).toEqual({ start: '16:00', end: '17:00' });
  });

  it('handles 23:xx as 23:00–24:00 and prefers historical provider evidence', () => {
    const late = new Date('2026-09-04T15:20:00.000Z'); // 23:20 Asia/Kuala_Lumpur
    expect(resolveRainIntervalSeed({ date: '2026-09-04', existingIntervals: [], now: late })).toEqual({ start: '23:00', end: '24:00' });

    expect(resolveRainIntervalSeed({
      date: '2026-09-03',
      existingIntervals: [{ start: '10:00', end: '11:00' }],
      suggestedIntervals: [{ start: '10:00', end: '12:00' }],
      now: late,
    })).toEqual({ start: '11:00', end: '12:00' });
  });
});
