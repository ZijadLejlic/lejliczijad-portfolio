// FX spec: imports `test` from Playwright directly, because the stable fixture forces `?fx=off`
// (tech.md §16). /_dev/fx exists in dev and preview builds only (src/lib/dev-pages.ts).
import { expect, test, type Page } from '@playwright/test';

// P1.FX.08: the vortex simulation compiles, steps and draws in every browser without a GL error,
// survives a context loss, and starts nothing at `?fx=off`. Headless browsers render WebGL on the
// CPU (SwiftShader and friends), so this spec forces the low tier (16 384 particles) and checks
// that the simulation runs, not how fast; the FPS on the high tier is measured in a headed browser
// with a GPU (see the PR).

// Warnings the browser itself prints in this harness, not the site code (see fx-renderer.spec.ts).
const EXPECTED_WARNINGS = [/WebGL context was lost\./, /GPU stall due to ReadPixels/];

async function field(page: Page, name: string): Promise<string> {
  return (await page.locator(`[data-fx="${name}"]`).textContent()) ?? '';
}

async function simSteps(page: Page): Promise<number> {
  return Number(await field(page, 'sim-steps'));
}

function collectProblems(page: Page): string[] {
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
  return problems;
}

test('vortex simulation steps without GL errors and recovers from a context loss', async ({
  page,
}) => {
  const problems = collectProblems(page);

  await page.goto('/_dev/fx?scene=vortex&fx=low');
  const status = page.locator('[data-fx="status"]');
  await expect(status).not.toHaveText('starting');
  test.skip((await status.textContent()) === 'unsupported', 'No hardware WebGL2 in this browser');

  await expect(status).toHaveText('ready');
  await expect(page.locator('[data-fx="particles"]')).toHaveText('16384');
  await expect(page.locator('[data-fx="sim-build"]')).toContainText('ms in tasks');
  await expect.poll(() => simSteps(page)).toBeGreaterThan(5);
  // The sampled getError() runs after drawing the points, so it covers both passes and the draw.
  await expect(page.locator('[data-fx="gl-error"]')).toHaveText('none');

  await page.getByRole('button', { name: 'Lose context' }).click();
  await expect(status).toHaveText('lost');
  await page.getByRole('button', { name: 'Restore context' }).click();
  await expect(status).toHaveText('ready');
  // A rebuild restarts the step counter; it climbs again on the new context.
  await expect.poll(() => simSteps(page)).toBeGreaterThan(5);
  await expect(page.locator('[data-fx="gl-error"]')).toHaveText('none');

  expect(problems).toEqual([]);
});

test('vortex starts nothing at ?fx=off', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as Window & { __contexts?: number };
    w.__contexts = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      w.__contexts = (w.__contexts ?? 0) + 1;
      return original.apply(this, args);
    } as typeof original;
  });
  const problems = collectProblems(page);

  await page.goto('/_dev/fx?scene=vortex&fx=off');
  await expect(page.locator('[data-fx="status"]')).toHaveText('static');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as Window & { __contexts?: number }).__contexts)).toBe(
    0,
  );
  expect(await field(page, 'sim-steps')).toBe('–');
  expect(problems).toEqual([]);
});
