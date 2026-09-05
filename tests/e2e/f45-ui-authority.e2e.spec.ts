import { expect, type Locator, type Page, test } from '@playwright/test';
import { installF45AcceptanceFixture } from './support/f45AcceptanceFixture';

const APP_URL = '/site-diary';
const EXPECT_TIMEOUT = 20_000;
const SPINE_STEPS = ['source', 'daily', 'site', 'weather', 'workforce', 'notes', 'save'] as const;
const SPINE_STATES = new Set(['complete', 'current', 'upcoming']);
const DASHBOARD_PULSES = ['programme', 'remaining', 'now', 'forecast'] as const;

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

async function expectFourFactDashboard(page: Page) {
  const pulse = page.locator('.ng-project-pulse--f45');
  await expect(pulse).toHaveAttribute('data-dashboard-facts', '4');

  for (const fact of DASHBOARD_PULSES) {
    await expect(pulse.locator(`[data-pulse='${fact}']`)).toBeVisible({ timeout: EXPECT_TIMEOUT });
  }
  await expect(pulse.locator('[data-pulse]')).toHaveCount(4);
  await expect(pulse.locator("[data-pulse='day']")).toHaveCount(0);
  await expect(pulse.locator("[data-pulse='programme'] small")).toHaveText('PROGRAM KERJA');
  await expect(pulse.locator("[data-pulse='remaining'] small")).toHaveText('TINGGAL');
  await expect(pulse.locator("[data-pulse='remaining'] strong")).toContainText('HARI · SIAP');
  await expect(pulse.locator("[data-pulse='now'] small")).toHaveText('SEMASA');
  await expect(pulse.locator("[data-pulse='forecast'] small")).toHaveText('RAMALAN CUACA');

  const facts = pulse.locator('[data-pulse]');
  const readabilityViolations = await facts.evaluateAll((nodes) => nodes.flatMap((node) => {
    const item = node as HTMLElement;
    const itemRect = item.getBoundingClientRect();
    const visibleText = Array.from(item.querySelectorAll('small, strong, .ng-project-weather__sub')).filter((child) => {
      const element = child as HTMLElement;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }) as HTMLElement[];

    const outsideBounds = visibleText.some((child) => {
      const rect = child.getBoundingClientRect();
      return rect.left < itemRect.left - 1
        || rect.right > itemRect.right + 1
        || rect.top < itemRect.top - 1
        || rect.bottom > itemRect.bottom + 1;
    });
    const ellipsized = visibleText.some((child) => {
      const style = getComputedStyle(child);
      const lineClamp = style.getPropertyValue('-webkit-line-clamp');
      return style.textOverflow === 'ellipsis'
        || (lineClamp !== '' && lineClamp !== 'none' && lineClamp !== '0');
    });
    const clipped = item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1;
    const emptyFact = visibleText.every((child) => (child.textContent?.trim().length ?? 0) === 0);

    if (!outsideBounds && !ellipsized && !clipped && !emptyFact) return [];
    return [{
      pulse: item.getAttribute('data-pulse'),
      text: item.textContent?.trim() ?? '',
      outsideBounds,
      ellipsized,
      clipped,
      emptyFact,
      clientWidth: item.clientWidth,
      scrollWidth: item.scrollWidth,
      clientHeight: item.clientHeight,
      scrollHeight: item.scrollHeight,
    }];
  }));
  expect(
    readabilityViolations,
    `Dashboard facts are clipped, ellipsized or unreadable:\n${JSON.stringify(readabilityViolations, null, 2)}`,
  ).toEqual([]);

  const forecast = pulse.locator("[data-pulse='forecast']");
  await expect(forecast).toHaveAttribute('data-weather-state', /^(loading|unavailable|rain|dry)$/);

  const rects = await facts.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
  }));
  expect(rects).toHaveLength(4);

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth >= 768) {
    expect(Math.max(...rects.map((rect) => rect.top)) - Math.min(...rects.map((rect) => rect.top))).toBeLessThanOrEqual(1);
    for (let index = 1; index < rects.length; index += 1) {
      expect(rects[index]!.left).toBeGreaterThanOrEqual(rects[index - 1]!.right - 1);
    }
  } else {
    expect(Math.abs(rects[0]!.top - rects[1]!.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(rects[2]!.top - rects[3]!.top)).toBeLessThanOrEqual(1);
    expect(rects[2]!.top).toBeGreaterThanOrEqual(rects[0]!.bottom - 1);
    expect(rects[1]!.left).toBeGreaterThanOrEqual(rects[0]!.right - 1);
    expect(rects[3]!.left).toBeGreaterThanOrEqual(rects[2]!.right - 1);
  }

  const forecastPresentation = await forecast.evaluate((node) => {
    const style = getComputedStyle(node as HTMLElement);
    return { boxShadow: style.boxShadow, backgroundColor: style.backgroundColor };
  });
  expect(forecastPresentation.boxShadow).toBe('none');
  expect(forecastPresentation.backgroundColor).toBe('rgba(0, 0, 0, 0)');
}

async function expectOneSpineAxis(page: Page) {
  const form = page.locator("form[data-ui-authority='F45']");
  await expect(form).toHaveAttribute('data-spine-geometry', 'measured', { timeout: EXPECT_TIMEOUT });
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

  const semantic = await form.evaluate((formNode) => {
    const formElement = formNode as HTMLElement;
    const stepNodes = Array.from(formElement.querySelectorAll<HTMLElement>(':scope > .ng-entry-step[data-entry-step]'));
    const anchorFor = (step: HTMLElement) => {
      const key = step.dataset.entryStep ?? '';
      if (key === 'source') {
        return step.querySelector<HTMLElement>('.ng-entry-heading, .mobile-entry-spike-panel h3, .mobile-entry-selected-source h3, h3') ?? step;
      }
      if (key === 'save') return step.querySelector<HTMLElement>('.ng-save-action') ?? step;
      return step.querySelector<HTMLElement>('.ng-entry-heading') ?? step;
    };

    const centres = stepNodes.map((step) => {
      const anchor = anchorFor(step);
      const stepRect = step.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const pseudo = getComputedStyle(step, '::before');
      return {
        key: step.dataset.entryStep ?? '',
        nodeCentre: stepRect.top + Number.parseFloat(pseudo.top) + (Number.parseFloat(pseudo.height) / 2),
        anchorCentre: anchorRect.top + (anchorRect.height / 2),
      };
    });

    const formRect = formElement.getBoundingClientRect();
    const rail = getComputedStyle(formElement, '::before');
    const railTop = formRect.top + Number.parseFloat(rail.top);
    const railEnd = railTop + Number.parseFloat(rail.height);
    return { centres, railTop, railEnd };
  });

  for (const item of semantic.centres) {
    expect(Math.abs(item.nodeCentre - item.anchorCentre), `${item.key} node is not aligned to its semantic anchor`).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(semantic.railTop - semantic.centres[0]!.nodeCentre)).toBeLessThanOrEqual(1);
  expect(Math.abs(semantic.railEnd - semantic.centres.at(-1)!.nodeCentre)).toBeLessThanOrEqual(1);

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
    '.ng-post-save',
    '.ng-post-save__actions',
    '.ng-post-save__actions button',
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

async function expectCompletionSeal(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Disimpan' });
  await expect(dialog).toBeVisible({ timeout: EXPECT_TIMEOUT });
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.locator('.ng-post-save__title')).toHaveText('Disimpan');
  await expect(page.getByTestId('post-save-backdrop')).toBeVisible();
  await expect(page.getByTestId('post-save-show-records')).toBeVisible();
  await expect(page.getByTestId('post-save-add-activity')).toBeVisible();
  await expect(page.getByTestId('post-save-close')).toBeVisible();

  const node = dialog.locator('.ng-completion-seal__node');
  await expect(node).toBeVisible();
  const nodeGeometry = await node.evaluate((element) => {
    const rect = (element as HTMLElement).getBoundingClientRect();
    const style = getComputedStyle(element as HTMLElement);
    return { width: rect.width, height: rect.height, radius: style.borderRadius, background: style.backgroundColor };
  });
  expect(Math.abs(nodeGeometry.width - nodeGeometry.height)).toBeLessThanOrEqual(1);
  expect(nodeGeometry.radius).toBe('50%');
  expect(nodeGeometry.background).toBe('rgb(63, 185, 80)');

  const offenders = await page.locator(
    '.ng-post-save, .ng-post-save__actions, .ng-post-save__actions button, .ng-completion-seal__close',
  ).evaluateAll((nodes) => nodes.flatMap((node) => {
    const element = node as HTMLElement;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    return visible && style.borderRadius !== '0px'
      ? [{ tag: element.tagName, className: element.className, radius: style.borderRadius }]
      : [];
  }));
  expect(offenders, `Completion Seal geometry is not sharp:\n${JSON.stringify(offenders, null, 2)}`).toEqual([]);

  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);

  const ownsCentre = await page.evaluate(({ x, y }) => {
    const top = document.elementFromPoint(x, y);
    const modal = document.querySelector('.ng-post-save');
    return Boolean(top && modal && modal.contains(top));
  }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
  expect(ownsCentre).toBe(true);
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
  test('wide desktop preserves labelled navigation, locked states and exact four-fact Tactical Pulse', async ({ page }) => {
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
    await expectFourFactDashboard(page);
    await expectOneSpineAxis(page);
    await expectNoHorizontalOverflow(page);

    await page.locator('.mobile-entry-task-row').first().click();
    await expect(page.locator("[data-spine-state='complete']")).toHaveCount(2);

    const completedNodeColors = await page.locator("[data-spine-state='complete']").evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node, '::before').backgroundColor),
    );
    expect(new Set(completedNodeColors)).toEqual(new Set(['rgb(63, 185, 80)']));

    const smartHardhat = page.locator(
      '[data-testid="smart-workforce-entry"] .ng-workforce-smart__total .ng-workforce__overall-icon',
    );
    await expect(smartHardhat).toHaveCount(1);
    await expect(smartHardhat).toBeVisible();
    await expect(page.locator('[data-testid="tre-trade-suggestions"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-time-summary"]')).toContainText('08:00 → 17:00');

    await page.getByRole('button', { name: 'SIAP', exact: true }).click();
    await expect(page.getByRole('button', { name: 'MULA', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'SIAP', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="same-day-start-complete"]')).toHaveCount(0);

    await expectSharpOperationalGeometry(page);
    fixture.assertNoUnexpectedApiCalls();
  });

  test('half-window keeps the same four facts on one row, one Spine and topmost VO dialog', async ({ page }) => {
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
    await expectFourFactDashboard(page);
    await expectOneSpineAxis(page);
    await expectNoHorizontalOverflow(page);
    await expectSharpOperationalGeometry(page);

    await page.getByRole('tab', { name: 'VO / APK', exact: true }).click();
    await page.getByRole('button', { name: 'Daftar VO', exact: true }).click();
    await expectTopmostDialog(page);

    fixture.assertNoUnexpectedApiCalls();
  });

  test('phone uses two-by-two dashboard, semantic Spine through SIMPAN and dismissible no-scroll Completion Seal', async ({ page }) => {
    const fixture = await boot(page, 390, 844);

    const desktop = page.locator("[data-workspace-nav='desktop']");
    const mobile = page.locator("[data-workspace-nav='mobile']");
    await expect(mobile).toBeVisible({ timeout: EXPECT_TIMEOUT });
    await expect(desktop).toBeHidden();

    await openCatat(page, 'mobile');
    await expectFourFactDashboard(page);
    await expectOneSpineAxis(page);
    await expectNoHorizontalOverflow(page);
    await expectSharpOperationalGeometry(page);

    const form = page.locator("form[data-ui-authority='F45']");
    await page.locator('.mobile-entry-task-row').first().click();
    await form.locator('.ng-entry-grid--site .ng-entry-field input').fill('Aras 2 · Grid 4–8');
    await form.locator('textarea').fill('Kerja konkrit diteruskan mengikut jadual.');

    const beforeSaveScroll = await page.evaluate(() => ({
      windowY: window.scrollY,
      workspaceY: document.querySelector<HTMLElement>('.ng-workspace-content')?.scrollTop ?? 0,
    }));

    await form.getByRole('button', { name: 'Simpan', exact: true }).click();
    await expectCompletionSeal(page);

    const afterSaveScroll = await page.evaluate(() => ({
      windowY: window.scrollY,
      workspaceY: document.querySelector<HTMLElement>('.ng-workspace-content')?.scrollTop ?? 0,
    }));
    expect(Math.abs(afterSaveScroll.windowY - beforeSaveScroll.windowY)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterSaveScroll.workspaceY - beforeSaveScroll.workspaceY)).toBeLessThanOrEqual(1);

    const saveStep = form.locator(':scope > .ng-entry-step[data-entry-step="save"]');
    await expect(saveStep).toHaveCount(1);
    await expect(saveStep).toHaveAttribute('data-spine-state', 'complete');
    await expect(saveStep.getByRole('button', { name: 'Catatan telah disimpan', exact: true })).toBeDisabled();

    await page.getByTestId('post-save-close').click();
    await expect(page.getByTestId('post-save-confirmation')).toHaveCount(0);
    await expect(page.getByTestId('post-save-backdrop')).toHaveCount(0);
    await expect(saveStep).toHaveAttribute('data-spine-state', 'complete');
    await expect(saveStep.getByRole('button', { name: 'Catatan telah disimpan', exact: true })).toBeDisabled();

    const afterDismissScroll = await page.evaluate(() => ({
      windowY: window.scrollY,
      workspaceY: document.querySelector<HTMLElement>('.ng-workspace-content')?.scrollTop ?? 0,
    }));
    expect(Math.abs(afterDismissScroll.windowY - beforeSaveScroll.windowY)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterDismissScroll.workspaceY - beforeSaveScroll.workspaceY)).toBeLessThanOrEqual(1);

    await expectOneSpineAxis(page);
    await expectSharpOperationalGeometry(page);
    await expectNoHorizontalOverflow(page);

    fixture.assertNoUnexpectedApiCalls();
  });
});
