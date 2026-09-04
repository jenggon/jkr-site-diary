import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveRainIntervalSeed } from '@/lib/weather/rainIntervalSeed';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const layout = source('src/app/layout.tsx');
const shell = source('src/app/site-diary/DailyEntryShell.tsx');
const catat = source('src/app/site-diary/CatatEntryForm.tsx');
const aktiviti = source('src/app/site-diary/AktivitiEntryForm.tsx');
const authority = source('src/app/ngamsoi-f45-authority.css');

describe('F4.5 UI authority cutover', () => {
  it('makes one explicit final operational CSS authority and removes component-level project-pulse CSS authority', () => {
    const imports = [...layout.matchAll(/import "\.\/([^\"]+\.css)";/g)].map((match) => match[1]);
    const f45Imports = imports.filter((name) => name.startsWith('ngamsoi-f45-'));
    expect(imports.at(-1)).toBe('ngamsoi-f45-authority.css');
    expect(f45Imports).toEqual(['ngamsoi-f45-authority.css']);
    expect(authority).toContain('F4.5 UI AUTHORITY — CONSOLIDATED RUNTIME OWNER');
    expect(authority).not.toMatch(/@import[^;]*ngamsoi-f45-/i);
    expect(shell).not.toContain('<style jsx global>');
  });

  it('cuts CATAT and AKTIVITI away from retired direct-section Spine selectors', () => {
    for (const file of [catat, aktiviti]) {
      expect(file).toContain('data-ui-authority="F45"');
      expect(file).not.toMatch(/<section className="ng-entry-step/);
      expect(file.match(/<div[^>]+data-entry-step=/g)?.length).toBe(7);
    }
    expect(authority).toContain("form[data-ui-authority='F45'][aria-label='Borang Buku Harian Tapak'] > .ng-entry-step[data-entry-step]");
    expect(authority).toContain('z-index: auto !important;');
    expect(authority).toContain('isolation: auto !important;');
  });

  it('owns a single mathematical Spine axis and explicit CI-green completion state', () => {
    expect(authority).toContain('--ng-spine-x: .56rem;');
    expect(authority).toContain('--ng-step-offset: 1.35rem;');
    expect(authority).toContain('left: calc(var(--ng-spine-x) - var(--ng-step-offset) - .38rem) !important;');
    expect(authority).toContain("[data-spine-state='complete']::before");
    expect(authority).toContain("var(--ng-f45-success, #3fb950)");
    expect(authority).toContain('> .ng-entry-step[data-entry-step]::after');
    expect(authority).toContain('content: none !important;');
  });

  it('gives VO dialog and toast explicit layer authority independent of entry-step wrapper shape', () => {
    expect(authority).toContain('--ng-layer-dialog: 240;');
    expect(authority).toContain('.ng-vo-dialog-backdrop');
    expect(authority).toContain('position: fixed !important;');
    expect(authority).toContain('z-index: var(--ng-layer-dialog) !important;');
    expect(authority).toContain('--ng-layer-toast: 260;');
  });

  it('keeps the project strip to four core facts and demotes forecast loading/unavailable states', () => {
    expect(authority).toContain('grid-template-columns: .78fr .72fr .72fr minmax(13.5rem, 1.58fr) !important;');
    expect(authority).toContain(".ng-project-weather[data-weather-state='loading']");
    expect(authority).toContain(".ng-project-weather[data-weather-state='unavailable']");
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