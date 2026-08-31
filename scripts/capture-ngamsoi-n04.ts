import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n04-ngamsoi');
const MOBILE = { width: 375, height: 812 };

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const baseCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi.css'), 'utf8');
  const workforceCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi-n04.css'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const specimenCss = `
    * { box-sizing: border-box; }
    html, body { margin:0; width:100%; min-height:100%; }
    body { background:var(--ng-graphite-950); color:var(--ng-ivory-100); }
    .shell { min-height:812px; padding:18px 14px 30px; }
    .kicker { margin-bottom:10px; color:var(--ng-grey-500); font:700 8px/1 var(--ng-font-reference); letter-spacing:.12em; }
    .context { margin-bottom:14px; padding-bottom:12px; border-bottom:1px solid var(--ng-rule); }
    .context strong { display:block; font:560 13px/1.25 var(--ng-font-work); }
    .context span { display:block; margin-top:5px; color:var(--ng-established); font:650 8px/1 var(--ng-font-reference); letter-spacing:.08em; }
    .ng-workforce { width:100%; }
    .note { margin-top:16px; color:var(--ng-grey-500); font:600 8px/1.45 var(--ng-font-reference); letter-spacing:.06em; text-transform:uppercase; }
  `;

  const rows = [
    ['General Worker (Pekerja Am)', 8, 1, 14],
    ['Carpenter (Tukang Kayu)', 5, 0, 7],
    ['Bar Bender (Pembengkok Besi)', 4, 1, 6],
    ['Concretor (Tukang Konkrit)', 3, 0, 8],
  ];

  const htmlRows = rows.map(([trade, bumi, nonb, foreign], idx) => {
    const total = Number(bumi) + Number(nonb) + Number(foreign);
    const cell = (label: string, value: number) => `
      <div class="ng-workforce__count-cell"><label>${label}</label><div class="ng-workforce__stepper"><button>−</button><input value="${value}" aria-label="${label}"><button>+</button></div></div>`;
    return `<div class="ng-workforce__row" data-testid="workforce-row-${idx}">
      <div class="ng-workforce__trade"><span>${trade}</span><button class="ng-workforce__remove">×</button></div>
      <div class="ng-workforce__counts">${cell('BUMI', Number(bumi))}${cell('NON-B', Number(nonb))}${cell('FOREIGN', Number(foreign))}</div>
      <div class="ng-workforce__row-total"><span>Σ</span><strong>${total}</strong></div>
    </div>`;
  }).join('');

  const overall = rows.reduce((sum, row) => sum + Number(row[1]) + Number(row[2]) + Number(row[3]), 0);

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}\n${workforceCss}\n${specimenCss}</style></head><body>
    <main class="shell ngamsoi-shell">
      <div class="kicker">N04 · WORKFORCE REBUILD</div>
      <div class="context"><strong>Kerja konkrit rasuk aras bawah · Zon B</strong><span>RECORD LOADED · MSP UID 184</span></div>
      <section class="ng-workforce" aria-label="Bahagian Tenaga Kerja Tapak">
        <header class="ng-workforce__header">
          <div><div class="ng-workforce__kicker">WORKFORCE / SITE ROSTER</div><h3 class="ng-workforce__title">Tenaga Kerja di Tapak</h3><p class="ng-workforce__hint">Pecahan pekerja mengikut tred dan kerakyatan</p></div>
          <div class="ng-workforce__overall"><span>JUMLAH</span><strong>${overall}</strong><small>ORANG</small></div>
        </header>
        <div class="ng-workforce__matrix-head"><span>TRED</span><span>BUMI</span><span>NON-B</span><span>FOREIGN</span><span>Σ</span></div>
        <div class="ng-workforce__rows">${htmlRows}</div>
        <div class="ng-workforce__add"><div class="ng-workforce__add-title">ADD TRADE</div><select><option>Pilih dari katalog tred piawai</option></select><div class="ng-workforce__custom-add"><input placeholder="Atau taip nama tred khusus..."><button>+ TAMBAH</button></div></div>
      </section>
      <div class="note">Flat roster rhythm · direct comparison across classifications · zero nested cards</div>
    </main>
  </body></html>`, { waitUntil: 'load' });

  await expect(page.getByText('WORKFORCE / SITE ROSTER', { exact: true })).toBeVisible();
  await expect(page.getByText(String(overall), { exact: true })).toBeVisible();

  const metrics = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('.ng-workforce__row');
    const stepper = document.querySelector<HTMLElement>('.ng-workforce__stepper');
    const input = document.querySelector<HTMLInputElement>('.ng-workforce__stepper input');
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      rowRadius: row ? getComputedStyle(row).borderRadius : '',
      stepperRadius: stepper ? getComputedStyle(stepper).borderRadius : '',
      inputRadius: input ? getComputedStyle(input).borderRadius : '',
      rowHeight: row?.getBoundingClientRect().height ?? 0,
      inputHeight: input?.getBoundingClientRect().height ?? 0,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.rowRadius).toBe('0px');
  expect(metrics.stepperRadius).toBe('0px');
  expect(metrics.inputRadius).toBe('0px');
  expect(metrics.rowHeight).toBeLessThan(90);
  expect(metrics.inputHeight).toBeGreaterThanOrEqual(40);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n04-workforce-375x812.png') });
  console.log(`N04 gate captured ${metrics.viewportWidth}px row=${metrics.rowHeight.toFixed(1)} input=${metrics.inputHeight.toFixed(1)}`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
