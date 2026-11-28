// FX spec: imports `test` from Playwright directly, because the stable fixture forces `?fx=off`
// (tech.md §16). /_dev/fx exists in dev and preview builds only (src/lib/dev-pages.ts).
import { expect, test, type Page } from '@playwright/test';

// P1.FX.07 "Gotovo kad": with a 6× CPU throttle, quality drops automatically.
//
// The dev page's triangle costs almost nothing, so `?work=4` adds 4 ms of busy CPU per frame, a
// stand-in for the vortex simulation: ~60 FPS at full speed, ~24 ms per frame (< 50 FPS) when the
// CPU is throttled 6×. The throttle is Chromium's DevTools `Emulation.setCPUThrottlingRate`, so the
// test runs in the Chromium project only.

const THROTTLE_RATE = 6;
const WORK_MS = 4;
// One 2 s window per drop, plus slack for a slow CI runner.
const DROP_TIMEOUT_MS = 10_000;

async function open(page: Page, query: string): Promise<void> {
  await page.goto(`/_dev/fx?${query}`);
  const status = page.locator('[data-fx="status"]');
  await expect(status).not.toHaveText('starting');
  test.skip((await status.textContent()) === 'unsupported', 'No WebGL2 in this browser');
  await expect(page.locator('[data-fx="loop"]')).toHaveText('running');
}

async function throttle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE_RATE });
}

test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    browserName !== 'chromium' || testInfo.project.name !== 'chromium',
    'CPU throttling needs the Chromium DevTools protocol (desktop project only)',
  );
});

test('the tier drops automatically under a 6× CPU throttle', async ({ page }) => {
  await open(page, `work=${WORK_MS}`);
  await expect(page.locator('[data-fx="adaptive"]')).toHaveText('on');
  await expect(page.locator('[data-fx="quality"]')).toHaveText('high');

  await throttle(page);
  await expect(page.locator('[data-fx="quality"]')).not.toHaveText('high', {
    timeout: DROP_TIMEOUT_MS,
  });
  await expect(page.locator('[data-fx="tier-changes"]')).toContainText('medium');
  // The renderer got the new tier: medium caps the pixel ratio at 1.5.
  const size = await page.locator('[data-fx="size"]').textContent();
  expect(Number(size?.split('@')[1])).toBeLessThanOrEqual(1.5);
});

test('a forced ?fx= tier is never changed', async ({ page }) => {
  await open(page, `fx=high&work=${WORK_MS}`);
  await expect(page.locator('[data-fx="adaptive"]')).toHaveText('off (forced tier)');

  await throttle(page);
  // Long enough for two drop windows; the FPS readout proves frames were slow meanwhile.
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-fx="quality"]')).toHaveText('high');
  await expect(page.locator('[data-fx="tier-changes"]')).toHaveText('–');
  expect(Number(await page.locator('[data-fx="fps"]').textContent())).toBeLessThan(50);
});
