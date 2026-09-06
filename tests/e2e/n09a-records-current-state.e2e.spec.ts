import { expect, type Page, type Route, test } from '@playwright/test';
import { installN05R2PreviewRoutes } from '../../scripts/n05r2-preview-routes';

const APP_URL = '/site-diary';
const EXPECT_TIMEOUT = 20_000;
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const HISTORY_REVISION_ID = '22222222-2222-4222-9222-222222222229';
const SITE_DIARY_ID = '55555555-5555-4555-8555-555555555555';
const HISTORY_DIARY_ID = '55555555-5555-4555-9555-555555555559';
const ACTIVITY_ID = '44444444-4444-4444-8444-444444444444';
const HISTORY_ACTIVITY_ID = '44444444-4444-4444-9444-444444444449';
const USER_ID = '77777777-7777-4777-8777-777777777777';
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'half', width: 960, height: 900 },
  { name: 'wide', width: 1280, height: 900 },
] as const;

test.use({ timezoneId: 'Asia/Kuala_Lumpur' });

function supabaseAuthStorageKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder-project.supabase.co';
  const projectRef = new URL(url).hostname.split('.')[0] || 'placeholder-project';
  return `sb-${projectRef}-auth-token`;
}

function visualGateSession(): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  return JSON.stringify({
    access_token: 'n09a-visual-gate-access-token',
    refresh_token: 'n09a-visual-gate-refresh-token',
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'pt.ngamsoi@jkr.gov.my',
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

function canonicalDetail(historical = false) {
  return {
    site_diary_id: historical ? HISTORY_DIARY_ID : SITE_DIARY_ID,
    programme_id: PROGRAMME_ID,
    revision_id: historical ? HISTORY_REVISION_ID : REVISION_ID,
    activity_id: historical ? HISTORY_ACTIVITY_ID : ACTIVITY_ID,
    activity_date: historical ? '2026-07-12' : '2026-09-02',
    weather: 'ELOK',
    notes: historical ? 'Cerucuk disiapkan bagi zon rekod sejarah.' : 'Konkrit rasuk aras bawah diteruskan di Grid 4–8.',
    status: historical ? 'Completed' : 'In Progress',
    manpower: historical
      ? [{ trade_name: 'Piling Worker', bumi_count: 1, non_bumi_count: 0, foreign_count: 4 }]
      : [
          { trade_name: 'Carpenter (Tukang Kayu)', bumi_count: 4, non_bumi_count: 2, foreign_count: 6 },
          { trade_name: 'Concretor (Tukang Konkrit)', bumi_count: 3, non_bumi_count: 1, foreign_count: 8 },
        ],
    print_context: {
      location: historical ? 'Blok Pentadbiran · Grid 1–4' : 'Blok Pentadbiran · Grid 4–8',
      work_start_time: '08:00',
      work_end_time: '17:00',
      weather_condition: 'ELOK',
      rain_start_time: null,
      rain_end_time: null,
      contractor_scope: historical ? 'NSC' : 'CONTRACTOR',
    },
    submitted_by: USER_ID,
    submitted_at: historical ? '2026-07-12T09:10:00.000Z' : '2026-09-02T09:10:00.000Z',
    updated_at: historical ? null : '2026-09-02T10:40:00.000Z',
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
  await page.route(`**/api/site-diary/${SITE_DIARY_ID}`, async (route) => json(route, { data: canonicalDetail(false) }));
  await page.route(`**/api/site-diary/${HISTORY_DIARY_ID}`, async (route) => json(route, { data: canonicalDetail(true) }));
  await page.route(`**/api/site-diary/${SITE_DIARY_ID}/history`, async (route) => json(route, {
    data: {
      siteDiaryId: SITE_DIARY_ID,
      events: [
        { logId: '88888888-8888-4888-8888-888888888888', eventType: 'NEW', loggedAt: '2026-09-02T09:10:00.000Z', actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [] },
        { logId: '88888888-8888-4888-8888-888888888889', eventType: 'UPDATE', loggedAt: '2026-09-02T10:40:00.000Z', actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [{ kind: 'FIELD', field: 'notes', description: 'Catatan kemajuan dikemaskini.' }] },
      ],
    },
  }));
  await page.route(`**/api/site-diary/${HISTORY_DIARY_ID}/history`, async (route) => json(route, {
    data: {
      siteDiaryId: HISTORY_DIARY_ID,
      events: [
        { logId: '99999999-8888-4888-8888-888888888888', eventType: 'NEW', loggedAt: '2026-07-12T09:10:00.000Z', actorLabel: 'Pegawai Tapak', snapshotAvailable: true, changes: [] },
      ],
    },
  }));
}

async function boot(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'RECORDS', { timeout: EXPECT_TIMEOUT });
  await expect(page.locator('[aria-label="Pengurusan Rekod Buku Harian"]')).toBeVisible({ timeout: EXPECT_TIMEOUT });
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth + 1);
  expect(dimensions.rootScrollWidth).toBeLessThanOrEqual(dimensions.rootClientWidth + 1);
}

async function completionGreen(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--ng-established)';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
}

async function expectBalancedFilters(page: Page, width: number) {
  const filters = page.locator('[data-record-filters]');
  await expect(filters).toBeVisible();
  expect(await filters.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('0px');

  const labels = [
    page.getByLabel('Tarikh mula').locator('..'),
    page.getByLabel('Tarikh akhir').locator('..'),
    page.getByLabel('Tapis sumber').locator('..'),
    page.getByLabel('Tapis pelaksana').locator('..'),
  ];
  const boxes = await Promise.all(labels.map((label) => label.boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  const rects = boxes.map((box) => box!);

  if (width >= 640) {
    expect(Math.max(...rects.map((rect) => rect.y)) - Math.min(...rects.map((rect) => rect.y))).toBeLessThanOrEqual(1);
    for (let index = 1; index < rects.length; index += 1) {
      expect(rects[index]!.x).toBeGreaterThan(rects[index - 1]!.x);
    }
  } else {
    expect(Math.abs(rects[0]!.y - rects[1]!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(rects[2]!.y - rects[3]!.y)).toBeLessThanOrEqual(1);
    expect(rects[2]!.y).toBeGreaterThan(rects[0]!.y + rects[0]!.height - 1);
  }
}

async function expectCurrentLedger(page: Page, width: number) {
  const records = page.locator('[aria-label="Pengurusan Rekod Buku Harian"]');
  await expect(records).toContainText('Pelaksana');
  await expect(records).toContainText('Kontraktor Utama');
  await expect(records).not.toContainText('CONTRACTOR');
  await expect(page.locator('[data-testid="current-revision-label"]')).toContainText('Semakan 3');
  await expectBalancedFilters(page, width);

  const green = await completionGreen(page);
  const revisionRail = await page.locator('[data-testid="current-revision-label"]').evaluate((node) => getComputedStyle(node, '::before').backgroundColor);
  expect(revisionRail).not.toBe(green);

  const record = page.locator('[aria-label="Senarai rekod Buku Harian"] > article').first();
  await expect(record).toHaveAttribute('data-record-mode', 'current');
  await expect(record).toContainText('Kerja konkrit rasuk aras bawah');
  await expect(record).toContainText('Kontraktor Utama');
  const recordStyle = await record.evaluate((node) => ({
    radius: getComputedStyle(node).borderRadius,
    shadow: getComputedStyle(node).boxShadow,
    railColor: getComputedStyle(node, '::before').backgroundColor,
  }));
  expect(recordStyle.radius).toBe('0px');
  expect(recordStyle.shadow).toBe('none');
  expect(recordStyle.railColor).not.toBe(green);
  await expectNoHorizontalOverflow(page);
}

async function expectHistoricalDetail(page: Page) {
  const green = await completionGreen(page);
  await page.getByRole('tab', { name: 'Semakan Terdahulu' }).click();
  await page.getByRole('combobox', { name: 'Pilih semakan sejarah' }).selectOption(HISTORY_REVISION_ID);
  const historical = page.locator('[aria-label="Senarai rekod Buku Harian"] > article').first();
  await expect(historical).toHaveAttribute('data-record-mode', 'historical');
  await expect(historical).toContainText('Sejarah / Baca Sahaja');
  await historical.getByRole('button', { name: 'Lihat Butiran' }).click();

  const detail = page.locator('[aria-label="Butiran Buku Harian Tapak"]');
  await expect(detail).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(detail).toContainText('Sejarah / Baca Sahaja');
  await expect(detail.getByRole('button', { name: 'Edit Rekod' })).toHaveCount(0);
  await expect(page.locator('[aria-label="Tukar konteks rekod dari butiran"]')).toHaveCount(0);
  await expect(detail.getByRole('button', { name: 'Kembali ke Senarai' })).toHaveCount(1);
  const rail = await detail.locator('> header').evaluate((node) => getComputedStyle(node, '::before').backgroundColor);
  expect(rail).not.toBe(green);
  await expect(detail.getByRole('link', { name: 'Cetak Buku Harian Tapak' })).toHaveAttribute('href', `/site-diary/print?id=${HISTORY_DIARY_ID}`);
  await expectNoHorizontalOverflow(page);
}

async function expectCurrentDetailAndEdit(page: Page) {
  const green = await completionGreen(page);
  const record = page.locator('[aria-label="Senarai rekod Buku Harian"] > article').first();
  await record.getByRole('button', { name: 'Lihat Butiran' }).click();
  const detail = page.locator('[aria-label="Butiran Buku Harian Tapak"]');
  await expect(detail).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(page.locator('[aria-label="Tukar konteks rekod dari butiran"]')).toHaveCount(0);
  await expect(detail).toContainText('Pelaksana');
  await expect(detail).toContainText('Kontraktor Utama');
  await expect(detail).not.toContainText('CONTRACTOR');
  await expect(detail.locator('[data-record-workforce-matrix]').first()).toContainText('B');
  await expect(detail.locator('[data-record-workforce-matrix]').first()).toContainText('BB');
  await expect(detail.locator('[data-record-workforce-matrix]').first()).toContainText('A');
  await expect(detail.locator('[data-record-workforce-matrix]').first()).toContainText('JUMLAH');

  const detailRail = await detail.locator('> header').evaluate((node) => getComputedStyle(node, '::before').backgroundColor);
  expect(detailRail).not.toBe(green);
  const auditDot = await detail.locator('[aria-labelledby="site-diary-history-heading"] ol > li').first().evaluate((node) => getComputedStyle(node, '::before').backgroundColor);
  expect(auditDot).not.toBe(green);
  const print = detail.getByRole('link', { name: 'Cetak Buku Harian Tapak' });
  await expect(print).toHaveAttribute('href', `/site-diary/print?id=${SITE_DIARY_ID}`);
  const printStyle = await print.evaluate((node) => ({
    radius: getComputedStyle(node).borderRadius,
    background: getComputedStyle(node).backgroundColor,
    border: getComputedStyle(node).borderColor,
  }));
  expect(printStyle.radius).toBe('0px');
  expect(printStyle.background).not.toBe(green);
  expect(printStyle.border).not.toBe(green);

  await detail.getByRole('button', { name: 'Edit Rekod' }).click();
  const editAuthority = page.locator('[data-record-edit-authority="N09A"]');
  await expect(editAuthority).toBeVisible({ timeout: EXPECT_TIMEOUT });
  const form = editAuthority.locator('form[data-ui-context="RECORDS_EDIT"]');
  await expect(form).toBeVisible();
  await expect(form.getByText('Pelaksana *', { exact: true })).toBeVisible();
  await expect(form.getByRole('option', { name: 'Kontraktor Utama' })).toHaveCount(1);
  await expect(form).not.toContainText('CONTRACTOR');

  const roundedOffenders = await form.locator('section, input, select, textarea, button').evaluateAll((nodes) => nodes.flatMap((node) => {
    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    if (!visible || style.borderRadius === '0px') return [];
    return [{ tag: element.tagName, radius: style.borderRadius, text: element.textContent?.trim().slice(0, 50) ?? '' }];
  }));
  expect(roundedOffenders, `Rounded REKOD edit surfaces remain:\n${JSON.stringify(roundedOffenders, null, 2)}`).toEqual([]);

  await form.getByRole('button', { name: 'Batal' }).click();
  await expect(page.locator('[data-record-edit-authority="N09A"]')).toHaveCount(0);
  await expect(page.locator('[aria-label="Butiran Buku Harian Tapak"]')).toContainText('Konkrit rasuk aras bawah diteruskan');
  await expectNoHorizontalOverflow(page);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ storageKey, session }) => window.localStorage.setItem(storageKey, session),
    { storageKey: supabaseAuthStorageKey(), session: visualGateSession() },
  );
  await installRoutes(page);
});

test('N09A current REKOD is balanced, field-language aligned and completion-green safe at phone/half/wide', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await boot(page, viewport.width, viewport.height);
    await expectCurrentLedger(page, viewport.width);
  }
});

test('N09A historical REKOD opens through normal UI as read-only with one back path at phone/half/wide', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await boot(page, viewport.width, viewport.height);
    await expectHistoricalDetail(page);
  }
});

test('N09A current detail preserves canonical print/edit authority and sharp REKOD edit presentation at phone/half/wide', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await boot(page, viewport.width, viewport.height);
    await expectCurrentDetailAndEdit(page);
  }
});
