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

describe('F4.5 UI authority cutover', () => {
  it('keeps one explicit F4.5 layout entrypoint and a bounded post-physical remediation owner', () => {
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

  it('uses the accepted VO/APK family for a focused persistent completion dialog', () => {
    expect(postSave).toContain('ng-vo-dialog-backdrop ng-post-save-backdrop');
    expect(postSave).toContain('ng-vo-dialog ng-post-save');
    expect(postSave).toContain('role="dialog"');
    expect(postSave).toContain('aria-modal="true"');
    expect(postSave).toContain('data-spine-state="complete"');
    expect(postPhysical).toContain('z-index: var(--ng-layer-toast, 260) !important;');
    expect(postPhysical).toContain('border-radius: 0 !important;');
  });

  it('turns the project strip into a connected Tactical Pulse and keeps forecast visible but secondary', () => {
    expect(postPhysical).toContain("grid-template-columns: .78fr .72fr .72fr minmax(13.5rem, 1.62fr) minmax(9rem, .82fr) !important;");
    expect(postPhysical).toContain('box-shadow: inset 0 2px 0 color-mix');
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='loading']");
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='unavailable']");
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='dry']");
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='rain']");
    expect(postPhysical).not.toMatch(/\.ng-project-weather[^\{]*\{[^\}]*display:\s*none\s*!important/s);
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
