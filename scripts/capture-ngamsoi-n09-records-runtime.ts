import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium, type BrowserContext, type Page, type Route } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n09-records-ledger');
const BASE_URL = process.env.N09_BASE_URL ?? 'http://127.0.0.1:3000';
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const HISTORY_REVISION_ID = '22222222-2222-4222-9222-222222222229';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
const HISTORY_DIARY_ID = '55555555-5555-4555-9555-555555555559';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const HISTORY_ACTIVITY_ID = '44444444-4444-4444-9444-444444444449';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const VISUAL_USER_EMAIL = 'pt.ngamsoi@jkr.gov.my';

function supabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-project.supabase.co';
  const projectRef = new URL(url).hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

function visualGateSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: 'n09-visual-gate-access-token',
    refresh_token: 'n09-visual-gate-refresh-token',
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

function projection(historical = false) {
  return {
    siteDiaryId: historical ? HISTORY_DIARY_ID : SITE_DIARY_ID,
    activityId: historical ? HISTORY_ACTIVITY_ID : ACTIVITY_ID,
    activityDate: historical ? '2026-07-12' : '2026-09-02',
    programmeId: PROGRAMME_ID,
    revisionId: historical ? HISTORY_REVISION_ID : REVISION_ID,
    revisionNumber: historical ? 2 : 3,
    revisionTitle: historical ? 'Semakan 02' : 'Semakan 03',
    revisionStatus: historical ? 'Superseded' : 'Approved',
    isCurrentRevision: !historical,
    isReadOnly: historical,
    activityTitle: historical ? 'Kerja cerucuk Blok Pentadbiran' : 'Kerja konkrit rasuk aras bawah · Zon B',
    activityStatus: historical ? 'Completed' : 'In Progress',
    sourceType: historical ? 'VO' : 'MSP',
    sourceReference: historical ? 'VO-07' : 'WBS 1.2.4',
    location: historical ? 'Blok Pentadbiran · Grid 1–4' : 'Blok Pentadbiran · Grid 4–8',
    contractorScope: historical ? 'NSC' : 'CONTRACTOR',
    diaryStatus: historical ? 'Completed' : 'In Progress',
    submittedAt: historical ? '2026-07-12T09:10:00.000Z' : '2026-09-02T09:10:00.000Z',
    updatedAt: null,
    lastModifiedAt: historical ? '2026-07-12T09:10:00.000Z' : '2026-09-02T10:40:00.000Z',
    enrichmentComplete: true,
  };
}

function canonicalDetail() {
  return {
    site_diary_id: SITE_DIARY_ID,
    programme_id: PROGRAMME_ID,
    revision_id: REVISION_ID,
    activity_id: ACTIVITY_ID,
    activity_date: '2026-09-02',
    weather: 'ELOK',
    notes: 'Konkrit rasuk aras bawah diteruskan di Grid 4–8.',
    status: 'In Progress',
    manpower: [
      { trade_name: 'Carpenter (Tukang Kayu)', bumi_count: 4, non_bumi_count: 2, foreign_count: 6 },
      { trade_name: 'Concretor (Tukang Konkrit)', bumi_count: 3, non_bumi_count: 1, foreign_count: 8 },
    ],
    print_context: {
      location: 'Blok Pentadbiran · Grid 4–8',
      work_start_time: '08:00',
      work_end_time: '17:00',
      weather_condition: 'ELOK',
      rain_start_time: null,
      rain_end_time: null,
      contractor_scope: 'CONTRACTOR',
    },
    submitted_by: VISUAL_USER_ID,
    submitted_at: '2026-09-02T09:10:00.000Z',
    updated_at: '2026-09-02T10:40:00.000Z',
  };
}

async function installRoutes(page: Page): Promise<void> {
  await page.route('**/api/**', async (route) => json(route, { data: [] }));
  await installN05R2PreviewRoutes(page, { programmeId: PROGRAMME_ID, revisionId: REVISION_ID });

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

  await page.route('**/api/project-summary**', async (route) => json(route, {
    revision_id: REVISION_ID,
    task_name: 'Projek FPTV UPSI (Tawaran Semula)',
    start_date: '2026-01-12',
    finish_date: '2027-03-31',
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
        revisionId: HISTORY_REVISION_ID,
        revisionNumber: 2,
        revisionTitle: 'Semakan 02',
        revisionStatus: 'Superseded',
        isCurrentRevision: false,
        isReadOnly: true,
      },
    ],
  }));

  await page.route(`**/api/site-diary/revision/${REVISION_ID}**`, async (route) => json(route, { data: [projection(false)] }));
  await page.route(`**/api/site-diary/revision/${HISTORY_REVISION_ID}**`, async (route) => json(route, { data: [projection(true)] }));
  await page.route(`**/api/site-diary/${SITE_DIARY_ID}`, async (route) => json(route, { data: canonicalDetail() }));
  await page.route(`**/api/site-diary/${SITE_DIARY_ID}/history`, async (route) => json(route, {
    data: {
      siteDiaryId: SITE_DIARY_ID,
      events: [
        {
          logId: '88888888-8888-4888-8888-888888888888',
          eventType: 'NEW',
          loggedAt: '2026-09-02T09:10:00.000Z',
          actorLabel: 'Pegawai Tapak',
          snapshotAvailable: true,
          changes: [],
        },
        {
          logId: '88888888-8888-4888-8888-888888888889',
          eventType: 'UPDATE',
          loggedAt: '2026-09-02T10:40:00.000Z',
          actorLabel: 'Pegawai Tapak',
          snapshotAvailable: true,
          changes: [{ kind: 'FIELD', field: 'notes', description: 'Catatan kemajuan dikemaskini.' }],
        },
      ],
    },
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

async function assertCurrentLedger(page: Page) {
  const records = page.locator('[aria-label="Pengurusan Rekod Buku Harian"]');
  await expect(records).toBeVisible();
  await expect(page.locator('[data-testid="current-revision-label"]')).toContainText('Semakan 3');

  const contextTabs = page.getByRole('tablist', { name: 'Konteks rekod' });
  const currentTab = contextTabs.getByRole('tab', { name: 'Rekod Semasa' });
  await expect(currentTab).toHaveAttribute('aria-selected', 'true');
  const tabStyle = await contextTabs.evaluate((node) => {
    const style = getComputedStyle(node);
    return { radius: style.borderRadius, background: style.backgroundColor };
  });
  expect(tabStyle.radius).toBe('0px');

  const filterInput = page.getByRole('textbox', { name: 'Cari aktiviti' });
  const filterStyle = await filterInput.evaluate((node) => {
    const style = getComputedStyle(node);
    return { radius: style.borderRadius, minHeight: style.minHeight };
  });
  expect(filterStyle.radius).toBe('0px');
  expect(Number.parseFloat(filterStyle.minHeight)).toBeGreaterThanOrEqual(44);

  const record = page.locator('[aria-label="Senarai rekod Buku Harian"] > article').first();
  await expect(record).toContainText('Kerja konkrit rasuk aras bawah');
  const recordStyle = await record.evaluate((node) => {
    const style = getComputedStyle(node);
    const rail = getComputedStyle(node, '::before');
    return {
      radius: style.borderRadius,
      shadow: style.boxShadow,
      railWidth: rail.width,
      railColor: rail.backgroundColor,
    };
  });
  expect(recordStyle.radius).toBe('0px');
  expect(recordStyle.shadow).toBe('none');
  expect(recordStyle.railWidth).toBe('2px');
  expect(recordStyle.railColor).not.toBe('rgba(0, 0, 0, 0)');

  const detailButton = record.getByRole('button', { name: 'Lihat Butiran' });
  expect((await detailButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
}

async function assertHistoricalLedger(page: Page) {
  await page.getByRole('tab', { name: 'Semakan Terdahulu' }).click();
  await page.getByRole('combobox', { name: 'Pilih semakan sejarah' }).selectOption(HISTORY_REVISION_ID);
  const historical = page.locator('[aria-label="Senarai rekod Buku Harian"] > article').first();
  await expect(historical).toContainText('Sejarah / Baca Sahaja');
  await expect(historical).toContainText('Kerja cerucuk Blok Pentadbiran');
  const style = await historical.evaluate((node) => ({
    radius: getComputedStyle(node).borderRadius,
    rail: getComputedStyle(node, '::before').backgroundColor,
  }));
  expect(style.radius).toBe('0px');
  expect(style.rail).not.toBe('rgba(0, 0, 0, 0)');
}

async function assertDetailLedger(page: Page) {
  await page.getByRole('button', { name: 'Kembali ke Rekod Semasa' }).click();
  await page.getByRole('button', { name: 'Lihat Butiran' }).click();

  const detail = page.locator('[aria-label="Butiran Buku Harian Tapak"]');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Konkrit rasuk aras bawah diteruskan');
  await expect(detail).toContainText('Tukang Kayu');
  await expect(detail).toContainText('Sejarah Perubahan');

  const detailStyle = await detail.evaluate((node) => ({
    radius: getComputedStyle(node).borderRadius,
    shadow: getComputedStyle(node).boxShadow,
  }));
  expect(detailStyle.radius).toBe('0px');
  expect(detailStyle.shadow).toBe('none');

  const header = detail.locator('> header');
  const headerRail = await header.evaluate((node) => getComputedStyle(node, '::before').width);
  expect(headerRail).toBe('2px');

  const sectionHeading = detail.getByRole('heading', { name: 'Pelaksanaan' });
  const headingDash = await sectionHeading.evaluate((node) => getComputedStyle(node, '::before').width);
  expect(Number.parseFloat(headingDash)).toBeGreaterThan(15);

  const workforceRow = detail.locator('section').filter({ has: detail.getByRole('heading', { name: 'Tenaga Kerja' }) }).locator('div.space-y-2 > div').first();
  expect(await workforceRow.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('0px');

  const historyEvent = detail.locator('[aria-labelledby="site-diary-history-heading"] ol > li').first();
  await expect(historyEvent).toBeVisible();
  expect(await historyEvent.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('0px');

  await expect(detail.getByRole('link', { name: 'Cetak Buku Harian Tapak' })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Edit Rekod' })).toBeVisible();
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
    await installRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'RECORDS');
    await assertCurrentLedger(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n09-01-records-current-390x844.png'), fullPage: false });

    await assertHistoricalLedger(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n09-02-records-history-390x844.png'), fullPage: false });

    await assertDetailLedger(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n09-03-record-detail-390x844.png'), fullPage: false });
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
    await installRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.ng-workspace-nav--desktop')).toBeVisible();
    await expect(page.locator('.ng-workspace-nav--mobile')).toBeHidden();
    await assertCurrentLedger(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n09-04-records-desktop-960x900.png'), fullPage: false });
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
    console.log('N09 records gate: current/history archive rows, filters, detail ledger, workforce readback, audit history, actions and mobile/desktop overflow verified.');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
