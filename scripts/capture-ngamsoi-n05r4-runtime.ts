import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium, type BrowserContext, type Page, type Route } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n05r4-harmony');
const BASE_URL = process.env.N05R4_BASE_URL ?? 'http://127.0.0.1:3000';
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
    access_token: 'n05r4-visual-gate-access-token',
    refresh_token: 'n05r4-visual-gate-refresh-token',
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

async function installCoreRoutes(page: Page): Promise<void> {
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
      created_by: 'n05r4-runtime-gate',
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
    data: [{
      programmeId: PROGRAMME_ID,
      revisionId: REVISION_ID,
      revisionNumber: 3,
      revisionTitle: 'Semakan 03',
      revisionStatus: 'Approved',
      isCurrentRevision: true,
      isReadOnly: false,
    }],
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

async function seedSession(context: BrowserContext) {
  await context.addInitScript(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, session),
    { storageKey: supabaseAuthStorageKey(), session: visualGateSession() },
  );
}

async function assertCanonicalMark(page: Page) {
  const mark = page.locator('.ngamsoi-app-header .ngamsoi-mark-svg').first();
  await expect(mark).toBeVisible();
  const geometry = await mark.evaluate((svg) => ({
    triangle: svg.querySelector<SVGPathElement>('path:first-of-type')?.getAttribute('d') ?? null,
    datum: svg.querySelector<SVGPathElement>('.ngamsoi-mark-baseline')?.getAttribute('d') ?? null,
    pathCount: svg.querySelectorAll('path').length,
  }));
  expect(geometry).toEqual({ triangle: TRIANGLE, datum: LOCKED_DATUM, pathCount: 2 });
}

async function chooseTask(page: Page) {
  await page.getByRole('tab', { name: 'Baharu' }).click();
  const taskButton = page.getByRole('button', { name: /Kerja konkrit rasuk aras bawah/ }).first();
  await expect(taskButton).toBeVisible();
  await taskButton.click();
}

async function assertPulse(page: Page) {
  const pulse = page.locator('.ng-project-pulse');
  await expect(pulse).toBeVisible();
  await expect(pulse.getByText('SEMAKAN', { exact: true })).toBeVisible();
  await expect(page.locator('.ng-project-revision')).toHaveText('R03');
  await expect(pulse.getByText('BAKI', { exact: true })).toBeVisible();
  await expect(pulse.getByText('MASA', { exact: true })).toBeVisible();
}

async function mobileGate(browser: import('playwright').Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await seedSession(context);
  const page = await context.newPage();
  try {
    await installCoreRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
    await assertCanonicalMark(page);
    await assertPulse(page);
    await chooseTask(page);

    const switchButton = page.getByRole('button', { name: 'Tukar sumber aktiviti' });
    const source = page.locator('.mobile-entry-selected-source');
    await expect(switchButton).toBeVisible();
    const switchBox = await switchButton.boundingBox();
    const sourceBox = await source.boundingBox();
    expect(switchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect((switchBox?.x ?? 0) + (switchBox?.width ?? 0)).toBeLessThanOrEqual((sourceBox?.x ?? 0) + (sourceBox?.width ?? 0) + 1);

    const workforce = page.locator('.ng-workforce');
    await workforce.scrollIntoViewIfNeeded();
    await expect(workforce.locator('.ng-workforce__title')).toHaveText('Pekerja');
    await expect(workforce.locator('.ng-workforce__kicker')).toBeHidden();
    await expect(workforce.locator('.ng-workforce__hint')).toBeHidden();
    await expect(workforce.locator('.ng-workforce__overall-icon')).toBeVisible();

    const headers = await workforce.locator('.ng-workforce__matrix-head > span').allTextContents();
    expect(headers).toEqual(['TRED', 'B', 'BB', 'A', 'JUMLAH']);

    await workforce.locator('[data-testid="workforce-cell-0-bumi_count"]').click();
    const controller = workforce.locator('[data-testid="workforce-active-controller"]');
    await expect(controller).toBeVisible();
    const controllerHeight = (await controller.boundingBox())?.height ?? 0;
    expect(controllerHeight).toBeGreaterThanOrEqual(44);
    await expect(controller.getByRole('button', { name: /Tolak 1 Bumiputera/ })).toBeVisible();
    await expect(controller.getByRole('button', { name: /Tambah 1 Bumiputera/ })).toBeVisible();

    const firstSectionNode = page.locator('form[aria-label="Borang Buku Harian Tapak"] > section').first();
    const nodeRadius = await firstSectionNode.evaluate((node) => getComputedStyle(node, '::before').borderRadius);
    expect(nodeRadius).toBe('50%');

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r4-01-mobile-harmony-390x844.png'),
      fullPage: false,
    });
  } finally {
    await context.close();
  }
}

async function desktopGate(browser: import('playwright').Browser) {
  const context = await browser.newContext({ viewport: { width: 960, height: 900 }, screen: { width: 960, height: 900 } });
  await seedSession(context);
  const page = await context.newPage();
  try {
    await installCoreRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
    await assertCanonicalMark(page);
    await assertPulse(page);
    await chooseTask(page);

    const sidebar = page.getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' });
    const sidebarWidth = (await sidebar.boundingBox())?.width ?? 0;
    expect(sidebarWidth).toBeLessThanOrEqual(60);

    const sections = page.locator('form[aria-label="Borang Buku Harian Tapak"] > section');
    const pseudoContents = await sections.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node, '::after').content));
    for (const content of pseudoContents) {
      expect(['none', 'normal', '""']).toContain(content);
    }

    const source = page.locator('.mobile-entry-selected-source');
    const switchButton = page.getByRole('button', { name: 'Tukar sumber aktiviti' });
    const sourceBox = await source.boundingBox();
    const switchBox = await switchButton.boundingBox();
    expect(switchBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(switchBox?.width ?? 0).toBeLessThanOrEqual(130);
    expect((switchBox?.x ?? 0) + (switchBox?.width ?? 0)).toBeLessThanOrEqual((sourceBox?.x ?? 0) + (sourceBox?.width ?? 0) + 1);

    const workforce = page.locator('.ng-workforce');
    await workforce.scrollIntoViewIfNeeded();
    await workforce.locator('[data-testid="workforce-cell-0-non_bumi_count"]').click();
    const controller = workforce.locator('[data-testid="workforce-active-controller"]');
    await expect(controller).toBeVisible();
    const meta = controller.locator('.ng-workforce__controller-meta');
    const metaMetrics = await meta.evaluate((node) => ({
      height: node.getBoundingClientRect().height,
      scrollHeight: node.scrollHeight,
    }));
    expect(metaMetrics.scrollHeight).toBeLessThanOrEqual(metaMetrics.height + 1);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r4-02-desktop-harmony-960x900.png'),
      fullPage: false,
    });

    const rootMetrics = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(rootMetrics.scrollWidth).toBeLessThanOrEqual(rootMetrics.viewportWidth);
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await mobileGate(browser);
    await desktopGate(browser);
    console.log('N05R.4 harmony gate: locked mark, circular label-free spine, uniform headings, workforce controls, source action, compact sidebar and project pulse verified.');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
