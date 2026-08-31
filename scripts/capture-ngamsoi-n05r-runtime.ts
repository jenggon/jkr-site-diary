import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n05r-ngamsoi');
const MOBILE = { width: 390, height: 844 };
const BASE_URL = process.env.N05R_BASE_URL ?? 'http://127.0.0.1:3000';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  try {
    // Default empty API response keeps unrelated startup reads deterministic.
    await page.route('**/api/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.route('**/api/vo-items**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    });

    await page.route(`**/api/task/revision/${REVISION_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              task_id: TASK_ID,
              programme_id: PROGRAMME_ID,
              revision_id: REVISION_ID,
              task_uid: 184,
              task_guid: null,
              wbs: '1.2.4',
              task_name: 'Kerja konkrit rasuk aras bawah · Zon B',
              parent_task_uid: 180,
              outline_level: 4,
              outline_number: '1.2.4',
              trade_code: 'CONC',
              trade_name: 'Concrete Works',
              display_order: 184,
              planned_start: '2026-08-28',
              planned_finish: '2026-09-03',
              planned_duration_days: 7,
              is_milestone: false,
              is_critical: true,
              is_summary: false,
              constraint_type: null,
              constraint_date: null,
              created_at: '2026-08-01T00:00:00.000Z',
              created_by: 'visual-gate',
            },
          ],
        }),
      });
    });

    await page.route(`**/api/programme/${PROGRAMME_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            programmeId: PROGRAMME_ID,
            programmeCode: 'FPTV UPSI',
            programmeName: 'Projek FPTV UPSI (Tawaran Semula)',
          },
        }),
      });
    });

    await page.route('**/api/project-summary**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          revision_id: REVISION_ID,
          task_name: 'Projek FPTV UPSI (Tawaran Semula)',
          start_date: '2026-01-12',
          finish_date: '2027-03-31',
        }),
      });
    });

    await page.route('**/api/programme?status=Active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: PROGRAMME_ID,
              code: 'FPTV UPSI',
              name: 'Projek FPTV UPSI (Tawaran Semula)',
              contractorName: 'Kontraktor Utama',
              employerName: 'JKR',
            },
          ],
        }),
      });
    });

    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Projek FPTV UPSI (Tawaran Semula)').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Laporan Baharu' }).click();
    await expect(page.getByText('Pilih Sumber Aktiviti Harian')).toBeVisible();
    await expect(page.getByText('Kerja konkrit rasuk aras bawah · Zon B')).toBeVisible();
    await page.getByText('Kerja konkrit rasuk aras bawah · Zon B').click();
    await expect(page.locator('.mobile-entry-selected-source')).toBeVisible();

    const location = page.getByPlaceholder('cth: Aras 2, Blok Pentadbiran, Grid 4-8');
    await location.fill('Zon B · Grid C4–C8');
    await location.focus();

    const topMetrics = await page.evaluate(() => {
      const root = document.documentElement;
      const form = document.querySelector<HTMLElement>('form[aria-label="Borang Buku Harian Tapak"]')!;
      const selected = document.querySelector<HTMLElement>('.mobile-entry-selected-source')!;
      const sourceBefore = getComputedStyle(selected, '::before');
      const sourceAfter = getComputedStyle(selected, '::after');
      const firstSection = form.querySelector<HTMLElement>(':scope > section')!;
      const firstMarker = getComputedStyle(firstSection, '::before');
      const firstTick = getComputedStyle(firstSection, '::after');
      const rail = getComputedStyle(form, '::before');
      return {
        viewportWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        source: {
          label: sourceBefore.content.replaceAll('"', ''),
          labelWidth: parseFloat(sourceBefore.width),
          labelHeight: parseFloat(sourceBefore.height),
          labelBackground: sourceBefore.backgroundColor,
          labelWhiteSpace: sourceBefore.whiteSpace,
          notchRight: sourceAfter.right,
          notchWidth: parseFloat(sourceAfter.width),
        },
        ledger: {
          borderRadius: getComputedStyle(firstSection).borderRadius,
          borderLeftWidth: getComputedStyle(firstSection).borderLeftWidth,
          borderBottomWidth: getComputedStyle(firstSection).borderBottomWidth,
          markerClip: firstMarker.clipPath,
          tickHeight: firstTick.height,
          railWidth: rail.width,
        },
      };
    });

    expect(topMetrics.scrollWidth).toBeLessThanOrEqual(topMetrics.viewportWidth);
    expect(topMetrics.source.label).toBe('RECORD LOADED');
    expect(topMetrics.source.labelWidth).toBeGreaterThan(60);
    expect(topMetrics.source.labelHeight).toBeLessThan(20);
    expect(topMetrics.source.labelBackground).toBe('rgba(0, 0, 0, 0)');
    expect(topMetrics.source.labelWhiteSpace).toBe('nowrap');
    expect(topMetrics.source.notchRight).toBe('0px');
    expect(topMetrics.source.notchWidth).toBeGreaterThan(20);
    expect(topMetrics.ledger.borderRadius).toBe('0px');
    expect(topMetrics.ledger.borderLeftWidth).toBe('0px');
    expect(parseFloat(topMetrics.ledger.borderBottomWidth)).toBeGreaterThanOrEqual(1);
    expect(topMetrics.ledger.markerClip).toContain('polygon');
    expect(parseFloat(topMetrics.ledger.tickHeight)).toBeGreaterThanOrEqual(2);
    expect(parseFloat(topMetrics.ledger.railWidth)).toBeGreaterThanOrEqual(2);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r-live-new-entry-top-390x844.png'),
      fullPage: false,
    });

    const workforce = page.locator('.ng-workforce');
    await workforce.scrollIntoViewIfNeeded();
    const firstAddButton = workforce.getByRole('button', { name: /Tambah 1 Bumiputera/i }).first();
    await firstAddButton.click();
    await firstAddButton.click();
    await firstAddButton.click();
    await expect(workforce.getByTestId('overall-workforce-total')).toHaveText('3');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r-live-new-entry-workforce-390x844.png'),
      fullPage: false,
    });

    console.log(
      `N05R live runtime gate captured ${MOBILE.width}x${MOBILE.height}: actual /site-diary route, selected-source pseudo reset, integrated ledger + NGAM datum, workforce state`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
