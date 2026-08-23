import { expect, Page, test } from '@playwright/test';

test.describe('F2.7-B02-A Real Browser Core Acceptance', () => {
  test.setTimeout(90_000);

  const PROGRAMME_A = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'C01 Test Programme',
    activity: 'Concrete Works',
  };
  const PROGRAMME_B = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'C01 Programme B',
    activity: 'Prog B Activity',
  };
  const USERS = {
    submitter: { email: 'submitter@jkr.gov.my', password: 'password123' },
    unauthorized: { email: 'unauthorized@external.com', password: 'password123' },
  };
  const TABS = ['Laporan Baharu', 'Aktiviti Terbuka', 'Rekod / Sejarah', 'Kelulusan'] as const;

  async function login(page: Page, user = USERS.submitter) {
    await page.goto('/login');
    await page.getByLabel('Alamat Emel').fill(user.email);
    await page.getByLabel('Kata Laluan').fill(user.password);

    const goTrueResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'POST' &&
        url.pathname === '/auth/v1/token' &&
        url.searchParams.get('grant_type') === 'password'
      );
    });

    await page.getByRole('button', { name: 'Log Masuk Sekarang' }).click();
    const response = await goTrueResponse;
    expect(response.status()).toBe(200);
    expect(new URL(response.url()).origin).toBe('http://127.0.0.1:54321');
    await page.waitForURL((url) => url.pathname === '/site-diary', { timeout: 30_000 });
  }

  async function selectProgramme(page: Page, programmeName: string) {
    const button = page.getByRole('button', { name: new RegExp(programmeName, 'i') });
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.getByRole('heading', { name: programmeName, exact: true })).toBeVisible();
  }

  async function openActivities(page: Page) {
    const tab = page.getByRole('tab', { name: 'Aktiviti Terbuka', exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }

  async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      rootClientWidth: document.documentElement.clientWidth,
      rootScrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth);
    expect(dimensions.rootScrollWidth).toBeLessThanOrEqual(dimensions.rootClientWidth);
  }

  async function expectTabsReachable(page: Page, minimumHeight?: number) {
    const tabList = page.getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' });
    await expect(tabList).toBeVisible();
    await expect(tabList.getByRole('tab')).toHaveCount(TABS.length);

    for (const tabName of TABS) {
      const tab = page.getByRole('tab', { name: tabName, exact: true });
      await expect(tab).toBeVisible();
      if (minimumHeight) {
        const box = await tab.boundingBox();
        expect(box, `${tabName} must have a measurable touch target`).not.toBeNull();
        expect(box!.height, `${tabName} touch target height`).toBeGreaterThanOrEqual(minimumHeight);
      }
    }
  }

  test('real GoTrue login reaches the canonical Programme-aware workspace', async ({ page }) => {
    await login(page);

    expect(new URL(page.url()).pathname).toBe('/site-diary');
    await expect(page.getByRole('heading', { name: 'Pilih Projek / Program Tapak' })).toBeVisible();
    await expect(page.getByText('Terdapat 2 projek aktif.')).toBeVisible();
    await expect(page.getByRole('button', { name: /C01 Test Programme/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /C01 Programme B/i })).toBeVisible();

    await selectProgramme(page, PROGRAMME_A.name);
    await expectTabsReachable(page);
  });

  test('workspace exposes exactly four contextual tabs with one owner', async ({ page }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A.name);
    const workspaceTabs = page.getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' });

    for (const tabName of TABS) {
      const tab = workspaceTabs.getByRole('tab', { name: tabName, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(workspaceTabs.getByRole('tab', { selected: true })).toHaveCount(1);
    }

    await expect(page.getByRole('tab', { name: /Print/i })).toHaveCount(0);
  });

  test('P1 legitimately switches Programme A to B without cross-Programme state', async ({
    page,
  }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A.name);
    await openActivities(page);
    await expect(page.getByText(PROGRAMME_A.activity, { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await selectProgramme(page, PROGRAMME_B.name);
    await openActivities(page);

    await expect(page.getByText(PROGRAMME_B.activity, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(PROGRAMME_A.activity, { exact: false })).toHaveCount(0);
  });

  test('a delayed Programme A response cannot re-own the Programme B UI', async ({ page }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A.name);

    let interceptedA = false;
    let completedA = false;
    let signalInterceptedA!: () => void;
    let releaseA!: () => void;
    const interceptedAPromise = new Promise<void>((resolve) => {
      signalInterceptedA = resolve;
    });
    const releaseAPromise = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    await page.route('**/api/activities/open?*', async (route, request) => {
      const url = new URL(request.url());
      if (
        url.pathname === '/api/activities/open' &&
        url.searchParams.get('programmeId') === PROGRAMME_A.id
      ) {
        interceptedA = true;
        const upstreamResponse = await route.fetch();
        signalInterceptedA();
        await releaseAPromise;
        await route.fulfill({ response: upstreamResponse });
        completedA = true;
        return;
      }
      await route.continue();
    });

    await openActivities(page);
    await interceptedAPromise;
    expect(interceptedA).toBe(true);

    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await selectProgramme(page, PROGRAMME_B.name);
    await openActivities(page);
    await expect(page.getByText(PROGRAMME_B.activity, { exact: false }).first()).toBeVisible();

    releaseA();
    await expect.poll(() => completedA).toBe(true);
    await expect(page.getByText(PROGRAMME_B.activity, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(PROGRAMME_A.activity, { exact: false })).toHaveCount(0);
  });

  test('P3 inactive membership grants no Programme discovery', async ({ page }) => {
    const browserRequests: string[] = [];
    page.on('request', (request) => browserRequests.push(request.url()));

    const programmeResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/programme' && url.searchParams.get('status') === 'Active';
    });
    await login(page, USERS.unauthorized);
    const programmeResponse = await programmeResponsePromise;
    expect(programmeResponse.status()).toBe(200);
    expect(await programmeResponse.json()).toMatchObject({ data: [] });

    await expect(page.getByRole('heading', { name: 'Tiada Projek Aktif Ditemui' })).toBeVisible();
    await expect(page.getByRole('button', { name: /C01 Test Programme/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /C01 Programme B/i })).toHaveCount(0);
    expect(browserRequests.some((url) => url.includes('/rest/v1/programme_membership'))).toBe(
      false,
    );
  });

  test('mobile 390x844 keeps Programme switching, tabs, and content usable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await selectProgramme(page, PROGRAMME_A.name);

    await expectTabsReachable(page, 44);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: 'Kelulusan', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Kelulusan', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const switchButton = page.getByRole('button', { name: 'Tukar Projek' });
    await expect(switchButton).toBeVisible();
    const switchBox = await switchButton.boundingBox();
    expect(switchBox).not.toBeNull();
    expect(switchBox!.height).toBeGreaterThanOrEqual(44);
    await switchButton.click();
    await expect(page.getByRole('button', { name: /C01 Programme B/i })).toBeVisible();
  });

  test('desktop 1440x900 keeps Programme switching, tabs, and content usable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await selectProgramme(page, PROGRAMME_A.name);

    await expectTabsReachable(page);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: 'Rekod / Sejarah', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Rekod / Sejarah', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await expect(page.getByRole('button', { name: /C01 Programme B/i })).toBeVisible();
  });
});
