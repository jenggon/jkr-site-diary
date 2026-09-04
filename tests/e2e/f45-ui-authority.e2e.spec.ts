import { expect, type Locator, type Page, test } from '@playwright/test';
import { installF45AcceptanceFixture } from './support/f45AcceptanceFixture';

const APP_URL = '/site-diary';
const EXPECT_TIMEOUT = 20_000;
const SPINE_STEPS = ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save'] as const;
const SPINE_STATES = new Set(['complete', 'current', 'upcoming']);

test.use({ timezoneId: 'Asia/Kuala_Lumpur' });

async function boot(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  const fixture = await installF45AcceptanceFixture(page);
  await page.goto(APP_URL);
  return fixture;
}

async function openCatat(page: Page, nav: 'desktop' | 'mobile'): Promise<Locator> {
  const navigation = page.locator(`[data-workspace-nav='${nav}']`);
  await expect(navigation).toBeVisible({ timeout: EXPECT_TIMEOUT });
  const catat = navigation.getByRole('tab', { name: 'Catat kerja', exact: true });
  await catat.click();
  await expect(page.locator("form[data-ui-authority='F45']")).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(catat).toHaveAttribute('aria-selected', 'true');
  await expect(catat).toHaveAttribute('data-selected', 'true');
  return navigation;
}

async function expectCoreHeader(page: Page) {
  for (const pulse of ['programme', 'remaining', 'day', 'now']) {
    await expect(page.locator(`.ng-project-pulse--f45 [data-pulse='${pulse}']`)).toBeVisible({
      timeout: EXPECT_TIMEOUT,
    });
  }

  const forecast = page.locator('.ng-project-pulse--f45 .ng-project-weather');
  const forecastState = await forecast.getAttribute('data-weather-state');
  if (forecastState === 'loading' || forecastState === 'unavailable') {
    await expect(forecast).toBeHidden();
  } else {
    await expect(forecast).toBeVisible();
  }
}

async function expectOneSpineAxis(page: Page) {
  const form = page.locator("form[data-ui-authority='F45']");
  const steps = form.locator(':scope > .ng-entry-step[data-entry-step]');
  await expect(steps).toHaveCount(7);

  const keys = await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-entry-step')));
  expect(keys).toEqual([...SPINE_STEPS]);

  const tags = await steps.evaluateAll((nodes) => nodes.map((node) => node.tagName));
  expect(new Set(tags)).toEqual(new Set(['DIV']));
  expect(await form.locator(':scope > section').count()).toBe(0);

  const states = await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-spine-state')));
  expect(states.every((state) => Boolean(state && SPINE_STATES.has(state)))).toBe(true);

  const xs = await steps.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const pseudo = getComputedStyle(node, '::before');
    return rect.left + Number.parseFloat(pseudo.left) + (Number.parseFloat(pseudo.width) / 2);
  }));
  expect(xs.every(Number.isFinite)).toBe(true);
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(1);

  const shadows = await steps.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).boxShadow));
  expect(shadows.every((shadow) => shadow === 'none')).toBe(true);
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

async function expectSharpOperationalGeometry(page: Page) {
  const offenders = await page.locator([
    "form[data-ui-authority='F45'] .ng-entry-panel",
    "form[data-ui-authority='F45'] input",
    "form[data-ui-authority='F45'] select",
    "form[data-ui-authority='F45'] textarea",
    "form[data-ui-authority='F45'] button",
    "[data-workspace-nav='desktop'] button",
    "[data-workspace-nav='mobile'] button",
    ".ng-project-pulse--f45 [data-pulse]",
    ".ng-project-pulse--f45 .ng-project-weather",
  ].join(',')).evaluateAll((nodes) => nodes.flatMap((node) => {
    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    if (!visible || style.borderRadius === '0px') return [];
    return [{
      tag: element.tagName,
      className: element.className,
      radius: style.borderRadius,
      text: element.textContent?.trim().slice(0, 60) ?? '',
    }];
  }));
  expect(offenders, `Rounded operational surfaces remain:\n${JSON.stringify(offenders, null, 2)}`).toEqual([]);
}

async function expectTopmostDialog(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'VO / APK Baharu' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);

  const points = [
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
    { x: box!.x + 12, y: box!.y + 12 },
    { x: box!.x + box!.width - 12, y: box!.y + 12 },
    { x: box!.x + 12, y: box!.y + box!.height - 12 },
    { x: box!.x + box!.width - 12, y: box!.y + box!.height - 12 },
  ];

  const ownership = await page.evaluate((samples) => {
    const modal = document.querySelector('.ng-vo-dialog');
    return samples.map(({ x, y }) => {
      const top = document.elementFromPoint(x, y);
      return Boolean(modal && top && modal.contains(top));
    });
  }, points);
  expect(ownership.every(Boolean)).toBe(true);
}

test.describe('F4.5 operational UI authority browser gate', () => {
  test('wide desktop preserves labelled navigation, locked states and sharp geometry', async ({ page }) => {
    const fixture = await boot(page, 1280, 720);

    const desktop = page.locator("[data-workspace-nav='desktop']");
    const mobile = page.locator("[data-workspace-nav='mobile']");
    await expect(desktop).toBeVisible({ timeout: EXPECT_TIMEOUT });
    await expect(mobile).toBeHidden();

    const toggle = desktop.getByRole('button', { name: /navigasi/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(desktop).toHaveClass(/is-collapsed/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await openCatat(page, 'desktop');
    await expectCoreHeader(page);
    await expectOneSpineAxis(page);
    await expectNoHorizontalOverflow(page);

    await page.locator('.mobile-entry-task-row').first().click();
    await expect(page.locator("[data-spine-state='complete']")).toHaveCount(2);

    const completedNodeColors = await page.locator("[data-spine-state='complete']").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node, '::before').backgroundColor),
    );
    expect(new Set(completedNodeColors)).toEqual(new Set(['rgb(63, 185, 80)']));

    await expect(page.locator('.ng-workforce__overall-icon')).toBeVisible();
    await expect(page.locator('[data-testid="tre-trade-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-time-summary"]')).toContainText('08:00 → 17:00');

    await page.getByRole('button', { name: 'SIAP', exact: true }).click();
    await expect(page.locator('[data-testid="same-day-start-complete"]')).toBeVisible();

    await expectSharpOperationalGeometry(page);
    fixture.assertNoUnexpectedApiCalls();
  });

  test('half-window uses compact overlay navigation, one Spine and topmost VO dialog', async ({ page }) => {
    const fixture = await boot(page, 960, 900);

    const desktop = page.locator("[data-workspace-nav='desktop']");
    const mobile = page.locator("[data-workspace-nav='mobile']");
    await expect(desktop).toBeVisible({ timeout: EXPECT_TIMEOUT });
    await expect(mobile).toBeHidden();

    const toggle = desktop.getByRole('button', { name: /navigasi/i });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false', { timeout: EXPECT_TIMEOUT });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(desktop).toHaveClass(/is-overlay-open/);
    await expect(page.getByRole('button', { name: 'Tutup navigasi', exact: true })).toBeVisible();

    await openCatat(page, 'desktop');
    await expect(page.getByRole('button', { name: 'Tutup navigasi', exact: true })).toBeHidden();
    await expectCoreHeader(page);
    await expectOneSpineAxis(page);
    await expectNoHorizontalOverflow(page);
    await expectSharpOperationalGeometry(page);

    await page.getByRole('tab', { name: 'VO / APK', exact: true }).click();
    await page.getByRole('button', { name: 'Daftar VO', exact: true }).click();
    await expectTopmostDialog(page);

    fixture.assertNoUnexpectedApiCalls();
  });

  test('phone preserves bottom navigation, the same Spine axis and zero horizontal overflow', async ({ page }) => {
    const fixture = await boot(page, 390, 844);

    const desktop = page.locator("[data-workspace-nav='desktop']");
    const mobile = page.locator("[data-workspace-nav='mobile']");
    await expect(mobile).toBeVisible({ timeout: EXPECT_TIMEOUT });
    await expect(desktop).toBeHidden();

    await openCatat(page, 'mobile');
    await expectCoreHeader(page);
    await expectOneSpineAxis(page);
    await expectNoHorizontalOverflow(page);
    await expectSharpOperationalGeometry(page);

    fixture.assertNoUnexpectedApiCalls();
  });
});
