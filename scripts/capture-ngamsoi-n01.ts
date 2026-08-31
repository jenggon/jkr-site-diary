import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n01-ngamsoi');
const MOBILE = { width: 375, height: 812 };

const markSvg = (accentedBaseline: boolean) => `
<svg aria-hidden="true" class="ngamsoi-mark-svg" viewBox="0 0 96 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 10H78L48 45L18 10Z" stroke="currentColor" stroke-width="7" stroke-linejoin="miter" vector-effect="non-scaling-stroke" />
  <path d="M48 50V71" stroke="currentColor" stroke-width="6" stroke-linecap="square" vector-effect="non-scaling-stroke" />
  <path ${accentedBaseline ? 'class="ngamsoi-mark-baseline"' : ''} d="M17 63H79" stroke="currentColor" stroke-width="6" stroke-linecap="square" vector-effect="non-scaling-stroke" />
</svg>`;

const lockup = (compact = false, accentedBaseline = true) => `
<div class="ngamsoi-brand-lockup ${compact ? 'ngamsoi-brand-lockup--compact' : ''}" aria-label="NGAMSOI — Kena boh! Ngamsoi.">
  <span class="ngamsoi-mark-housing">${markSvg(accentedBaseline)}</span>
  <span class="ngamsoi-brand-copy">
    <span class="ngamsoi-wordmark">NGAMSOI</span>
    <span class="ngamsoi-tagline"><span class="ngamsoi-tagline-trigger">Kena boh!</span> <span>Ngamsoi.</span></span>
  </span>
</div>`;

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
    .specimen { width: 375px; min-height: 812px; overflow: hidden; background: linear-gradient(180deg, rgba(255,255,255,.018), transparent 18%), var(--ng-graphite-950); }
    .specimen-header { height: 58px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--ng-rule); background: rgba(8,9,11,.985); }
    .avatar { width: 31px; height: 31px; display: grid; place-items: center; border: 1px solid var(--ng-graphite-650); border-radius: 50%; color: var(--ng-grey-300); background: var(--ng-graphite-850); font: 600 10px/1 var(--ng-font-reference); }
    .authority { min-height: 58px; padding: 9px 14px 10px; border-bottom: 1px solid var(--ng-rule); background: var(--ng-graphite-925); }
    .eyebrow { color: var(--ng-grey-500); font: 600 9px/1.2 var(--ng-font-reference); letter-spacing: .1em; text-transform: uppercase; }
    .project { margin-top: 5px; color: var(--ng-ivory-100); font: 500 13px/1.25 var(--ng-font-work); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .revision { margin-top: 6px; display: inline-flex; align-items: center; gap: 7px; color: var(--ng-grey-300); font: 500 9px/1 var(--ng-font-reference); letter-spacing: .055em; text-transform: uppercase; }
    .revision::before { content: ''; width: 2px; height: 14px; background: var(--ng-established); }
    .body { padding: 20px 16px 26px; }
    .section-kicker { color: var(--ng-grey-500); font: 600 9px/1 var(--ng-font-reference); letter-spacing: .12em; text-transform: uppercase; }
    .hero { margin-top: 12px; padding: 22px 18px 20px; border-top: 1px solid var(--ng-rule); border-bottom: 1px solid var(--ng-rule); background: var(--ng-graphite-925); }
    .hero-mark { display: grid; place-items: center; margin-bottom: 15px; }
    .hero-mark .ngamsoi-mark-housing { width: 74px; height: 59px; }
    .hero .ngamsoi-brand-lockup { width: 100%; justify-content: center; }
    .hero .ngamsoi-brand-copy { align-items: center; }
    .hero .ngamsoi-wordmark { font-size: 1.25rem; letter-spacing: .18em; }
    .hero .ngamsoi-tagline { margin-top: .42rem; font-size: .72rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 17px; }
    .sample { min-height: 100px; padding: 12px; border-top: 1px solid var(--ng-rule); border-bottom: 1px solid var(--ng-rule); background: var(--ng-graphite-900); }
    .sample-title { margin-bottom: 12px; color: var(--ng-grey-500); font: 600 8px/1 var(--ng-font-reference); letter-spacing: .11em; text-transform: uppercase; }
    .sample-mark { width: 52px; height: 42px; color: var(--ng-ivory-100); }
    .sample-mark svg { width: 100%; height: 100%; }
    .type-sample { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--ng-rule); }
    .work { margin-top: 9px; color: var(--ng-ivory-100); font: 480 14px/1.35 var(--ng-font-work); }
    .ref { margin-top: 8px; color: var(--ng-grey-300); font: 500 10px/1.3 var(--ng-font-reference); letter-spacing: .045em; }
    .brand { margin-top: 8px; color: var(--ng-ivory-100); font: 620 12px/1 var(--ng-font-brand); letter-spacing: .14em; text-transform: uppercase; }
    .tokens { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; margin-top: 18px; }
    .token { height: 34px; border: 1px solid var(--ng-graphite-650); position: relative; }
    .token::after { position: absolute; left: 5px; bottom: 4px; color: #fff; font: 600 7px/1 var(--ng-font-reference); letter-spacing: .04em; }
    .token.current { background: var(--ng-current); } .token.current::after { content: 'CURRENT'; }
    .token.established { background: var(--ng-established); } .token.established::after { content: 'LOCKED'; }
    .token.warning { background: var(--ng-warning); } .token.warning::after { content: 'WARN'; }
    .token.error { background: var(--ng-destructive); } .token.error::after { content: 'ERROR'; }
    .baseline-note { margin-top: 15px; color: var(--ng-grey-500); font: 500 9px/1.45 var(--ng-font-reference); letter-spacing: .035em; }
  `;

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${identityCss}\n${specimenCss}</style></head><body>
    <main class="specimen">
      <header class="specimen-header">${lockup(true, true)}<div class="avatar">SU</div></header>
      <section class="authority">
        <div class="eyebrow">FPTV UPSI · ACTIVE PROJECT</div>
        <div class="project">Projek FPTV UPSI (Tawaran Semula)</div>
        <div class="revision">Semakan Sah · Semakan Semasa</div>
      </section>
      <section class="body">
        <div class="section-kicker">N01 · Brand foundation gate</div>
        <div class="hero">
          <div class="hero-mark">${markSvg(true)}</div>
          ${lockup(false, true)}
        </div>
        <div class="row">
          <div class="sample"><div class="sample-title">Monochrome</div><div class="sample-mark">${markSvg(false)}</div></div>
          <div class="sample"><div class="sample-title">Operational</div><div class="sample-mark">${markSvg(true)}</div></div>
        </div>
        <div class="type-sample">
          <div class="sample-title">Typography grammar</div>
          <div class="work">Kerja konkrit aras bawah · Zon B</div>
          <div class="ref">WBS 1.2.4 · UID 000184 · REV 07</div>
          <div class="brand">NGAMSOI / FIELD RECORD</div>
        </div>
        <div class="tokens">
          <div class="token current"></div><div class="token established"></div><div class="token warning"></div><div class="token error"></div>
        </div>
        <div class="baseline-note">GRAPHITE IS HOME · IVORY IS TRUTH · COLOUR ONLY WHEN STATE MATTERS</div>
      </section>
    </main>
  </body></html>`, { waitUntil: 'load' });

  await expect(page.getByLabel('NGAMSOI — Kena boh! Ngamsoi.').first()).toBeVisible();
  await expect(page.getByText('Projek FPTV UPSI (Tawaran Semula)', { exact: true })).toBeVisible();

  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
    wordmark: document.querySelector('.specimen-header .ngamsoi-wordmark')?.getBoundingClientRect().width ?? 0,
    mark: document.querySelector('.specimen-header .ngamsoi-mark-housing')?.getBoundingClientRect().width ?? 0,
  }));

  expect(metrics.scroll).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.wordmark).toBeGreaterThan(65);
  expect(metrics.mark).toBeGreaterThan(30);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n01-brand-gate-375x812.png'), fullPage: true });
  console.log(`N01 visual gate captured: viewport=${metrics.viewport}px wordmark=${metrics.wordmark.toFixed(1)}px mark=${metrics.mark.toFixed(1)}px`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
