import { test, expect, Page } from '@playwright/test';

test.describe('F2.7-B02-A Real Browser Core Acceptance', () => {

  // Increase timeout because first Next.js dev compile is slow
  test.setTimeout(90000);

  const USER = {
    email: 'submitter@jkr.gov.my',
    password: 'password123'
  };

  async function login(page: Page) {
    await page.goto('/login');
    await page.fill('input#email', USER.email);
    await page.fill('input#password', USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/site-diary', { timeout: 30000 });
  }

  test('Canonical landing proof', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/site-diary');
    await expect(page.locator('main')).toBeVisible();
    
    // Legacy root absence (checking if we are in the canonical workspace)
    const tabsNav = page.locator('nav[aria-label="Navigasi Buku Harian Tapak"]');
    await expect(tabsNav).toBeVisible();
  });

  test('Workspace tab proof', async ({ page }) => {
    await login(page);

    // Select Programme A if prompt exists
    const selectBtn = page.getByRole('button', { name: /UAT Synthetic Programme A/i });
    if (await selectBtn.isVisible()) {
      await selectBtn.click();
    }

    const tabsNav = page.locator('nav[aria-label="Navigasi Buku Harian Tapak"]');
    await expect(tabsNav).toBeVisible();

    const tabs = [
      { name: 'Laporan Baharu', id: 'NEW' },
      { name: 'Aktiviti Terbuka', id: 'OPEN' },
      { name: 'Rekod / Sejarah', id: 'RECORDS' },
      { name: 'Kelulusan', id: 'APPROVALS' }
    ];

    for (const tab of tabs) {
      const tabButton = page.getByRole('tab', { name: tab.name, exact: true });
      await expect(tabButton).toBeVisible();
      
      // Click the tab
      await tabButton.click();
      
      // Verify exactly one tab is active
      await expect(tabButton).toHaveAttribute('aria-selected', 'true');
      
      // Check other tabs are not selected
      for (const otherTab of tabs) {
        if (otherTab.id !== tab.id) {
          const otherTabButton = page.getByRole('tab', { name: otherTab.name, exact: true });
          await expect(otherTabButton).toHaveAttribute('aria-selected', 'false');
        }
      }
    }
  });

  test('Programme A -> B switch ownership', async ({ page }) => {
    await login(page);

    // Enter Programme A
    const progABtn = page.getByRole('button', { name: /UAT Synthetic Programme A/i });
    if (await progABtn.isVisible()) {
      await progABtn.click();
    }

    // Go to "Aktiviti Terbuka"
    await page.getByRole('tab', { name: 'Aktiviti Terbuka' }).click();

    // Verify Programme A content exists. For example, Programme A has "Concrete Works"
    await expect(page.getByText('Concrete Works', { exact: false }).first()).toBeVisible();

    // Switch to Programme B
    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await page.getByRole('button', { name: /C01 Programme B/i }).click();

    // Verify we are still on 'Aktiviti Terbuka' tab (or wait for load)
    await expect(page.getByRole('tab', { name: 'Aktiviti Terbuka' })).toHaveAttribute('aria-selected', 'true');

    // Verify Programme A entity state is gone and B is visible
    await expect(page.getByText('Concrete Works', { exact: false }).first()).not.toBeVisible();
    await expect(page.getByText('Prog B Activity', { exact: false }).first()).toBeVisible();
  });

  test('Stale async browser behavior', async ({ page }) => {
    await login(page);

    // Enter Programme A
    const progABtn = page.getByRole('button', { name: /UAT Synthetic Programme A/i });
    if (await progABtn.isVisible()) {
      await progABtn.click();
    }

    // Switch to Aktiviti Terbuka
    await page.getByRole('tab', { name: 'Aktiviti Terbuka' }).click();

    // We will intercept the NEXT network request that queries open activities
    let delayedA = false;
    await page.route('**/api/activities/open*', async (route, request) => {
      if (request.url().includes('11111111-1111-1111-1111-111111111111')) {
        delayedA = true;
        setTimeout(() => route.continue(), 3000);
      } else {
        route.continue();
      }
    });

    // To trigger the request, we can switch back to NEW and then to OPEN again,
    // or just assume the switch to Programme B happens while A is loading.
    // Let's force a reload of OPEN tab data by switching to NEW and back to OPEN
    await page.getByRole('tab', { name: 'Laporan Baharu' }).click();
    await page.getByRole('tab', { name: 'Aktiviti Terbuka' }).click();

    // Immediately switch to Programme B while A is still loading
    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await page.getByRole('button', { name: /C01 Programme B/i }).click();

    // Wait for the delay to finish
    await page.waitForTimeout(3500);

    // Ensure we are in B and A did not bleed in
    await expect(page.getByText('Prog B Activity', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Concrete Works', { exact: false }).first()).not.toBeVisible();
    expect(delayedA).toBeTruthy();
  });

  test('Mobile Responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);

    const progABtn = page.getByRole('button', { name: /UAT Synthetic Programme A/i });
    if (await progABtn.isVisible()) {
      await progABtn.click();
    }

    const tabsNav = page.locator('nav[aria-label="Navigasi Buku Harian Tapak"]');
    await expect(tabsNav).toBeVisible();
    
    // Check all tabs are reachable and visible without destructive overflow
    const newTab = page.getByRole('tab', { name: 'Laporan Baharu' });
    await expect(newTab).toBeVisible();
    
    // The viewport width is 390. Let's check bounding box is within limits
    const box = await newTab.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(40); // practical touch accessibility
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });
});
