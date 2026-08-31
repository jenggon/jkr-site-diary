import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n05-ngamsoi');
const MOBILE = { width: 375, height: 812 };

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const baseCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi.css'), 'utf8');
  const workforceCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi-n04.css'), 'utf8');
  const spineCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi-n05.css'), 'utf8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    const specimenCss = `
      * { box-sizing:border-box; }
      html,body { margin:0; width:100%; min-height:100%; }
      body { background:var(--ng-graphite-950); color:var(--ng-ivory-100); font-family:var(--ng-font-work); }
      main { padding:16px 14px 34px; }
      .spec-kicker { color:var(--ng-grey-500); font:700 8px/1 var(--ng-font-reference); letter-spacing:.12em; margin-bottom:10px; }
      form { display:grid; gap:10px; }
      form > section { min-height:96px; padding:14px 12px; border:1px solid var(--ng-rule); border-radius:0; background:var(--ng-graphite-900); }
      h3 { margin:0 0 8px; font-size:13px; font-weight:560; }
      p { margin:0; color:var(--ng-grey-500); font-size:10px; line-height:1.35; }
      input,textarea { width:100%; min-height:42px; margin-top:9px; border:1px solid var(--ng-graphite-650); border-radius:0; background:var(--ng-graphite-925); color:var(--ng-grey-200); padding:0 9px; }
      textarea { padding-top:9px; }
      .mobile-entry-selected-source { margin-top:8px; padding:9px; border:1px solid var(--ng-rule); background:var(--ng-graphite-925); font-size:10px; }
      .state-word { color:var(--ng-grey-400); font:700 7px/1 var(--ng-font-reference); letter-spacing:.08em; }
      .ng-workforce { min-height:96px; }
      .ng-workforce__header { padding:0 0 9px; }
      .ng-workforce__matrix-head,.ng-workforce__rows,.ng-workforce__add { display:none; }
      .ng-workforce__stepper { display:none; }
      .warn { margin-top:8px; padding:8px; border-left:2px solid var(--ng-destructive); background:color-mix(in srgb,var(--ng-destructive) 7%,transparent); color:var(--ng-destructive); font-size:10px; }
    `;

    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}\n${workforceCss}\n${spineCss}\n${specimenCss}</style></head><body>
      <main class="ngamsoi-shell">
        <div class="spec-kicker">N05 · SPINE STATE GRAMMAR</div>
        <form aria-label="Borang Buku Harian Tapak">
          <section id="source">
            <div class="state-word">01 · SOURCE AUTHORITY</div><h3>Sumber Aktiviti</h3><p>Record already loaded from approved MSP revision.</p>
            <div class="mobile-entry-selected-source">RECORD LOADED · MSP UID 184</div>
          </section>
          <section id="dates">
            <div class="state-word">02 · DATE / STATUS</div><h3>Tarikh &amp; Status Kerja</h3><input type="date" value="2026-08-31" />
          </section>
          <section id="site">
            <div class="state-word">03 · FIELD CONTEXT</div><h3>Maklumat Tapak &amp; Cuaca</h3><p>Current working position.</p><input id="location" type="text" required placeholder="Lokasi / Grid Line" />
          </section>
          <section id="workforce" class="ng-workforce">
            <header class="ng-workforce__header"><div><div class="ng-workforce__kicker">WORKFORCE / SITE ROSTER</div><h3 class="ng-workforce__title">Tenaga Kerja di Tapak</h3></div><div class="ng-workforce__overall"><span>JUMLAH</span><strong>0</strong><small>ORANG</small></div></header>
            <div class="ng-workforce__stepper"><button disabled>−</button><input value="0"><button>+</button></div>
            <p>No counts entered yet; this remains the next record section.</p>
          </section>
          <section id="warning">
            <div class="state-word">05 · RECORD NOTE</div><h3>Catatan Kemajuan</h3><p>Explicit validation/server alert overrides the state rail.</p><div class="warn" role="alert">Lokasi tapak perlu dilengkapkan sebelum rekod dihantar.</div><textarea required placeholder="Catatan kemajuan..."></textarea>
          </section>
        </form>
      </main>
    </body></html>`, { waitUntil: 'load' });

    await page.locator('#location').focus();

    const metrics = await page.evaluate(() => {
      const state = (id: string) => {
        const el = document.querySelector<HTMLElement>(id)!;
        return {
          after: getComputedStyle(el, '::after').content.replaceAll('"', ''),
          afterDisplay: getComputedStyle(el, '::after').display,
          beforeBorder: getComputedStyle(el, '::before').borderTopColor,
          marginLeft: getComputedStyle(el).marginLeft,
        };
      };
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        source: state('#source'),
        dates: state('#dates'),
        site: state('#site'),
        workforce: state('#workforce'),
        warning: state('#warning'),
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.source.after).toBe('EST');
    expect(metrics.dates.after).toBe('EST');
    expect(metrics.site.after).toBe('CURRENT');
    expect(metrics.workforce.after).toBe('NEXT');
    expect(metrics.warning.after).toBe('CHECK');

    // Mobile suppresses the tiny written state labels while preserving the colored authority nodes.
    expect(metrics.source.afterDisplay).toBe('none');
    expect(metrics.site.afterDisplay).toBe('none');
    expect(metrics.source.beforeBorder).not.toBe(metrics.workforce.beforeBorder);
    expect(metrics.site.beforeBorder).not.toBe(metrics.workforce.beforeBorder);
    expect(metrics.warning.beforeBorder).not.toBe(metrics.workforce.beforeBorder);
    expect(parseFloat(metrics.site.marginLeft)).toBeGreaterThan(0);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n05-spine-states-375x812.png'), fullPage: true });
    console.log(`N05 gate captured ${metrics.viewportWidth}px EST/CURRENT/NEXT/WARNING state nodes with no horizontal overflow`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
