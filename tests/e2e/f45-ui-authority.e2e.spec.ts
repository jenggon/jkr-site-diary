import { expect, Page, test } from '@playwright/test';

const PREVIEW_URL = '/site-diary?preview=ngamsoi';

async function openCatat(page: Page, nav: 'desktop' | 'mobile') {
  const navigation = page.locator(`[data-workspace-nav='${nav}']`);
  await expect(navigation).toBeVisible({ timeout: 20_000 });
  await navigation.getByRole('tab', { name: 'Catat kerja', exact: true }).click();
  await expect(page.locator("form[data-ui-authority='F45']")).toBeVisible({ timeout: 20_000 });
}

async function expectOneSpineAxis(page: Page) {
  const steps = page.locator("form[data-ui-authority='F45'] > .ng-entry-step[data-entry-step]");
  await expect(steps).toHaveCount(7);

  const tags = await steps.evaluateAll((nodes) => nodes.map((node) => node.tagName));
  expect(new Set(tags)).toEqual(new Set(['DIV']));

  const xs = await steps.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    const pseudo = getComputedStyle(node, '::before');
    return rect.left + Number.parseFloat(pseudo.left) + (Number.parseFloat(pseudo.width) / 2);
  }));
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(1);

  const shadows = await steps.evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).boxShadow));
  expect(shadows.every((shadow) => shadow === 'none')).toBe(true);
}

test.describe('F4.5 operational UI authority browser gate', () => {
  test('half-window uses one Spine, sharp geometry, four core header facts and topmost VO dialog', async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 900 });
    await page.goto(PREVIEW_URL);
    await openCatat(page, 'desktop');

    const form = page.locator("form[data-ui-authority='F45']");
    await expectOneSpineAxis(page);

    const isolation = await form.evaluate((node) => getComputedStyle(node).isolation);
    expect(isolation).toBe('auto');

    for (const selector of ['.ng-entry-panel', '.ng-segmented', '.ng-save-action']) {
      const target = page.locator(selector).first();
      await expect(target).toBeVisible();
      expect(await target.evaluate((node) => getComputedStyle(node).borderRadius)).toBe('0px');
    }

    for (const pulse of ['programme', 'remaining', 'day', 'now']) {
      await expect(page.locator(`.ng-project-pulse--f45 [data-pulse='${pulse}']`)).toBeVisible();
    }
    const forecast = page.locator('.ng-project-pulse--f45 .ng-project-weather');
    const forecastState = await forecast.getAttribute('data-weather-state');
    if (forecastState === 'loading' || forecastState === 'unavailable') await expect(forecast).toBeHidden();

    await page.getByRole('tab', { name: 'VO / APK', exact: true }).click();
    await page.getByRole('button', { name: 'Daftar VO', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'VO / APK Baharu' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    const dialogOwnsTopPoint = await page.evaluate(({ x, y }) => {
      const modal = document.querySelector('.ng-vo-dialog');
      const top = document.elementFromPoint(x, y);
      return Boolean(modal && top && modal.contains(top));
    }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
    expect(dialogOwnsTopPoint).toBe(true);
  });

  test('phone preserves the same Spine axis without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PREVIEW_URL);
    await openCatat(page, 'mobile');
    await expectOneSpineAxis(page);

    const dimensions = await page.evaluate(() => ({
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      rootClientWidth: document.documentElement.clientWidth,
      rootScrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.bodyScrollWidth).toBeLessThanOrEqual(dimensions.bodyClientWidth + 1);
    expect(dimensions.rootScrollWidth).toBeLessThanOrEqual(dimensions.rootClientWidth + 1);
  });
});
