import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium } from 'playwright';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n05r2-ngamsoi-header');
const MOBILE = { width: 390, height: 844 };
const BASE_URL = process.env.N05R2_BASE_URL ?? 'http://127.0.0.1:3000';

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';

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
            programmeCode: 'JKR/FPTV/UPSI',
            programmeName: 'Projek FPTV UPSI (Tawaran Semula)',
            programmeShortName: 'FPTV UPSI',
            currentRevisionId: REVISION_ID,
            status: 'Active',
            isLocked: false,
          },
        }),
      });
    });

    await page.route('**/api/programme-revision?programmeId=**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              programmeId: PROGRAMME_ID,
              revisionId: REVISION_ID,
              revisionNumber: 3,
              revisionTitle: 'Semakan 03',
              revisionStatus: 'Approved',
              isCurrentRevision: true,
              isReadOnly: false,
            },
            {
              programmeId: PROGRAMME_ID,
              revisionId: '66666666-6666-4666-8666-666666666666',
              revisionNumber: 2,
              revisionTitle: 'Semakan 02',
              revisionStatus: 'Superseded',
              isCurrentRevision: false,
              isReadOnly: true,
            },
          ],
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
              code: 'JKR/FPTV/UPSI',
              name: 'Projek FPTV UPSI (Tawaran Semula)',
              shortName: 'FPTV UPSI',
              contractorName: 'Kontraktor Utama',
              employerName: 'JKR',
            },
          ],
        }),
      });
    });

    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });

    const nickname = page.locator('.ng-project-short-name');
    const title = page.locator('.ng-project-title');
    const revision = page.locator('.ng-project-revision');
    const brandMark = page.locator('.ngamsoi-app-header .ngamsoi-mark-svg').first();
    const profileTrigger = page.locator('.ng-profile-trigger');

    await expect(nickname).toHaveText('FPTV UPSI');
    await expect(title).toContainText('Projek FPTV UPSI (Tawaran Semula)');
    await expect(revision).toHaveText('R03');
    await expect(page.getByText('Semakan Sah', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Semakan Semasa', { exact: true })).toHaveCount(0);
    await expect(profileTrigger).toBeVisible();

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const titleElement = document.querySelector<HTMLElement>('.ng-project-title')!;
      const profileElement = document.querySelector<HTMLElement>('.ng-profile-trigger')!;
      const mark = document.querySelector<SVGSVGElement>('.ngamsoi-app-header .ngamsoi-mark-svg')!;
      const triangle = mark.querySelector<SVGPathElement>('path:first-of-type')!;
      const stem = mark.querySelector<SVGPathElement>('.ngamsoi-mark-stem')!;
      const baseline = mark.querySelector<SVGPathElement>('.ngamsoi-mark-baseline')!;
      return {
        viewportWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        lineClamp: getComputedStyle(titleElement).webkitLineClamp,
        titleOverflow: getComputedStyle(titleElement).overflow,
        profileWidth: profileElement.getBoundingClientRect().width,
        profileHeight: profileElement.getBoundingClientRect().height,
        trianglePath: triangle.getAttribute('d'),
        stemPath: stem.getAttribute('d'),
        baselinePath: baseline.getAttribute('d'),
      };
    });

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.lineClamp).toBe('2');
    expect(metrics.titleOverflow).toBe('hidden');
    expect(metrics.profileWidth).toBeGreaterThanOrEqual(36);
    expect(metrics.profileHeight).toBeGreaterThanOrEqual(36);
    expect(metrics.trianglePath).toBe('M32 14H96L64 52Z');
    expect(metrics.stemPath).toBe('M64 52V87');
    expect(metrics.baselinePath).toBe('M10 72H118');
    await expect(brandMark).toBeVisible();

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r2-01-header-closed-390x844.png'),
      fullPage: false,
    });

    await profileTrigger.click();
    const profilePanel = page.locator('.ng-profile-panel');
    await expect(profilePanel).toBeVisible();
    await expect(profilePanel.getByText('Akaun', { exact: true })).toBeVisible();
    await expect(profilePanel.getByRole('button', { name: 'Keluar', exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r2-02-profile-open-390x844.png'),
      fullPage: false,
    });

    await profileTrigger.click();
    await expect(profilePanel).toBeHidden();

    const baharuTab = page.getByRole('tab', { name: 'Baharu' });
    if (await baharuTab.count()) {
      await baharuTab.click();
      await expect(page.getByRole('heading', { name: 'Sumber' })).toBeVisible();
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r2-03-header-in-entry-flow-390x844.png'),
      fullPage: false,
    });

    console.log(
      `N05R.2 gate captured ${MOBILE.width}x${MOBILE.height}: closed master mark + FPTV UPSI nickname + R03 current-only + profile return`,
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
