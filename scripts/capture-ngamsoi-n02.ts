import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n02-ngamsoi');
const MOBILE = { width: 375, height: 812 };

const mark = `
<svg aria-hidden="true" class="ngamsoi-mark-svg" viewBox="0 0 96 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 10H78L48 45L18 10Z" stroke="currentColor" stroke-width="7" stroke-linejoin="miter" vector-effect="non-scaling-stroke" />
  <path d="M48 50V71" stroke="currentColor" stroke-width="6" stroke-linecap="square" vector-effect="non-scaling-stroke" />
  <path class="ngamsoi-mark-baseline" d="M17 63H79" stroke="currentColor" stroke-width="6" stroke-linecap="square" vector-effect="non-scaling-stroke" />
</svg>`;

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const identityCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi.css'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const specimenCss = `
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; min-height: 100%; }
    body { color: var(--ng-ivory-100); background: var(--ng-graphite-950); }
    .shell { min-height: 812px; background: var(--ng-graphite-950); }
    .header { height: 56px; display:flex; align-items:center; justify-content:space-between; padding:8px 14px; border-bottom:1px solid var(--ng-rule); background:var(--ng-graphite-950); }
    .brand { display:flex; align-items:center; gap:9px; }
    .brand .ngamsoi-mark-housing { width:34px; height:34px; }
    .brandcopy { display:flex; flex-direction:column; }
    .word { font:620 12px/1 var(--ng-font-brand); letter-spacing:.16em; }
    .tag { margin-top:4px; font:520 8px/1 var(--ng-font-work); color:var(--ng-grey-400); }
    .tag b { color:var(--ng-current); }
    .avatar { width:31px; height:31px; display:grid; place-items:center; border:1px solid var(--ng-graphite-650); border-radius:50%; color:var(--ng-grey-300); background:var(--ng-graphite-850); font:600 9px/1 var(--ng-font-reference); }
    .datum-project-strip { padding:8px 14px; }
    .projectline { display:flex; gap:8px; align-items:center; }
    .projectname { font:520 13px/1.25 var(--ng-font-work); }
    .revisionline { margin-top:7px; display:flex; align-items:center; gap:7px; color:var(--ng-grey-300); font:600 8px/1 var(--ng-font-reference); letter-spacing:.07em; }
    .datum-revision-stamp > span:first-child { display:inline-block; }
    .content { padding:18px 16px 28px; }
    .kicker { margin-bottom:9px; color:var(--ng-grey-500); font:650 8px/1 var(--ng-font-reference); letter-spacing:.12em; text-transform:uppercase; }
    .mobile-entry-selected-source { display:flex; flex-direction:column; gap:10px; }
    .source-main { display:flex; align-items:flex-start; gap:11px; min-width:0; }
    .source-icon { display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
    .source-copy { min-width:0; flex:1; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
    .meta span { text-transform:uppercase; font-weight:700; }
    .source-title { margin:7px 0 0; font-size:14px; line-height:1.3; }
    .source-sub { margin:4px 0 0; font-size:11px; }
    .actions { display:flex; gap:7px; }
    .actions button { padding:7px 10px; font:650 10px/1 var(--ng-font-work); }
    .actions button:first-child { flex:1; }
    .next { margin-top:18px; border-top:1px solid var(--ng-rule); }
    .field { padding:13px 0; border-bottom:1px solid var(--ng-rule); }
    .label { color:var(--ng-grey-500); font:650 8px/1 var(--ng-font-reference); letter-spacing:.1em; text-transform:uppercase; }
    .value { margin-top:7px; color:var(--ng-grey-300); font:500 12px/1.3 var(--ng-font-work); }
  `;

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${identityCss}\n${specimenCss}</style></head><body>
    <main class="shell ngamsoi-shell datum-shell">
      <header class="header ngamsoi-app-header">
        <div class="brand"><span class="ngamsoi-mark-housing">${mark}</span><span class="brandcopy"><span class="word">NGAMSOI</span><span class="tag"><b>Kena boh!</b> Ngamsoi.</span></span></div>
        <div class="avatar">SU</div>
      </header>
      <section class="datum-project-strip">
        <div class="projectline"><span class="datum-project-code">FPTV UPSI</span><span class="projectname">Projek FPTV UPSI (Tawaran Semula)</span></div>
        <div class="revisionline datum-revision-stamp"><span></span><span>SEMAKAN SAH</span><span>·</span><span>SEMAKAN SEMASA</span></div>
      </section>
      <section class="content">
        <div class="kicker">N02 · operational source authority</div>
        <section class="mobile-entry-selected-source" aria-label="Selected operational source">
          <div class="source-main">
            <div class="source-icon">MSP</div>
            <div class="source-copy">
              <div class="meta"><span>Kerja Jadual (MSP)</span><span class="font-mono">UID: 184</span></div>
              <h3 class="source-title">Kerja konkrit rasuk aras bawah · Zon B</h3>
              <p class="source-sub">WBS: 1.2.4 · Struktur Utama</p>
            </div>
          </div>
          <div class="actions"><button type="button">Tukar Sumber</button><button type="button" title="Padam pilihan">×</button></div>
        </section>
        <div class="next">
          <div class="field"><div class="label">Tarikh & Status Kerja</div><div class="value">31 Ogos 2026 · Sedang Laksana</div></div>
          <div class="field"><div class="label">Lokasi / Grid</div><div class="value">Aras bawah · Grid B4–B7</div></div>
          <div class="field"><div class="label">Tapak & Cuaca</div><div class="value">ELOK · 08:00 → 17:00</div></div>
        </div>
      </section>
    </main>
  </body></html>`, { waitUntil: 'load' });

  await expect(page.getByText('RECORD LOADED', { exact: true })).toBeVisible();
  await expect(page.getByText('Kerja konkrit rasuk aras bawah · Zon B', { exact: true })).toBeVisible();

  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportHeight: window.innerHeight,
    loadedTop: document.querySelector('.mobile-entry-selected-source')?.getBoundingClientRect().top ?? 0,
    loadedHeight: document.querySelector('.mobile-entry-selected-source')?.getBoundingClientRect().height ?? 0,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.loadedHeight).toBeGreaterThan(100);
  expect(metrics.loadedTop).toBeLessThan(260);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n02-record-loaded-375x812.png') });
  console.log(`N02 visual gate captured: ${metrics.viewportWidth}x${metrics.viewportHeight}px loadedTop=${metrics.loadedTop.toFixed(1)} loadedHeight=${metrics.loadedHeight.toFixed(1)}`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
