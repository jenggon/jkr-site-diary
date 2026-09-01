import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium, type BrowserContext, type Page, type Route } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n05r5-uniformity');
const BASE_URL = process.env.N05R5_BASE_URL ?? 'http://127.0.0.1:3000';
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const VISUAL_USER_EMAIL = 'pt.ngamsoi@jkr.gov.my';
const TRIANGLE = 'M21 13H43L32 28Z';
const LOCKED_DATUM = 'M11 43H27L32 38L37 43H53';
const LONG_TASK = 'Kerja konkrit rasuk aras bawah · Zon B · Blok Pentadbiran Utama · Grid 4–8 · Sambungan rasuk dan kepala tiang aras bawah';

function supabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-project.supabase.co';
  const projectRef = new URL(url).hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

function visualGateSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: 'n05r5-visual-gate-access-token',
    refresh_token: 'n05r5-visual-gate-refresh-token',
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
      task_name: LONG_TASK,
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
      created_by: 'n05r5-runtime-gate',
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

async function assertProjectPulse(page: Page) {
  const pulse = page.locator('.ng-project-pulse');
  await expect(pulse).toBeVisible();
  const firstLabel = pulse.locator('.ng-project-pulse__item').first().locator('small');
  const labelStyle = await firstLabel.evaluate((node) => ({
    fontSize: getComputedStyle(node).fontSize,
    after: getComputedStyle(node, '::after').content,
  }));
  expect(labelStyle.fontSize).toBe('0px');
  expect(labelStyle.after).toBe('"PROGRAM KERJA"');
  await expect(page.locator('.ng-project-revision')).toHaveText('R03');
  await expect(pulse.getByText('BAKI', { exact: true })).toBeVisible();
  await expect(pulse.getByText('MASA', { exact: true })).toBeVisible();
}

async function chooseTaskAndAssertActionFamily(page: Page) {
  await page.getByRole('tab', { name: 'Baharu' }).click();
  const taskButton = page.getByRole('button', { name: new RegExp('Kerja konkrit rasuk aras bawah') }).first();
  await expect(taskButton).toBeVisible();
  const pick = taskButton.locator('.mobile-entry-row-action');
  await expect(pick).toBeVisible();
  const pickStyle = await pick.evaluate((node) => {
    const style = getComputedStyle(node);
    return { borderColor: style.borderColor, color: style.color, fontWeight: style.fontWeight };
  });
  expect((await pick.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40);

  await taskButton.click();
  const switchButton = page.getByRole('button', { name: 'Tukar sumber aktiviti' });
  await expect(switchButton).toBeVisible();
  const switchStyle = await switchButton.evaluate((node) => {
    const style = getComputedStyle(node);
    return { borderColor: style.borderColor, color: style.color, fontWeight: style.fontWeight };
  });
  expect(switchStyle).toEqual(pickStyle);

  const selectedTitle = page.locator('.mobile-entry-selected-source h3');
  await expect(selectedTitle).toHaveText(LONG_TASK);
  const titleMetrics = await selectedTitle.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      lineClamp: style.getPropertyValue('-webkit-line-clamp'),
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    };
  });
  expect(titleMetrics.lineClamp).toBe('2');
  expect(titleMetrics.scrollWidth).toBeLessThanOrEqual(titleMetrics.clientWidth + 1);
}

async function exerciseDirectWorkforceEntry(page: Page, field: 'bumi_count' | 'foreign_count', value: string) {
  const workforce = page.locator('.ng-workforce');
  await workforce.scrollIntoViewIfNeeded();
  const cell = workforce.locator(`[data-testid="workforce-cell-0-${field}"]`);
  await cell.click();
  const input = workforce.locator('[data-testid="workforce-active-value"]');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('type', 'number');
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await expect(cell).toHaveText(new RegExp(`^${value}`));

  if (field === 'bumi_count') await expect(workforce.locator('[data-testid="workforce-b-total"]')).toHaveText(value);
  if (field === 'foreign_count') await expect(workforce.locator('[data-testid="workforce-a-total"]')).toHaveText(value);
  await expect(workforce.locator('[data-testid="workforce-classified-total"]')).toHaveText(value);
  await expect(workforce.locator('[data-testid="overall-workforce-total"]')).toHaveText(value);
  await expect(workforce.locator('[data-testid="trade-total-0"] strong')).toHaveText(value);

  const totalHeader = workforce.locator('.ng-workforce__matrix-metric--total');
  const bHeader = workforce.locator('.ng-workforce__matrix-metric').first();
  expect((await totalHeader.boundingBox())?.width ?? 0).toBeGreaterThan((await bHeader.boundingBox())?.width ?? 0);
}

async function assertUniformMobileSections(page: Page) {
  const actualHeadings = [
    page.getByRole('heading', { name: 'Harian' }),
    page.getByRole('heading', { name: 'Tapak' }),
    page.locator('.ng-workforce__title'),
    page.getByRole('heading', { name: /Catatan/i }),
  ];
  const fontSizes: string[] = [];
  for (const heading of actualHeadings) {
    await heading.scrollIntoViewIfNeeded();
    fontSizes.push(await heading.evaluate((node) => getComputedStyle(node).fontSize));
  }
  expect(new Set(fontSizes).size).toBe(1);

  const selectedSource = page.locator('.mobile-entry-selected-source');
  const sourceLabel = await selectedSource.evaluate((node) => ({
    dashWidth: getComputedStyle(node, '::before').width,
    label: getComputedStyle(node, '::after').content,
    fontSize: getComputedStyle(node, '::after').fontSize,
  }));
  expect(sourceLabel.label).toBe('"SUMBER"');
  expect(sourceLabel.dashWidth).not.toBe('0px');
  expect(sourceLabel.fontSize).toBe(fontSizes[0]);
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
    await assertProjectPulse(page);
    await chooseTaskAndAssertActionFamily(page);
    await exerciseDirectWorkforceEntry(page, 'foreign_count', '50');
    await assertUniformMobileSections(page);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r5-01-mobile-uniformity-390x844.png'),
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
    await assertProjectPulse(page);

    const sidebar = page.getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' });
    expect((await sidebar.boundingBox())?.width ?? 0).toBeLessThanOrEqual(60);

    await chooseTaskAndAssertActionFamily(page);
    await exerciseDirectWorkforceEntry(page, 'bumi_count', '347');

    const sections = page.locator('form[aria-label="Borang Buku Harian Tapak"] > section');
    const pseudoContents = await sections.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node, '::after').content));
    for (const content of pseudoContents) {
      expect(['none', 'normal', '""', '"SUMBER"']).toContain(content);
    }

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n05r5-02-desktop-direct-entry-960x900.png'),
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
    console.log('N05R.5 gate: locked mark, PROGRAM KERJA pulse, uniform source grammar, action family, class totals and direct numeric workforce entry verified.');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
