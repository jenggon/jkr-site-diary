import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n03-ngamsoi');
const MOBILE = { width: 375, height: 812 };

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const identityCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi.css'), 'utf8');
  const fieldCss = await readFile(path.join(process.cwd(), 'src', 'app', 'ngamsoi-n03.css'), 'utf8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const specimenCss = `
    * { box-sizing: border-box; }
    html, body { margin:0; width:100%; min-height:100%; }
    body { color:var(--ng-ivory-100); background:var(--ng-graphite-950); }
    .shell { min-height:812px; padding:0 16px 30px; }
    .top { height:56px; margin:0 -16px; padding:0 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--ng-rule); }
    .brand { font:620 12px/1 var(--ng-font-brand); letter-spacing:.16em; }
    .brand b { color:var(--ng-current); }
    .authority { margin:0 -16px 18px; padding:9px 16px 10px; border-bottom:1px solid var(--ng-rule); background:var(--ng-graphite-925); }
    .authority .ref { font:650 8px/1 var(--ng-font-reference); letter-spacing:.09em; color:var(--ng-grey-500); }
    .authority .name { margin-top:6px; font:520 13px/1.25 var(--ng-font-work); }
    .record { margin-bottom:16px; border-top:1px solid var(--ng-rule); border-bottom:1px solid var(--ng-rule); padding:11px 12px 12px 15px; box-shadow:inset 3px 0 0 var(--ng-current); background:var(--ng-graphite-925); }
    .record .ref { color:var(--ng-current); font:700 8px/1 var(--ng-font-reference); letter-spacing:.12em; }
    .record .title { margin-top:8px; font:520 13px/1.3 var(--ng-font-work); }
    form { display:block; }
    form > section { margin-bottom:12px; }
    .fieldgrid { display:grid; gap:10px; }
    .fieldgrid.two { grid-template-columns:1fr 1fr; }
    label { display:block; }
    input, select, textarea { width:100%; }
    textarea { display:block; }
    .submitwrap { padding-top:2px; }
    button[type=submit] { width:100%; padding:0 14px; }
  `;

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${identityCss}\n${fieldCss}\n${specimenCss}</style></head><body>
    <main class="shell ngamsoi-shell">
      <header class="top"><div class="brand">NGAMSOI <b>▰</b></div><div class="ng-reference-voice">SU</div></header>
      <div class="authority"><div class="ref">FPTV UPSI · SEMAKAN SAH</div><div class="name">Projek FPTV UPSI (Tawaran Semula)</div></div>
      <div class="record"><div class="ref">RECORD LOADED · MSP · UID 184</div><div class="title">Kerja konkrit rasuk aras bawah · Zon B</div></div>
      <form aria-label="Borang Buku Harian Tapak">
        <section>
          <h3><span></span>Tarikh &amp; Status Kerja</h3>
          <div class="fieldgrid two">
            <div><label>Tarikh Laporan Harian *</label><input id="date" type="date" value="2026-08-31"></div>
            <div><label>Status Kemajuan Kerja *</label><select><option>Sedang Laksana</option></select></div>
          </div>
        </section>
        <section>
          <h3><span></span>Maklumat Tapak &amp; Cuaca</h3>
          <div class="fieldgrid">
            <div><label>Lokasi Terperinci / Grid Line *</label><input id="location" type="text" value="Aras bawah · Grid B4–B7"></div>
            <div class="fieldgrid two">
              <div><label>Keadaan Cuaca Utama</label><select><option>ELOK</option></select></div>
              <div><label>Masa Mula Kerja</label><input type="time" value="08:00"></div>
            </div>
          </div>
        </section>
        <section>
          <h3><span></span>Catatan Kemajuan</h3>
          <textarea>Kerja konkrit rasuk diteruskan. Pemeriksaan tetulang selesai sebelum tuangan.</textarea>
        </section>
        <div class="submitwrap"><button type="submit">Hantar &amp; Simpan Buku Harian Tapak</button></div>
      </form>
    </main>
  </body></html>`, { waitUntil: 'load' });

  const location = page.locator('#location');
  await expect(location).toBeVisible();
  await location.focus();

  const metrics = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#location')!;
    const section = document.querySelector<HTMLFormElement>('form[aria-label="Borang Buku Harian Tapak"] > section')!;
    const submit = document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const inputStyle = getComputedStyle(input);
    const sectionStyle = getComputedStyle(section);
    const submitStyle = getComputedStyle(submit);
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      inputRadius: inputStyle.borderRadius,
      inputMinHeight: parseFloat(inputStyle.minHeight),
      inputBoxShadow: inputStyle.boxShadow,
      sectionRadius: sectionStyle.borderRadius,
      submitRadius: submitStyle.borderRadius,
      submitMinHeight: parseFloat(submitStyle.minHeight),
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.inputRadius).toBe('0px');
  expect(metrics.sectionRadius).toBe('0px');
  expect(metrics.submitRadius).toBe('0px');
  expect(metrics.inputMinHeight).toBeGreaterThanOrEqual(44);
  expect(metrics.submitMinHeight).toBeGreaterThanOrEqual(48);
  expect(metrics.inputBoxShadow).not.toBe('none');

  await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n03-field-language-375x812.png'), fullPage: true });
  console.log(`N03 visual gate captured: ${metrics.viewportWidth}px input=${metrics.inputMinHeight}px submit=${metrics.submitMinHeight}px`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
