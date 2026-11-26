// FX spec: imports `test` from Playwright directly, because the stable fixture forces `?fx=off`
// (tech.md §16). /_dev/fx exists in dev and preview builds only (src/lib/dev-pages.ts).
import { expect, test, type Page } from '@playwright/test';

// P1.FX.06 "Gotovo kad": 0 % GPU while the tab is hidden. The proxy measured here: while paused,
// the page requests no animation frame and issues no draw call, so the GPU gets no work from it.
//
// Headless browsers keep a page "visible" when another tab is brought to the front (checked in all
// five projects), so the hidden tab is simulated: `document.visibilityState` is overridden and
// `visibilitychange` dispatched, exactly what the browser does. A real hidden tab was checked by
// hand in a headed browser (see the PR).

const QUIET_MS = 500;

declare global {
  interface Window {
    __rafRequests: number;
    __draws: number;
  }
}

async function countersAfterQuiet(page: Page): Promise<{ raf: number; draws: number }> {
  const before = await page.evaluate(() => ({ raf: window.__rafRequests, draws: window.__draws }));
  await page.waitForTimeout(QUIET_MS);
  const after = await page.evaluate(() => ({ raf: window.__rafRequests, draws: window.__draws }));
  return { raf: after.raf - before.raf, draws: after.draws - before.draws };
}

async function setTabHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (value ? 'hidden' : 'visible'),
    });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.beforeEach(async ({ page }) => {
  // Counts every rAF request and every WebGL draw call the page makes.
  await page.addInitScript(() => {
    window.__rafRequests = 0;
    window.__draws = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      window.__rafRequests += 1;
      return request(callback);
    };
    const proto = WebGL2RenderingContext.prototype;
    for (const name of ['drawArrays', 'drawElements'] as const) {
      const original = proto[name] as (...args: unknown[]) => void;
      Object.defineProperty(proto, name, {
        configurable: true,
        value(this: WebGL2RenderingContext, ...args: unknown[]) {
          window.__draws += 1;
          original.apply(this, args);
        },
      });
    }
  });

  await page.goto('/_dev/fx?fx=high');
  const status = page.locator('[data-fx="status"]');
  await expect(status).not.toHaveText('starting');
  test.skip((await status.textContent()) === 'unsupported', 'No hardware WebGL2 in this browser');
  await expect(page.locator('[data-fx="loop"]')).toHaveText('running');
});

test('the loop stops all frames and draws while the tab is hidden', async ({ page }) => {
  const running = await countersAfterQuiet(page);
  expect(running.raf).toBeGreaterThan(5);
  expect(running.draws).toBeGreaterThan(5);

  await setTabHidden(page, true);
  await expect(page.locator('[data-fx="paused-by"]')).toHaveText('hidden');
  await expect(page.locator('[data-fx="loop"]')).toHaveText('paused');
  expect(await countersAfterQuiet(page)).toEqual({ raf: 0, draws: 0 });

  await setTabHidden(page, false);
  await expect(page.locator('[data-fx="loop"]')).toHaveText('running');
  expect((await countersAfterQuiet(page)).draws).toBeGreaterThan(5);
});

test('the loop pauses while the canvas is hidden', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Hide canvas' });
  await toggle.click();
  await expect(page.locator('[data-fx="paused-by"]')).toHaveText('offscreen');
  expect(await countersAfterQuiet(page)).toEqual({ raf: 0, draws: 0 });

  await page.getByRole('button', { name: 'Show canvas' }).click();
  await expect(page.locator('[data-fx="loop"]')).toHaveText('running');
});

test('the loop pauses while the WebGL context is lost', async ({ page }) => {
  await page.getByRole('button', { name: 'Lose context' }).click();
  await expect(page.locator('[data-fx="paused-by"]')).toHaveText('context');
  expect(await countersAfterQuiet(page)).toEqual({ raf: 0, draws: 0 });

  await page.getByRole('button', { name: 'Restore context' }).click();
  await expect(page.locator('[data-fx="loop"]')).toHaveText('running');
});
