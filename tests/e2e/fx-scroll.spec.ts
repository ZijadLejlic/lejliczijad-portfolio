// FX spec: imports `test` from Playwright directly, because the stable fixture forces `?fx=off`
// (tech.md §16). /_dev/fx exists in dev and preview builds only (src/lib/dev-pages.ts).
import { expect, test, type Page } from '@playwright/test';

// P1.FX.11: scrolling the page speeds up the vortex without a jerk. The dev page shows the scroll
// value, its peak and the largest change between two frames; a hard, fast wheel scroll must raise
// it, settle back to 0 and never change it by more than the tracker's rise rate allows in one
// (clamped) frame. A jump (scrollTo far away) must not register as a scroll at all.

/** SCROLL.MAX_RISE_RATE × MAX_DELTA_S: the largest legal change in one frame. */
const MAX_FRAME_STEP = 4 * 0.05;

async function field(page: Page, name: string): Promise<number> {
  return Number((await page.locator(`[data-fx="${name}"]`).textContent()) ?? Number.NaN);
}

async function open(page: Page): Promise<void> {
  await page.goto('/_dev/fx?scene=vortex&fx=low&panel=on');
  const status = page.locator('[data-fx="status"]');
  await expect(status).not.toHaveText('starting');
  test.skip((await status.textContent()) === 'unsupported', 'No hardware WebGL2 in this browser');
  await expect(status).toHaveText('ready');
  await expect.poll(() => field(page, 'scroll')).toBe(0);
}

test('a fast wheel scroll speeds the vortex up and eases back without a jerk', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Wheel input is a desktop check; touch scrolling runs the same tracker');
  await open(page);

  await page.mouse.move(400, 300);
  for (let i = 0; i < 12; i += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(30);
  }
  await expect.poll(() => field(page, 'scroll-peak')).toBeGreaterThan(0.3);
  expect(await field(page, 'scroll-peak')).toBeLessThan(1);
  // Once the page rests, the value falls back to exactly 0.
  await expect.poll(() => field(page, 'scroll'), { timeout: 10_000 }).toBe(0);
  expect(await field(page, 'scroll-max-step')).toBeLessThanOrEqual(MAX_FRAME_STEP);
});

test('a jump (scrollTo far away) is not a scroll', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  expect(await field(page, 'scroll-peak')).toBe(0);
});
