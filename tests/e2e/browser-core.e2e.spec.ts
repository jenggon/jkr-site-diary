import { expect, Page, test } from '@playwright/test';

interface ProgrammeFixture {
  readonly id: string;
  readonly name: string;
  readonly revisionId: string;
  readonly activity: string;
  readonly task: string;
}

interface NetworkEvidence {
  readonly checks: Promise<void>[];
  readonly leaks: string[];
}

test.describe('F2.7-B02-A Real Browser Core Acceptance', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  const PROGRAMME_A: ProgrammeFixture = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'C01 Test Programme',
    revisionId: '33333333-3333-4333-8333-333333333333',
    activity: 'Concrete Works',
    task: 'C01 Test Task',
  };
  const PROGRAMME_B: ProgrammeFixture = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'C01 Programme B',
    revisionId: '44444444-4444-4444-8444-444444444444',
    activity: 'Prog B Activity',
    task: 'Prog B Task',
  };
  const USERS = {
    submitter: { email: 'submitter@jkr.gov.my', password: 'password123' },
    unauthorized: { email: 'unauthorized@external.com', password: 'password123' },
  };
  const TABS = ['Laporan Baharu', 'Aktiviti Terbuka', 'Rekod / Sejarah', 'Kelulusan'] as const;
  const INTERNAL_ERROR = /42501|permission denied for table|Database error \[|PostgREST|"stack"\s*:/i;
  const networkEvidence = new WeakMap<Page, NetworkEvidence>();

  test.beforeEach(async ({ page }) => {
    const evidence: NetworkEvidence = { checks: [], leaks: [] };
    networkEvidence.set(page, evidence);
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith('/api/')) return;

      evidence.checks.push(
        response
          .text()
          .then((body) => {
            if (INTERNAL_ERROR.test(body)) {
              evidence.leaks.push(`${response.status()} ${url.pathname}: ${body}`);
            }
          })
          .catch(() => undefined),
      );
    });
  });

  test.afterEach(async ({ page }) => {
    const evidence = networkEvidence.get(page);
    if (evidence) {
      await Promise.all(evidence.checks);
      expect(evidence.leaks, 'application API responses must not expose database internals').toEqual(
        [],
      );
    }

    if (!page.isClosed()) {
      const visibleText = await page.locator('body').innerText().catch(() => '');
      expect(visibleText).not.toMatch(INTERNAL_ERROR);
    }
  });

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

  async function selectProgramme(page: Page, programme: ProgrammeFixture) {
    const summaryResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/project-summary' &&
        url.searchParams.get('programmeId') === programme.id
      );
    });
    const button = page.getByRole('button', { name: new RegExp(programme.name, 'i') });
    await expect(button).toBeVisible();
    await button.click();

    const summaryResponse = await summaryResponsePromise;
    expect(summaryResponse.status()).toBe(200);
    expect(await summaryResponse.json()).toMatchObject({
      task_name: programme.name,
      revision_id: programme.revisionId,
    });
    await expect(page.getByRole('heading', { name: programme.name, exact: true })).toBeVisible();
    await expect(page.getByText('Semakan Semasa', { exact: true })).toBeVisible();
  }

  async function openActivities(page: Page, programme: ProgrammeFixture) {
    const responsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/activities/open' &&
        url.searchParams.get('programmeId') === programme.id
      );
    });
    const tab = page.getByRole('tab', { name: 'Aktiviti Terbuka', exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      data: Array<{ programmeId: string; subtask: string }>;
    };
    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.data.every((activity) => activity.programmeId === programme.id)).toBe(true);
    expect(payload.data.some((activity) => activity.subtask === programme.activity)).toBe(true);
    await expect(page.getByText(programme.activity, { exact: false }).first()).toBeVisible();
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
    let smallestHeight = Number.POSITIVE_INFINITY;

    for (const tabName of TABS) {
      const tab = tabList.getByRole('tab', { name: tabName, exact: true });
      await expect(tab).toBeVisible();
      const box = await tab.boundingBox();
      expect(box, `${tabName} must have a measurable target`).not.toBeNull();
      smallestHeight = Math.min(smallestHeight, box!.height);
      if (minimumHeight) {
        expect(box!.height, `${tabName} touch target height`).toBeGreaterThanOrEqual(minimumHeight);
      }
    }

    return smallestHeight;
  }

  test('anonymous application routes reject with safe 401 responses', async ({ page }) => {
    await page.goto('/login');
    const results = await page.evaluate(async (programmeId) => {
      const urls = [
        `/api/project-summary?programmeId=${encodeURIComponent(programmeId)}`,
        `/api/activities/open?programmeId=${encodeURIComponent(programmeId)}`,
      ];
      return Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url);
          return { status: response.status, body: await response.text() };
        }),
      );
    }, PROGRAMME_A.id);

    expect(results.map((result) => result.status)).toEqual([401, 401]);
    expect(results.map((result) => result.body).join('\n')).not.toMatch(INTERNAL_ERROR);
  });

  test('real GoTrue login discovers exactly the two authorized active Programmes', async ({
    page,
  }) => {
    await login(page);

    expect(new URL(page.url()).pathname).toBe('/site-diary');
    await expect(page.getByRole('heading', { name: 'Pilih Projek / Program Tapak' })).toBeVisible();
    await expect(page.getByText('Terdapat 2 projek aktif.')).toBeVisible();
    await expect(page.getByRole('button', { name: /C01 Test Programme/i })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /C01 Programme B/i })).toHaveCount(1);
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(2);

    await selectProgramme(page, PROGRAMME_A);
    await expectTabsReachable(page);
  });

  test('Programme A resolves Project Summary, AHI, workpackages, and usable form data', async ({
    page,
  }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A);

    const taskResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === `/api/task/revision/${PROGRAMME_A.revisionId}`,
    );
    const newReportTab = page.getByRole('tab', { name: 'Laporan Baharu', exact: true });
    await newReportTab.click();
    await expect(newReportTab).toHaveAttribute('aria-selected', 'true');
    const taskResponse = await taskResponsePromise;
    expect(taskResponse.status()).toBe(200);

    const hierarchy = await page.evaluate(async (programmeId) => {
      const ahiResponse = await fetch(`/api/ahi?programmeId=${encodeURIComponent(programmeId)}`);
      const workpackageResponse = await fetch(
        `/api/workpackages?building=1&programmeId=${encodeURIComponent(programmeId)}`,
      );
      return {
        ahi: { status: ahiResponse.status, data: await ahiResponse.json() },
        workpackages: {
          status: workpackageResponse.status,
          data: await workpackageResponse.json(),
        },
      };
    }, PROGRAMME_A.id);

    expect(hierarchy.ahi.status).toBe(200);
    expect(hierarchy.ahi.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_name: 'C01 Main Building', outline_number: '1' }),
      ]),
    );
    expect(hierarchy.workpackages.status).toBe(200);
    expect(hierarchy.workpackages.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_name: PROGRAMME_A.task, outline_number: '1.1' }),
      ]),
    );

    const search = page.getByPlaceholder('Cari nama tugasan, WBS, atau UID...');
    await expect(search).toBeVisible();
    await search.fill(PROGRAMME_A.task);
    const taskButton = page.getByRole('button', { name: new RegExp(PROGRAMME_A.task, 'i') });
    await expect(taskButton).toBeVisible();
    await taskButton.click();
    await expect(page.getByRole('heading', { name: PROGRAMME_A.task, exact: true })).toBeVisible();
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
  });

  test('workspace exposes exactly four contextual tabs with one selected owner', async ({
    page,
  }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A);
    const workspaceTabs = page.getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' });

    for (const tabName of TABS) {
      const tab = workspaceTabs.getByRole('tab', { name: tabName, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(workspaceTabs.getByRole('tab', { selected: true })).toHaveCount(1);
    }

    await expect(page.getByRole('tab', { name: /Print/i })).toHaveCount(0);
  });

  test('P1 switches Programme A to B without cross-Programme activity or form state', async ({
    page,
  }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A);
    await openActivities(page, PROGRAMME_A);

    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await selectProgramme(page, PROGRAMME_B);
    await openActivities(page, PROGRAMME_B);

    await expect(page.getByText(PROGRAMME_B.activity, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(PROGRAMME_A.activity, { exact: false })).toHaveCount(0);
    await expect(page.getByText(PROGRAMME_A.task, { exact: false })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: PROGRAMME_A.name, exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: PROGRAMME_B.name, exact: true })).toBeVisible();
    await expect(
      page
        .getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' })
        .getByRole('tab', { selected: true }),
    ).toHaveCount(1);
  });

  test('a delayed Programme A response completes but cannot re-own Programme B', async ({
    page,
  }) => {
    await login(page);
    await selectProgramme(page, PROGRAMME_A);

    let interceptedA = false;
    let completedA = false;
    let delayedAStatus: number | null = null;
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
        delayedAStatus = upstreamResponse.status();
        signalInterceptedA();
        await releaseAPromise;
        await route.fulfill({ response: upstreamResponse });
        completedA = true;
        return;
      }
      await route.continue();
    });

    const openTab = page.getByRole('tab', { name: 'Aktiviti Terbuka', exact: true });
    await openTab.click();
    await interceptedAPromise;
    expect(interceptedA).toBe(true);
    expect(delayedAStatus).toBe(200);

    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await selectProgramme(page, PROGRAMME_B);
    await openActivities(page, PROGRAMME_B);

    releaseA();
    await expect.poll(() => completedA).toBe(true);
    await expect(page.getByText(PROGRAMME_B.activity, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(PROGRAMME_A.activity, { exact: false })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: PROGRAMME_B.name, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: PROGRAMME_A.name, exact: true })).toHaveCount(0);
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);
    await expect(
      page
        .getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' })
        .getByRole('tab', { name: 'Aktiviti Terbuka', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('P3 real login grants no Programme discovery or direct membership read', async ({
    page,
  }) => {
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
    await selectProgramme(page, PROGRAMME_A);

    const minimumTabHeight = await expectTabsReachable(page, 44);
    await expectNoHorizontalOverflow(page);
    const approvalsTab = page.getByRole('tab', { name: 'Kelulusan', exact: true });
    await approvalsTab.click();
    await expect(approvalsTab).toHaveAttribute('aria-selected', 'true');

    const switchButton = page.getByRole('button', { name: 'Tukar Projek' });
    await expect(switchButton).toBeVisible();
    const switchBox = await switchButton.boundingBox();
    expect(switchBox).not.toBeNull();
    expect(switchBox!.height).toBeGreaterThanOrEqual(44);
    console.log(
      `[B02-A mobile metrics] minTab=${minimumTabHeight}px tukarProjek=${switchBox!.height}px`,
    );

    await switchButton.click();
    await selectProgramme(page, PROGRAMME_B);
    await expectTabsReachable(page, 44);
    await openActivities(page, PROGRAMME_B);
    await expectNoHorizontalOverflow(page);
  });

  test('desktop 1440x900 keeps all contextual navigation coherent after switching', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await selectProgramme(page, PROGRAMME_A);

    await expectTabsReachable(page);
    await expectNoHorizontalOverflow(page);
    const recordsTab = page.getByRole('tab', { name: 'Rekod / Sejarah', exact: true });
    await recordsTab.click();
    await expect(recordsTab).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('button', { name: 'Tukar Projek' }).click();
    await selectProgramme(page, PROGRAMME_B);
    await expectTabsReachable(page);
    await openActivities(page, PROGRAMME_B);
    await expectNoHorizontalOverflow(page);
    await expect(
      page
        .getByRole('navigation', { name: 'Navigasi Buku Harian Tapak' })
        .getByRole('tab', { selected: true }),
    ).toHaveCount(1);
  });
});
