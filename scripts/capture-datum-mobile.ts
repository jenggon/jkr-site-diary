import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.DATUM_BASE_URL ?? 'http://localhost:3000';
const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'f4.5-datum-01');
const PROGRAMME = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'C01 Test Programme',
  currentRevisionId: '33333333-3333-4333-8333-333333333333',
};
const SUBMITTER = { email: 'submitter@jkr.gov.my', password: 'password123' };
const MOBILE = { width: 375, height: 812 };

const evidencePath = (filename: string) => path.join(EVIDENCE_DIR, filename);

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Alamat Emel')).toBeVisible();
  await page.getByLabel('Alamat Emel').fill(SUBMITTER.email);
  await page.getByLabel('Kata Laluan').fill(SUBMITTER.password);

  const authResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === 'POST' &&
      url.pathname === '/auth/v1/token' &&
      url.searchParams.get('grant_type') === 'password'
    );
  });

  await page.getByRole('button', { name: 'Log Masuk Sekarang' }).click();
  const authResponse = await authResponsePromise;
  expect(authResponse.status()).toBe(200);
  expect(new URL(authResponse.url()).origin).toBe('http://127.0.0.1:54321');
  await page.waitForURL((url) => url.pathname === '/site-diary', { timeout: 30_000 });
}

async function selectProgramme(page: Page): Promise<void> {
  const heading = page.getByRole('heading', { name: PROGRAMME.name, exact: true });
  const selector = page.getByRole('button', { name: new RegExp(PROGRAMME.name, 'i') });

  await expect
    .poll(async () => (await heading.isVisible()) || (await selector.isVisible()), {
      message: 'Programme must be selected automatically or offered in the real selector',
      timeout: 30_000,
    })
    .toBe(true);

  if (await selector.isVisible()) {
    const summaryResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/project-summary' &&
        url.searchParams.get('programmeId') === PROGRAMME.id
      );
    });
    await selector.click();
    const summaryResponse = await summaryResponsePromise;
    expect(summaryResponse.status()).toBe(200);
    await expect(summaryResponse.json()).resolves.toMatchObject({
      revision_id: PROGRAMME.currentRevisionId,
      task_name: PROGRAMME.name,
    });
  }

  await expect(heading).toBeVisible();
  await expect(page.getByText('Semakan Sah', { exact: true })).toBeVisible();
  await expect(page.getByText('Semakan Semasa', { exact: true })).toBeVisible();
}

async function assertNoVisibleError(page: Page): Promise<void> {
  await expect(
    page.locator('[role="alert"]:not(#__next-route-announcer__):visible'),
    'No application error alert may be visible in evidence',
  ).toHaveCount(0);
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth);
  expect(dimensions.rootScrollWidth).toBeLessThanOrEqual(dimensions.rootClientWidth);
}

async function capture(page: Page, filename: string, anchor?: Locator): Promise<void> {
  if (anchor) {
    await anchor.scrollIntoViewIfNeeded();
    await page.waitForTimeout(120);
  }
  await assertNoVisibleError(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidencePath(filename) });
}

async function sha256(filename: string): Promise<string> {
  return createHash('sha256').update(await readFile(evidencePath(filename))).digest('hex');
}

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  const evidenceFiles = [
    'datum-mobile-source-375x812.png',
    'datum-mobile-task-loaded-375x812.png',
    'datum-mobile-work-status-375x812.png',
    'datum-mobile-site-weather-375x812.png',
    'datum-mobile-workforce-375x812.png',
    'datum-mobile-notes-confirm-375x812.png',
  ];

  try {
    await login(page);
    await selectProgramme(page);

    await expect(page.getByRole('heading', { name: 'DATUM', exact: true })).toBeVisible();
    await expect(page.getByText('Digital Fieldbook · Project Ground Truth', { exact: true })).toBeVisible();

    const taskResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/task/revision/${PROGRAMME.currentRevisionId}`;
    });
    await page.getByRole('tab', { name: 'Laporan Baharu', exact: true }).click();
    const taskResponse = await taskResponsePromise;
    expect(taskResponse.status()).toBe(200);
    await expect(page.getByRole('tab', { name: 'Laporan Baharu', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const sourceHeading = page.getByRole('heading', {
      name: 'Pilih Sumber Aktiviti Harian',
      exact: true,
    });
    await expect(sourceHeading).toBeVisible();
    await expect(page.locator('.mobile-entry-task-row')).toHaveCount(5);
    await capture(page, evidenceFiles[0] ?? 'datum-mobile-source-375x812.png', sourceHeading);

    const firstTask = page.locator('.mobile-entry-task-row').first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();
    const selectedSource = page.locator('.mobile-entry-selected-source');
    await expect(selectedSource).toBeVisible();
    await expect(page.locator('.mobile-entry-spike-panel')).toHaveCount(0);
    await capture(page, evidenceFiles[1] ?? 'datum-mobile-task-loaded-375x812.png', selectedSource);

    const workStatus = page.getByRole('heading', { name: 'Tarikh & Status Kerja', exact: true });
    await expect(workStatus).toBeVisible();
    await capture(page, evidenceFiles[2] ?? 'datum-mobile-work-status-375x812.png', workStatus);

    const siteWeather = page.getByRole('heading', {
      name: 'Maklumat Tapak & Cuaca (Format JKR Page 1)',
      exact: true,
    });
    await expect(siteWeather).toBeVisible();
    await capture(page, evidenceFiles[3] ?? 'datum-mobile-site-weather-375x812.png', siteWeather);

    const workforce = page.getByRole('heading', {
      name: 'Tenaga Kerja di Tapak (Workforce)',
      exact: true,
    });
    await expect(workforce).toBeVisible();
    await capture(page, evidenceFiles[4] ?? 'datum-mobile-workforce-375x812.png', workforce);

    const notes = page.getByRole('heading', {
      name: 'Catatan & Huraian Kemajuan Kerja *',
      exact: true,
    });
    await expect(notes).toBeVisible();
    const submit = page.getByRole('button', { name: 'Hantar & Simpan Buku Harian Tapak', exact: true });
    await expect(submit).toBeVisible();
    await notes.scrollIntoViewIfNeeded();
    await submit.scrollIntoViewIfNeeded();
    await capture(page, evidenceFiles[5] ?? 'datum-mobile-notes-confirm-375x812.png');

    for (const filename of evidenceFiles) {
      console.log(`${filename} sha256=${await sha256(filename)}`);
    }
    console.log('DATUM real-runtime mobile evidence captured successfully.');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
