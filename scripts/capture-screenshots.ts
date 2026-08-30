import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.B01B_BASE_URL ?? 'http://localhost:3000';
const EVIDENCE_DIR = path.join(process.cwd(), 'docs', 'evidence', 'f4.5-b01b');
const PROGRAMME = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'C01 Test Programme',
  currentRevisionId: '33333333-3333-4333-8333-333333333333',
  historicalRevisionId: '77777777-7777-4777-8777-777777777777',
};
const USERS = {
  submitter: { email: 'submitter@jkr.gov.my', password: 'password123' },
  reviewer: { email: 'reviewer@jkr.gov.my', password: 'password123' },
};
const MOBILE = { width: 375, height: 812 };
const DESKTOP = { width: 1280, height: 720 };

function evidencePath(filename: string): string {
  return path.join(EVIDENCE_DIR, filename);
}

async function login(page: Page, user: (typeof USERS)[keyof typeof USERS]): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Alamat Emel')).toBeVisible();
  await page.getByLabel('Alamat Emel').fill(user.email);
  await page.getByLabel('Kata Laluan').fill(user.password);

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

async function assertSelectedDestination(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
}

async function captureMobileEvidence(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const context = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await login(page, USERS.submitter);
  await selectProgramme(page);

  await assertSelectedDestination(page, 'Rekod / Sejarah');
  await expect(page.getByRole('tab', { name: 'Rekod Semasa', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Concrete Works', exact: true })).toBeVisible();
  await assertNoVisibleError(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidencePath('mobile-shell-records-375x812.png') });

  const taskResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === `/api/task/revision/${PROGRAMME.currentRevisionId}`;
  });
  await page.getByRole('tab', { name: 'Laporan Baharu', exact: true }).click();
  const taskResponse = await taskResponsePromise;
  expect(taskResponse.status()).toBe(200);
  await assertSelectedDestination(page, 'Laporan Baharu');
  const sourceHeading = page.getByRole('heading', {
    name: 'Pilih Sumber Aktiviti Harian',
    exact: true,
  });
  await expect(sourceHeading).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kerja Jadual (MSP)', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Kerja Tambahan / VO (APK)', exact: true }),
  ).toBeVisible();
  await sourceHeading.click();
  await assertNoVisibleError(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidencePath('mobile-shell-new-entry-375x812.png') });

  await context.close();
}

async function captureDesktopRecordsAndHistory(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
) {
  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await login(page, USERS.submitter);
  await selectProgramme(page);
  await expect(
    page.getByRole('navigation', { name: 'Navigasi Buku Harian Tapak', exact: true }),
  ).toBeVisible();
  await assertSelectedDestination(page, 'Rekod / Sejarah');
  await expect(page.getByRole('tab', { name: 'Rekod Semasa', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('heading', { name: 'Concrete Works', exact: true })).toBeVisible();
  await assertNoVisibleError(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidencePath('desktop-shell-records-1280x720.png') });

  await page.getByRole('tab', { name: 'Semakan Terdahulu', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Semakan Terdahulu', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const historySelector = page.getByRole('combobox', {
    name: 'Pilih semakan sejarah',
    exact: true,
  });
  await expect(historySelector).toBeVisible();
  const historyResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === `/api/site-diary/revision/${PROGRAMME.historicalRevisionId}` &&
      url.searchParams.get('programmeId') === PROGRAMME.id
    );
  });
  await historySelector.selectOption(PROGRAMME.historicalRevisionId);
  const historyResponse = await historyResponsePromise;
  expect(historyResponse.status()).toBe(200);
  await expect(historySelector).toHaveValue(PROGRAMME.historicalRevisionId);
  const historicalRecord = page.getByRole('heading', {
    name: 'Historical exact concrete activity',
    exact: true,
  });
  await expect(historicalRecord).toBeVisible();
  await historicalRecord.click();
  await assertNoVisibleError(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidencePath('desktop-shell-history-1280x720.png') });

  await context.close();
}

async function captureDesktopApproval(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const context = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await login(page, USERS.reviewer);
  await selectProgramme(page);
  await expect(page.locator('[title="reviewer@jkr.gov.my"]')).toBeVisible();
  const approvalResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === `/api/programme/${PROGRAMME.id}/approval-queue`;
  });
  await page.getByRole('tab', { name: 'Kelulusan', exact: true }).click();
  const approvalResponse = await approvalResponsePromise;
  expect(approvalResponse.status()).toBe(200);
  await assertSelectedDestination(page, 'Kelulusan');
  await expect(page.getByText('Concrete Works', { exact: true })).toBeVisible();
  await expect(page.getByText('Menunggu (Pending)', { exact: true })).toBeVisible();
  const reviewButton = page.getByRole('button', { name: 'Semak (Review)', exact: true });
  await expect(reviewButton).toBeVisible();
  await page.getByText('Concrete Works', { exact: true }).click();
  await assertNoVisibleError(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: evidencePath('desktop-shell-approval-1280x720.png') });

  await context.close();
}

async function sha256(filename: string): Promise<string> {
  return createHash('sha256').update(await readFile(evidencePath(filename))).digest('hex');
}

async function main(): Promise<void> {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    await captureMobileEvidence(browser);
    await captureDesktopRecordsAndHistory(browser);
    await captureDesktopApproval(browser);

    const recordsHash = await sha256('mobile-shell-records-375x812.png');
    const newEntryHash = await sha256('mobile-shell-new-entry-375x812.png');
    expect(recordsHash, 'Records and New Entry evidence must be distinct').not.toBe(newEntryHash);

    console.log('B01B real-runtime evidence captured successfully.');
    console.log(`mobile-shell-records-375x812.png sha256=${recordsHash}`);
    console.log(`mobile-shell-new-entry-375x812.png sha256=${newEntryHash}`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
