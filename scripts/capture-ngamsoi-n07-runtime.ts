import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium, type BrowserContext, type Page, type Route } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n07-navigation');
const BASE_URL = process.env.N07_BASE_URL ?? 'http://127.0.0.1:3000';
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const VISUAL_USER_EMAIL = 'pt.ngamsoi@jkr.gov.my';
const APPROVAL_ID = '99999999-9999-4999-8999-999999999999';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';

function supabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-project.supabase.co';
  const projectRef = new URL(url).hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

function visualGateSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: 'n07-visual-gate-access-token',
    refresh_token: 'n07-visual-gate-refresh-token',
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

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
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
      created_by: 'n07-runtime-gate',
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

  await page.route(`**/api/programme/${PROGRAMME_ID}/approval-queue`, async (route) => json(route, {
    data: [{
      approval_id: APPROVAL_ID,
      site_diary_id: SITE_DIARY_ID,
      programme_id: PROGRAMME_ID,
      activity_name: 'Kerja konkrit rasuk aras bawah · Zon B',
      activity_date: '2026-09-02',
      approval_status: 'Pending',
      requested_at: '2026-09-02T08:00:00.000Z',
      requester_name: 'Pengelia Tapak',
    }],
  }));
}

async function seedSession(context: BrowserContext) {
  await context.addInitScript(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, session),
    { storageKey: supabaseAuthStorageKey(), session: visualGateSession() },
  );
}

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function assertSelected(nav: ReturnType<Page['locator']>, id: 'NEW' | 'OPEN' | 'RECORDS' | 'APPROVALS') {
  const selected = nav.locator(`[data-workspace-nav="${id}"]`);
  await expect(selected).toHaveAttribute('data-selected', 'true');
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  const selectedCount = await nav.locator('[data-selected="true"]').count();
  expect(selectedCount).toBe(1);
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

    const mobileNav = page.locator('.ng-workspace-nav--mobile');
    const desktopNav = page.locator('.ng-workspace-nav--desktop');
    await expect(mobileNav).toBeVisible();
    await expect(desktopNav).toBeHidden();
    await expect(mobileNav.locator('[role="tab"]')).toHaveCount(4);
    await assertSelected(mobileNav, 'RECORDS');

    const recordButton = mobileNav.locator('[data-workspace-nav="RECORDS"]');
    const indicator = await recordButton.evaluate((node) => {
      const style = getComputedStyle(node, '::before');
      return { height: style.height, backgroundColor: style.backgroundColor };
    });
    expect(indicator.height).toBe('2px');
    expect(indicator.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    await mobileNav.locator('[data-workspace-nav="NEW"]').click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'NEW');
    await assertSelected(mobileNav, 'NEW');
    await expect(page.locator('form[aria-label="Borang Buku Harian Tapak"]')).toBeVisible();

    await mobileNav.locator('[data-workspace-nav="OPEN"]').click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'OPEN');
    await assertSelected(mobileNav, 'OPEN');

    await mobileNav.locator('[data-workspace-nav="APPROVALS"]').click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'APPROVALS');
    await assertSelected(mobileNav, 'APPROVALS');
    await expect(page.getByRole('button', { name: 'Semak (Review)' })).toBeVisible();

    await page.getByRole('button', { name: 'Semak (Review)' }).click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-review', 'true');
    await expect(mobileNav).toBeVisible();
    await assertSelected(mobileNav, 'APPROVALS');

    await mobileNav.locator('[data-workspace-nav="RECORDS"]').click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-review', 'false');
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'RECORDS');
    await assertSelected(mobileNav, 'RECORDS');

    const animationName = await page.locator('.ng-workspace-content').evaluate((node) => getComputedStyle(node).animationName);
    expect(animationName).toContain('ng-n07-homecoming');
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n07-01-mobile-navigation-390x844.png'),
      fullPage: false,
    });
  } finally {
    await context.close();
  }
}

async function desktopGate(browser: import('playwright').Browser) {
  const context = await browser.newContext({
    viewport: { width: 960, height: 900 },
    screen: { width: 960, height: 900 },
  });
  await seedSession(context);
  const page = await context.newPage();

  try {
    await installCoreRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });

    const desktopNav = page.locator('.ng-workspace-nav--desktop');
    const mobileNav = page.locator('.ng-workspace-nav--mobile');
    await expect(desktopNav).toBeVisible();
    await expect(mobileNav).toBeHidden();
    await expect(desktopNav.locator('[role="tab"]')).toHaveCount(4);
    await assertSelected(desktopNav, 'RECORDS');

    const navBox = await desktopNav.boundingBox();
    expect(navBox?.width ?? 0).toBeLessThanOrEqual(60);

    const recordButton = desktopNav.locator('[data-workspace-nav="RECORDS"]');
    const indicator = await recordButton.evaluate((node) => {
      const style = getComputedStyle(node, '::before');
      return { width: style.width, backgroundColor: style.backgroundColor };
    });
    expect(indicator.width).toBe('2px');
    expect(indicator.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    await desktopNav.locator('[data-workspace-nav="NEW"]').click();
    await assertSelected(desktopNav, 'NEW');
    await desktopNav.locator('[data-workspace-nav="OPEN"]').click();
    await assertSelected(desktopNav, 'OPEN');
    await desktopNav.locator('[data-workspace-nav="APPROVALS"]').click();
    await assertSelected(desktopNav, 'APPROVALS');

    await page.getByRole('button', { name: 'Semak (Review)' }).click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-review', 'true');
    await expect(desktopNav).toBeVisible();
    await assertSelected(desktopNav, 'APPROVALS');

    await desktopNav.locator('[data-workspace-nav="RECORDS"]').click();
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-review', 'false');
    await assertSelected(desktopNav, 'RECORDS');
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'n07-02-desktop-navigation-960x900.png'),
      fullPage: false,
    });
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
    console.log('N07 navigation gate: shared tab state, nested-review homecoming, mobile/desktop rail grammar and overflow verified.');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
