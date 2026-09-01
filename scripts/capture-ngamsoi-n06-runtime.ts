import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n06-ngamsoi');
const MOBILE = { width: 390, height: 844 };
const BASE_URL = process.env.N06_BASE_URL ?? 'http://127.0.0.1:3000';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: MOBILE,
    screen: MOBILE,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  try {
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
              wbs: '1.2.4',
              task_name: 'Kerja konkrit rasuk aras bawah · Zon B',
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

    await page.route('**/api/activities', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ data: { activityId: ACTIVITY_ID } }),
      });
    });

    await page.route(`**/api/activities/${ACTIVITY_ID}/start`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { activity_id: ACTIVITY_ID, status: 'In Progress' } }),
      });
    });

    await page.route('**/api/site-diary', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            site_diary_id: SITE_DIARY_ID,
            lastModifiedAt: '2026-09-01T00:00:00.000Z',
          },
        }),
      });
    });

    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Projek FPTV UPSI (Tawaran Semula)').first()).toBeVisible();

    await page.getByRole('tab', { name: 'Baharu' }).click();
    await expect(page.getByRole('heading', { name: 'Sumber' })).toBeVisible();
    await page.getByText('Kerja konkrit rasuk aras bawah · Zon B').click();

    await page.getByPlaceholder('cth: Aras 2, Blok Pentadbiran, Grid 4-8').fill('Zon B · Grid C4–C8');
    await page.getByPlaceholder('Catat kerja').fill('Konkrit rasuk siap tuang mengikut zon kerja.');

    const saveButton = page.getByRole('button', { name: 'Simpan', exact: true });
    await saveButton.scrollIntoViewIfNeeded();
    await expect(saveButton).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n06-01-before-save-390x844.png'),
      fullPage: false,
    });

    await saveButton.click();

    const ritual = page.getByTestId('ngamsoi-completion');
    const signature = ritual.locator('.ng-completion__signature');
    await expect(ritual).toBeVisible();
    await expect(saveButton).toBeHidden();
    await expect(signature).toContainText('Kena boh!');
    await expect(signature).toContainText('Ngamsoi.');
    await expect(ritual.locator('.sr-only').filter({ hasText: 'Simpanan Berjaya' })).toHaveCount(1);
    await expect(ritual.locator('.sr-only').filter({ hasText: 'Buku Harian Tapak berjaya disimpan.' })).toHaveCount(1);
    await expect(signature).not.toContainText('Simpanan Berjaya');
    await expect(signature).not.toContainText('Buku Harian Tapak berjaya disimpan.');

    await ritual.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await page.waitForTimeout(280);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n06-02-engage-390x844.png'),
      fullPage: false,
    });

    await page.waitForTimeout(650);

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const ritual = document.querySelector<HTMLElement>('.ng-completion')!;
      const baseline = document.querySelector<HTMLElement>('.ng-completion__baseline')!;
      const markBaseline = document.querySelector<SVGPathElement>('.ng-completion__mark .ngamsoi-mark-baseline')!;
      const check = document.querySelector<HTMLElement>('.ng-completion__check')!;
      const signature = document.querySelector<HTMLElement>('.ng-completion__signature')!;
      const actionStrip = document.querySelector<HTMLElement>('.ng-completion-actions')!;
      const visibleActionLabels = Array.from(actionStrip.querySelectorAll<HTMLElement>('[aria-hidden="true"]'))
        .map((element) => element.textContent?.trim() ?? '')
        .filter(Boolean);
      const baselineAfter = getComputedStyle(baseline, '::after');

      const establishedProbe = document.createElement('span');
      establishedProbe.style.color = getComputedStyle(root).getPropertyValue('--ng-established').trim();
      document.body.appendChild(establishedProbe);
      const establishedColor = getComputedStyle(establishedProbe).color;
      establishedProbe.remove();

      return {
        viewportWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        ritualBorderRadius: getComputedStyle(ritual).borderRadius,
        baselineBackground: baselineAfter.backgroundColor,
        baselineTransform: baselineAfter.transform,
        markBaselineColor: getComputedStyle(markBaseline).color,
        establishedColor,
        checkOpacity: parseFloat(getComputedStyle(check).opacity),
        signatureOpacity: parseFloat(getComputedStyle(signature).opacity),
        visibleActionLabels,
        particleCount: ritual.querySelectorAll('.ng-completion__particle').length,
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.ritualBorderRadius).toBe('0px');
    expect(metrics.baselineTransform).toBe('matrix(1, 0, 0, 1, 0, 0)');
    expect(metrics.baselineBackground).toBe(metrics.establishedColor);
    expect(metrics.markBaselineColor).toBe(metrics.establishedColor);
    expect(metrics.checkOpacity).toBe(1);
    expect(metrics.signatureOpacity).toBe(1);
    expect(metrics.particleCount).toBe(6);
    expect(metrics.visibleActionLabels).toEqual(['Mohon', 'Cetak', 'Aktiviti', 'Baharu']);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n06-03-established-390x844.png'),
      fullPage: false,
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedMotion = await page.evaluate(() => {
      const mark = document.querySelector<HTMLElement>('.ng-completion__mark-shell')!;
      const signature = document.querySelector<HTMLElement>('.ng-completion__signature')!;
      const particle = document.querySelector<HTMLElement>('.ng-completion__particle')!;
      return {
        markAnimation: getComputedStyle(mark).animationName,
        signatureAnimation: getComputedStyle(signature).animationName,
        particleDisplay: getComputedStyle(particle).display,
      };
    });

    expect(reducedMotion.markAnimation).toBe('none');
    expect(reducedMotion.signatureAnimation).toBe('none');
    expect(reducedMotion.particleDisplay).toBe('none');

    console.log(
      `N06 live gate captured ${MOBILE.width}x${MOBILE.height}: three-frame touch-mobile decision pack + actual save -> established baseline -> NGAMSOI closure`,
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