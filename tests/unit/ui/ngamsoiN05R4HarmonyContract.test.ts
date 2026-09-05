import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('N05R.4 NGAMSOI harmony contract with N05R.5 superseding instrumentation', () => {
  it('locks the approved canonical mark geometry across component and app icon', () => {
    const brand = read('src/components/brand/NgamsoiBrand.tsx');
    const icon = read('public/ngamsoi-mark.svg');
    const completion = read('src/components/brand/NgamsoiCompletionRitual.tsx');

    for (const source of [brand, icon]) {
      expect(source).toContain('M21 13H43L32 28Z');
      expect(source).toContain('M11 43H27L32 38L37 43H53');
      expect(source).not.toContain('M32 28V51');
      expect(source).not.toContain('M32 31V51');
    }

    expect(completion).toContain("import { NgamsoiMark } from './NgamsoiBrand'");
    expect(completion).toContain('<NgamsoiMark className="ng-completion__mark" />');
    expect(completion).not.toContain('ng-completion__check');
  });

  it('loads the harmony grammar after all legacy NGAMSOI presentation layers', () => {
    const layout = read('src/app/layout.tsx');
    const liveReview = layout.indexOf('ngamsoi-live-review.css');
    const harmony = layout.indexOf('ngamsoi-harmony.css');
    const harmonyHeader = layout.indexOf('ngamsoi-harmony-header.css');

    expect(liveReview).toBeGreaterThan(-1);
    expect(harmony).toBeGreaterThan(liveReview);
    expect(harmonyHeader).toBeGreaterThan(harmony);
  });

  it('retires textual spine labels and keeps circular state nodes', () => {
    const harmony = read('src/app/ngamsoi-harmony.css');

    expect(harmony).toContain('border-radius: 50% !important');
    expect(harmony).toContain('content: none !important');
    expect(harmony).toContain('N05 legacy NEXT / EST / CURRENT / CHECK words are retired');
  });

  it('keeps one visible workforce heading and makes total a first-class column', () => {
    const harmony = read('src/app/ngamsoi-harmony.css').replace(/\r\n/g, '\n');

    expect(harmony).toContain('.ng-workforce__kicker,\n.ng-workforce__hint');
    expect(harmony).toContain('display: none !important');
    expect(harmony).toContain('grid-template-columns: 44% 12% 12% 12% 20% !important');
    expect(harmony).toContain('grid-template-columns: 44% 36% 20% !important');
    expect(harmony).toContain('.ng-workforce__overall-icon');
  });

  it('keeps exactly four R2 project facts with forecast as the fourth fact in the shared frame', () => {
    const shell = read('src/app/site-diary/DailyEntryShell.tsx');
    const forecast = read('src/app/site-diary/ProjectWeatherPulse.tsx');
    const layout = read('src/app/layout.tsx');
    const postPhysical = read('src/app/ngamsoi-f45-post-physical.css');

    expect(shell).toContain('ng-project-pulse');
    expect(shell).toContain('data-dashboard-facts="4"');
    expect(shell).toContain('<small>PROGRAM KERJA</small>');
    expect(shell).toContain('<small>TINGGAL</small>');
    expect(shell).not.toContain('<small>HARI KE</small>');
    expect(shell).toContain('<small>SEMASA</small>');
    expect(shell).toContain('<ProjectWeatherPulse />');
    expect(forecast).toContain('<small>RAMALAN CUACA</small>');
    expect(forecast).toContain('data-pulse="forecast"');
    expect(shell).toContain('pulse.remainingDays');
    expect(shell).toContain('HARI · SIAP');
    expect(shell).toContain('formatDeviceDate(now)');
    expect(shell).toContain('formatClock(now)');
    expect(shell).not.toContain('<style jsx global>');

    expect(layout.indexOf('ngamsoi-f45-post-physical.css')).toBeGreaterThan(layout.indexOf('ngamsoi-n07-navigation.css'));
    expect(postPhysical).toContain('grid-template-columns: repeat(4, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important;');
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='loading']");
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='unavailable']");
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='dry']");
    expect(postPhysical).toContain(".ng-project-weather[data-weather-state='rain']");
    expect(postPhysical).not.toMatch(/\.ng-project-weather[^\{]*\{[^\}]*display:\s*none\s*!important/s);
  });
});
