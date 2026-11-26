// FX spec: imports `test` from Playwright directly, because the stable fixture forces `?fx=off`
// (tech.md §16). /_dev/fx exists in dev and preview builds only (src/lib/dev-pages.ts), which is
// what CI and the local Playwright server build.
import { expect, test, type Page } from '@playwright/test';

// P1.FX.05 "Gotovo kad": a simulated context loss recovers without errors.

// Warnings the browser itself prints in this harness, not the site code:
// - Firefox reports every context loss, including the one this test causes on purpose.
// - Headless Chromium reads the canvas back on the CPU to composite it and logs the driver stall.
//   A headed browser with a GPU prints neither (checked by hand on /_dev/fx).
const EXPECTED_WARNINGS = [/WebGL context was lost\./, /GPU stall due to ReadPixels/];

async function field(page: Page, name: string): Promise<string> {
  return (await page.locator(`[data-fx="${name}"]`).textContent()) ?? '';
}

async function frames(page: Page): Promise<number> {
  return Number(await field(page, 'frames'));
}

test('renderer recovers from one context loss and gives up on the second', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    const expected =
      message.type() === 'warning' &&
      EXPECTED_WARNINGS.some((pattern) => pattern.test(message.text()));
    if (!expected && (message.type() === 'error' || message.type() === 'warning')) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

  await page.goto('/_dev/fx?fx=high');
  const status = page.locator('[data-fx="status"]');
  await expect(status).not.toHaveText('starting');
  test.skip((await status.textContent()) === 'unsupported', 'No hardware WebGL2 in this browser');

  await expect(status).toHaveText('ready');
  await expect.poll(() => frames(page)).toBeGreaterThan(0);
  expect(await field(page, 'size')).toMatch(/^[1-9]\d*×[1-9]\d* @(1|1\.5|2)$/);

  await page.getByRole('button', { name: 'Lose context' }).click();
  await expect(status).toHaveText('lost');
  const framesWhileLost = await frames(page);

  await page.getByRole('button', { name: 'Restore context' }).click();
  await expect(status).toHaveText('ready');
  await expect(page.locator('[data-fx="restores"]')).toHaveText('1');
  // Drawing resumes on the restored context, without a GL error.
  await expect.poll(() => frames(page)).toBeGreaterThan(framesWhileLost + 2);
  await expect(page.locator('[data-fx="gl-error"]')).toHaveText('none');

  await page.getByRole('button', { name: 'Lose context' }).click();
  await expect(status).toHaveText('failed');

  expect(problems).toEqual([]);
});
