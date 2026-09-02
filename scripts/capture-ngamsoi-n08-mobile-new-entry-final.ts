import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect } from '@playwright/test';
import { chromium, type BrowserContext, type Page, type Route } from 'playwright';
import { installN05R2PreviewRoutes } from './n05r2-preview-routes';

const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'n08-mobile-new-entry-final');
const BASE_URL = process.env.N08_BASE_URL ?? 'http://127.0.0.1:3000';
const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111';
const REVISION_ID = '22222222-2222-4222-8222-222222222222';
const TASK_ID = '33333333-3333-4333-8333-333333333333';
const VISUAL_USER_ID = '77777777-7777-4777-8777-777777777777';
const VISUAL_USER_EMAIL = 'pt.ngamsoi@jkr.gov.my';
const LONG_TASK = 'Kerja konkrit rasuk aras bawah · Zon B · Blok Pentadbiran Utama · Grid 4–8 · Sambungan rasuk dan kepala tiang aras bawah';
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
    access_token: 'n08-visual-gate-access-token',
    refresh_token: 'n08-visual-gate-refresh-token',
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
      created_by: 'n08-runtime-gate',
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

async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
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
  await expect(pulse.getByText('PROGRAM KERJA', { exact: true })).toBeVisible();
  await expect(page.locator('.ng-project-revision')).toHaveText('R03');
  await expect(pulse.getByText('TINGGAL', { exact: true })).toBeVisible();
  await expect(pulse.getByText('HARI KE', { exact: true })).toBeVisible();
  await expect(pulse.getByText(/^(AHAD|ISNIN|SELASA|RABU|KHAMIS|JUMAAT|SABTU)$/)).toBeVisible();
  await expect(pulse.getByText(/^\d{2}\/\d{2}\/\d{2}$/)).toBeVisible();
  await expect(pulse.getByText('MASA', { exact: true })).toBeVisible();
  await expect(pulse.getByText(/^\d{2}:\d{2}$/)).toBeVisible();
}

async function enterNewWorkspace(page: Page) {
  const mobileNav = page.locator('.ng-workspace-nav--mobile');
  await expect(mobileNav).toBeVisible();
  await mobileNav.locator('[data-workspace-nav="NEW"]').click();
  await expect(page.locator('.ng-workspace')).toHaveAttribute('data-workspace-tab', 'NEW');
  await expect(mobileNav.locator('[data-workspace-nav="NEW"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('form[aria-label="Borang Buku Harian Tapak"]')).toBeVisible();
}

async function assertExpandedSourceGrammar(page: Page) {
  const sourceSection = page.locator('section[aria-label="Pemilih Sumber Operasi"]');
  const expandedHeading = sourceSection.locator('.mobile-entry-spike-panel > div:first-child h3');
  const harianHeading = page.getByRole('heading', { name: 'Harian', exact: true });
  await expect(expandedHeading).toBeVisible();
  await expect(harianHeading).toBeVisible();

  const sourceMetrics = await expandedHeading.evaluate((node) => ({
    dashWidth: getComputedStyle(node, '::before').width,
    dashHeight: getComputedStyle(node, '::before').height,
    label: getComputedStyle(node, '::after').content,
    fontSize: getComputedStyle(node, '::after').fontSize,
  }));
  const harianMetrics = await harianHeading.evaluate((node) => ({
    dashWidth: getComputedStyle(node, '::before').width,
    dashHeight: getComputedStyle(node, '::before').height,
    fontSize: getComputedStyle(node).fontSize,
  }));

  expect(sourceMetrics.label).toBe('"SUMBER"');
  expect(sourceMetrics.dashWidth).toBe(harianMetrics.dashWidth);
  expect(sourceMetrics.dashHeight).toBe(harianMetrics.dashHeight);
  expect(sourceMetrics.fontSize).toBe(harianMetrics.fontSize);
  expect(await page.locator('.mobile-entry-spike-panel').evaluate((node) => getComputedStyle(node).animationName))
    .toContain('ng-n05r5-source-state');
}

async function exerciseVoDialog(page: Page, label: string) {
  await page.getByRole('tab', { name: 'VO / APK', exact: true }).click();
  await page.getByRole('button', { name: 'Daftar VO', exact: true }).click();

  const backdrop = page.locator('.ng-vo-dialog-backdrop');
  const dialog = page.getByRole('dialog', { name: 'VO / APK Baharu' });
  const mobileNav = page.locator('.ng-workspace-nav--mobile');
  await expect(backdrop).toBeVisible();
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.y).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  const layers = await Promise.all([
    backdrop.evaluate((node) => Number.parseInt(getComputedStyle(node).zIndex || '0', 10)),
    mobileNav.evaluate((node) => Number.parseInt(getComputedStyle(node).zIndex || '0', 10)),
    page.evaluate(() => getComputedStyle(document.body).overflow),
  ]);
  expect(layers[0]).toBeGreaterThan(layers[1]);
  expect(layers[2]).toBe('hidden');

  await page.screenshot({ path: path.join(EVIDENCE_DIR, `n08-02-vo-dialog-${label}.png`), fullPage: false });
  await page.getByRole('button', { name: 'Tutup pendaftaran VO' }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('tab', { name: 'MSP', exact: true }).click();
}

async function selectMspAndAssertTransition(page: Page) {
  const sourceSection = page.locator('section[aria-label="Pemilih Sumber Operasi"]');
  const taskButton = page.getByRole('button', { name: new RegExp('Kerja konkrit rasuk aras bawah') }).first();
  await expect(taskButton).toBeVisible();

  // Capture the expanded geometry immediately before the state transition. The VO sheet
  // intentionally changes body overflow while open, so a box captured before that modal
  // lifecycle is not a valid source-transition datum on classic-scrollbar CI runners.
  const expandedBox = await sourceSection.boundingBox();
  const pick = taskButton.locator('.mobile-entry-row-action');
  const pickStyle = await pick.evaluate((node) => {
    const style = getComputedStyle(node);
    return { borderColor: style.borderColor, color: style.color, fontWeight: style.fontWeight };
  });
  expect((await pick.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(40);

  await taskButton.click();
  const selected = page.locator('.mobile-entry-selected-source');
  const switchButton = page.getByRole('button', { name: 'Tukar sumber aktiviti' });
  await expect(selected).toBeVisible();
  await expect(switchButton).toBeVisible();

  const selectedBox = await sourceSection.boundingBox();
  if (expandedBox && selectedBox) {
    expect(Math.abs(selectedBox.x - expandedBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(selectedBox.width - expandedBox.width)).toBeLessThanOrEqual(1);
  }

  await expect(selected.locator('h3')).toHaveText(LONG_TASK);
  const selectedMetrics = await selected.evaluate((node) => ({
    dashWidth: getComputedStyle(node, '::before').width,
    dashHeight: getComputedStyle(node, '::before').height,
    label: getComputedStyle(node, '::after').content,
    fontSize: getComputedStyle(node, '::after').fontSize,
    animationName: getComputedStyle(node).animationName,
  }));
  const harianHeading = page.getByRole('heading', { name: 'Harian', exact: true });
  const harianMetrics = await harianHeading.evaluate((node) => ({
    dashWidth: getComputedStyle(node, '::before').width,
    dashHeight: getComputedStyle(node, '::before').height,
    fontSize: getComputedStyle(node).fontSize,
  }));
  expect(selectedMetrics.label).toBe('"SUMBER"');
  expect(selectedMetrics.dashWidth).toBe(harianMetrics.dashWidth);
  expect(selectedMetrics.dashHeight).toBe(harianMetrics.dashHeight);
  expect(selectedMetrics.fontSize).toBe(harianMetrics.fontSize);
  expect(selectedMetrics.animationName).toContain('ng-n05r5-source-state');

  const switchStyle = await switchButton.evaluate((node) => {
    const style = getComputedStyle(node);
    return { borderColor: style.borderColor, color: style.color, fontWeight: style.fontWeight };
  });
  expect(switchStyle).toEqual(pickStyle);

  await switchButton.click();
  await expect(page.locator('.mobile-entry-spike-panel')).toBeVisible();
  const reopenedBox = await sourceSection.boundingBox();
  if (selectedBox && reopenedBox) {
    expect(Math.abs(reopenedBox.x - selectedBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(reopenedBox.width - selectedBox.width)).toBeLessThanOrEqual(1);
  }
  await page.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(selected).toBeVisible();
}

async function fillNewEntry(page: Page) {
  await page.getByLabel('Tarikh *').fill('2026-09-02');
  await page.getByLabel('Mula *').fill('2026-09-02');
  await page.getByLabel('Lokasi *').fill('Blok Pentadbiran · Grid 4–8');
  await page.getByLabel('Cuaca').selectOption('ELOK');
  await page.getByLabel('Kerja Mula').fill('08:00');
  await page.getByLabel('Kerja Tamat').fill('17:00');

  const workforce = page.locator('.ng-workforce');
  await workforce.scrollIntoViewIfNeeded();
  await workforce.locator('[data-testid="workforce-cell-0-foreign_count"]').click();
  const workforceInput = workforce.locator('[data-testid="workforce-active-value"]');
  await workforceInput.fill('12');
  await expect(workforce.locator('[data-testid="workforce-a-total"]')).toHaveText('12');
  await expect(workforce.locator('[data-testid="overall-workforce-total"]')).toHaveText('12');

  const notes = page.getByLabel('Catatan *');
  await notes.fill('Konkrit rasuk aras bawah diteruskan di Grid 4–8.');
  await notes.press('Tab');
}

async function assertUniformSectionsAndSpine(page: Page) {
  const form = page.locator('form[aria-label="Borang Buku Harian Tapak"]');
  const headings = [
    page.getByRole('heading', { name: 'Harian', exact: true }),
    page.getByRole('heading', { name: 'Tapak', exact: true }),
    page.locator('.ng-workforce__title'),
    page.getByRole('heading', { name: /Catatan/i }),
  ];

  const headingMetrics: Array<{ fontSize: string; dashWidth: string; dashHeight: string }> = [];
  for (const heading of headings) {
    await heading.scrollIntoViewIfNeeded();
    headingMetrics.push(await heading.evaluate((node) => ({
      fontSize: getComputedStyle(node).fontSize,
      dashWidth: getComputedStyle(node, '::before').width,
      dashHeight: getComputedStyle(node, '::before').height,
    })));
  }
  expect(new Set(headingMetrics.map((item) => item.fontSize)).size).toBe(1);
  expect(new Set(headingMetrics.map((item) => item.dashWidth)).size).toBe(1);
  expect(new Set(headingMetrics.map((item) => item.dashHeight)).size).toBe(1);

  const sections = [
    form.locator('> section[aria-label="Pemilih Sumber Operasi"]'),
    form.locator('> section').filter({ has: page.getByRole('heading', { name: 'Harian', exact: true }) }),
    form.locator('> section').filter({ has: page.getByRole('heading', { name: 'Tapak', exact: true }) }),
    form.locator('> section.ng-workforce'),
    form.locator('> section').filter({ has: page.getByRole('heading', { name: /Catatan/i }) }),
  ];

  const spineMetrics: Array<{ left: string; width: string; display: string; backgroundImage: string }> = [];
  for (const section of sections) {
    await expect(section).toBeVisible();
    spineMetrics.push(await section.evaluate((node) => ({
      left: getComputedStyle(node, '::after').left,
      width: getComputedStyle(node, '::after').width,
      display: getComputedStyle(node, '::after').display,
      backgroundImage: getComputedStyle(node, '::after').backgroundImage,
    })));
  }
  expect(new Set(spineMetrics.map((item) => item.left)).size).toBe(1);
  expect(new Set(spineMetrics.map((item) => item.width)).size).toBe(1);
  for (const metric of spineMetrics) {
    expect(metric.display).toBe('block');
    expect(metric.backgroundImage).toContain('linear-gradient');
  }
}

async function assertCompletion(page: Page) {
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  const completion = page.locator('[data-testid="ngamsoi-completion"]');
  await expect(completion).toBeVisible();
  await expect(completion).toHaveAttribute('data-completion-mode', 'create');
  await expect(completion.locator('.ng-completion__signature')).toContainText('Kena boh!');
  await expect(completion.locator('.ng-completion__signature')).toContainText('Ngamsoi.');
  await expect(completion.locator('.ng-completion__check')).toHaveCount(0);
  await expect(completion).not.toContainText('✓');
  expect(await completion.locator('.ng-completion__mark-shell').evaluate((node) => getComputedStyle(node).animationName))
    .toContain('ng-n05r5-mark-establish');

  const actions = page.locator('.ng-completion-actions');
  await expect(actions).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Mohon kelulusan' })).toBeVisible();
  await expect(actions.getByRole('link', { name: 'Lihat format JKR' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Aktiviti terbuka' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Laporan baharu' })).toBeVisible();
  await completion.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
}

async function fullMobileGate(browser: import('playwright').Browser) {
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
    await enterNewWorkspace(page);
    await assertExpandedSourceGrammar(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n08-01-new-entry-empty-390x844.png'), fullPage: false });

    await exerciseVoDialog(page, '390x844');
    await selectMspAndAssertTransition(page);
    await fillNewEntry(page);
    await assertUniformSectionsAndSpine(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n08-03-filled-fieldbook-390x844.png'), fullPage: false });

    await assertCompletion(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n08-04-completion-390x844.png'), fullPage: false });
  } finally {
    await context.close();
  }
}

async function narrowMobileGate(browser: import('playwright').Browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    screen: { width: 375, height: 812 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await seedSession(context);
  const page = await context.newPage();

  try {
    await installCoreRoutes(page);
    await page.goto(`${BASE_URL}/site-diary`, { waitUntil: 'domcontentloaded' });
    await enterNewWorkspace(page);
    await assertExpandedSourceGrammar(page);
    await exerciseVoDialog(page, '375x812');
    await selectMspAndAssertTransition(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'n08-05-narrow-source-375x812.png'), fullPage: false });
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await fullMobileGate(browser);
    await narrowMobileGate(browser);
    console.log('N08 Mobile New Entry final gate: canonical mark/pulse, navigation, source before/after transition, VO modal, heading grammar, inline established spine, direct workforce entry, save ritual/tagline and mobile overflow verified.');
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
