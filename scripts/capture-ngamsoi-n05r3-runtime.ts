import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium, type Route } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n05r3-mark-system');
const MOBILE = { width: 390, height: 844 };
const BASE_URL = process.env.N05R3_BASE_URL ?? 'http://127.0.0.1:3000';
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const VISUAL_USER_EMAIL = 'pt.ngamsoi@jkr.gov.my';
const TRIANGLE = 'M21 13H43L32 28Z';
const LOCKED_DATUM = 'M11 43H27L32 38L37 43H53';

function supabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-project.supabase.co';
  const projectRef = new URL(url).hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

function visualGateSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: 'n05r3-visual-gate-access-token',
    refresh_token: 'n05r3-visual-gate-refresh-token',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
      id: VISUAL_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: VISUAL_USER_EMAIL,
      email_confirmed_at: '2026-09-01T00:00:00.000Z',
      phone: '',
      confirmed_at: '2026-09-01T00:00:00.000Z',
      last_sign_in_at: '2026-09-01T00:00:00.000Z',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { display_name: 'Pegawai Tapak' },
      identities: [],
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
      is_anonymous: false,
    },
  });
}

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installCoreRoutes(page: import('playwright').Page): Promise<void> {
  await page.route('**/api/**', async (route) => json(route, { data: [] }));
  await installN05R2PreviewRoutes(page, { programmeId: PROGRAMME_ID, revisionId: REVISION_ID });

  await page.route(`**/api/task/revision/${REVISION_ID}`, async (route) => json(route, {
    data: [{
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
      created_by: 'n05r3-runtime-gate',
    }],
  }));

  await page.route(`**/api/programme/${PROGRAMME_ID}`, async (route) => json(route, {
    data: {
      programmeId: PROGRAMME_ID,
      programmeCode: 'JKR/FPTV/UPSI',
      programmeName: 'Projek FPTV UPSI (Tawaran Semula)',
      programmeShortName: 'FPTV UPSI',
      currentRevisionId: REVISION_ID,
      status: 'Active',
      isLocked: false,
    },
  }));

  await page.route('**/api/programme-revision?programmeId=**', async (route) => json(route, {
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
  }));

  await page.route('**/api/project-summary**', async (route) => json(route, {
    revision_id: REVISION_ID,
    task_name: 'Projek FPTV UPSI (Tawaran Semula)',
    start_date: '2026-01-12',
    finish_date: '2027-03-31',
  }));

  await page.route('**/api/programme?status=Active', async (route) => json(route, {
    data: [{
      id: PROGRAMME_ID,
      code: 'JKR/FPTV/UPSI',
      name: 'Projek FPTV UPSI (Tawaran Semula)',
      shortName: 'FPTV UPSI',
      contractorName: 'Kontraktor Utama',
      employerName: 'JKR',
    }],
  }));
}

async function markGeometry(mark: import('playwright').Locator) {
  return mark.evaluate((svg) => {
    const triangle = svg.querySelector<SVGPathElement>('path:first-of-type');
    const datum = svg.querySelector<SVGPathElement>('.ngamsoi-mark-baseline');
    const stem = svg.querySelector<SVGPathElement>('.ngamsoi-mark-stem');
    return {
      triangle: triangle?.getAttribute('d') ?? null,
      datum: datum?.getAttribute('d') ?? null,
      hasStem: Boolean(stem),
      pathCount: svg.querySelectorAll('path').length,
    };
  });
}

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

  await context.addInitScript(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, session),
    { storageKey: supabaseAuthStorageKey(), session: visualGateSession() },
  );

  const page = await context.newPage();
  try {
    await installCoreRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });

    const headerMark = page.locator('.ngamsoi-app-header .ngamsoi-mark-svg').first();
    await expect(headerMark).toBeVisible();
    const headerGeometry = await markGeometry(headerMark);
    expect(headerGeometry).toEqual({ triangle: TRIANGLE, datum: LOCKED_DATUM, hasStem: false, pathCount: 2 });
    await expect(page.locator('.ng-project-short-name')).toHaveText('FPTV UPSI');
    await expect(page.locator('.ng-project-revision')).toHaveText('R03');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r3-01-header-cross-free-390x844.png'),
      fullPage: false,
    });

    await page.getByRole('tab', { name: 'Baharu' }).click();
    const taskButton = page.getByRole('button', { name: /Kerja konkrit rasuk aras bawah/ }).first();
    await expect(taskButton).toBeVisible();
    await taskButton.click();

    const switchButton = page.getByRole('button', { name: 'Tukar sumber aktiviti' });
    await expect(switchButton).toBeVisible();
    const switchBox = await switchButton.boundingBox();
    expect(switchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(switchBox?.width ?? 0).toBeGreaterThanOrEqual(220);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r3-02-source-switch-action-390x844.png'),
      fullPage: false,
    });

    const workforce = page.locator('.ng-workforce');
    await workforce.scrollIntoViewIfNeeded();
    const workforceIcon = workforce.locator('.ng-workforce__overall-icon');
    await expect(workforceIcon).toBeVisible();
    await expect(workforce.locator('.ng-workforce__overall')).toHaveAttribute('aria-label', '0 pekerja');
    expect(await workforce.locator('.ng-workforce__overall').innerText()).not.toContain('ORANG');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r3-03-workforce-hardhat-390x844.png'),
      fullPage: false,
    });

    const form = page.locator('form[aria-label="Borang Buku Harian Tapak"]');
    await form.locator('select').first().selectOption('Siap');
    await form.locator('input[placeholder^="cth:"]').fill('Zon B, Aras Bawah');
    await form.locator('textarea[placeholder="Catat kerja"]').fill('Kerja konkrit siap dan direkodkan untuk runtime gate.');
    await form.getByRole('button', { name: 'Simpan', exact: true }).click();

    const completion = page.locator('[data-testid="ngamsoi-completion"]');
    await expect(completion).toBeVisible();
    const completionMark = completion.locator('.ng-completion__mark');
    const completionGeometry = await markGeometry(completionMark);
    expect(completionGeometry).toEqual({ triangle: TRIANGLE, datum: LOCKED_DATUM, hasStem: false, pathCount: 2 });

    const check = completion.locator('.ng-completion__check');
    await page.waitForTimeout(430);
    const engagedOpacity = Number(await check.evaluate((node) => getComputedStyle(node).opacity));
    expect(engagedOpacity).toBeGreaterThan(0.2);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r3-04-completion-engage-390x844.png'),
      fullPage: false,
    });

    await page.waitForTimeout(700);
    const finalOpacity = Number(await check.evaluate((node) => getComputedStyle(node).opacity));
    expect(finalOpacity).toBeLessThanOrEqual(0.01);
    await expect(completion.getByText('Kena boh!', { exact: true })).toBeVisible();
    await expect(completion.getByText('Ngamsoi.', { exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r3-05-completion-clean-final-390x844.png'),
      fullPage: false,
    });

    const rootMetrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(rootMetrics.scrollWidth).toBeLessThanOrEqual(rootMetrics.viewportWidth);

    console.log('N05R.3 gate: cross-free canonical mark + prominent Tukar + hardhat counter + transient completion tick verified at 390x844.');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
