import { expect, test, Page } from '@playwright/test';

const CURRENT_DIARY_ID = '55555555-5555-5555-5555-555555555551';
const HISTORICAL_DIARY_ID = '55555555-5555-5555-5555-555555555553';
const MISSING_DIARY_ID = '33333333-3333-4333-8333-333333333333';

test.describe('F2.7-B02-B Print/PDF Acceptance', () => {
  const USERS = {
    submitter: { email: 'submitter@jkr.gov.my', password: 'password123' },
  };

  async function login(page: Page, user = USERS.submitter) {
    await page.goto('/login');
    await page.getByLabel('Alamat Emel').fill(user.email);
    await page.getByLabel('Kata Laluan').fill(user.password);
    await page.getByRole('button', { name: 'Log Masuk Sekarang' }).click();
    await page.waitForURL((url) => url.pathname === '/site-diary', { timeout: 30_000 });
  }

  test('current exact record print loads correctly', async ({ page }) => {
    await login(page);

    const apiResponsePromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.includes('/api/site-diary/') && url.pathname.includes('/print');
    });

    await page.goto('/site-diary/print?id=' + CURRENT_DIARY_ID);
    const response = await apiResponsePromise;
    expect(response.status()).toBe(200);

    // Wait for data to load
    await expect(page.locator('.status')).toHaveText('1 aktiviti');
  });

  test('historical exact record print loads correctly with original revision', async ({ page }) => {
    await login(page);

    const apiResponsePromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.includes('/api/site-diary/') && url.pathname.includes('/print');
    });

    await page.goto('/site-diary/print?id=' + HISTORICAL_DIARY_ID);
    const response = await apiResponsePromise;
    expect(response.status()).toBe(200);

    await expect(page.locator('.status')).toHaveText('1 aktiviti');
    await expect(page.getByText('Historical C01 diary')).toBeVisible();
  });

  test('missing record yields bounded error UI', async ({ page }) => {
    await login(page);

    const apiResponsePromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.includes('/api/site-diary/') && url.pathname.includes('/print');
    });

    await page.goto('/site-diary/print?id=' + MISSING_DIARY_ID);
    const response = await apiResponsePromise;
    expect(response.status()).toBe(404);

    const errorState = page.getByTestId('error-state');
    await expect(errorState).toBeVisible();
  });

  test('generates deterministic PDF for current record (A4 size)', async ({ page }) => {
    await login(page);
    await page.goto('/site-diary/print?id=' + CURRENT_DIARY_ID);
    await expect(page.locator('.status')).toHaveText('1 aktiviti');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    expect(pdfBuffer.byteLength).toBeGreaterThan(1000); 
  });

  test('handles workforce overflow by generating continuation pages', async ({ page }) => {
    await login(page);
    await page.goto('/site-diary/print?id=' + CURRENT_DIARY_ID);
    await expect(page.locator('.status')).toHaveText('1 aktiviti');
    
    // With 10 trades, page 1 can fit 9. The 10th should be on page 2.
    // Total pages should be 2.
    const pageNumbers = page.locator('.page-number');
    await expect(pageNumbers).toHaveCount(2);
    await expect(pageNumbers.nth(0)).toHaveText('1/2');
    await expect(pageNumbers.nth(1)).toHaveText('2/2');
  });
});