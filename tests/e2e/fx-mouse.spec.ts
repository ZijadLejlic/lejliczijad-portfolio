// FX spec: imports `test` from Playwright directly, because the stable fixture forces `?fx=off`
// (tech.md §16). /_dev/fx exists in dev and preview builds only (src/lib/dev-pages.ts).
import { expect, test, type Page } from '@playwright/test';

// P1.FX.10: a mouse over the vortex turns the field on, the field follows it and fades out when
// the pointer leaves, and the shader with the field compiles and draws without a GL error. Touch
// never moves the field. How strong the push looks is checked by eye in a headed browser (PR).

// Warnings the browser itself prints in this harness, not the site code (see fx-vortex.spec.ts).
const EXPECTED_WARNINGS = [/GPU stall due to ReadPixels/];

async function field(page: Page, name: string): Promise<string> {
  return (await page.locator(`[data-fx="${name}"]`).textContent()) ?? '';
}

/** Amount from the "Mouse" field ("off" or "0.42 at x, z"). */
async function mouseAmount(page: Page): Promise<number> {
  const text = await field(page, 'mouse');
  return text === 'off' || text === '–' ? 0 : Number(text.split(' ')[0]);
}

async function open(page: Page): Promise<void> {
  const problems: string[] = [];
  page.on('console', (message) => {
    const expected =
      message.type() === 'warning' &&
      EXPECTED_WARNINGS.some((pattern) => pattern.test(message.text()));
    if (!expected && (message.type() === 'error' || message.type() === 'warning')) {
      problems.push(message.text());
    }
  });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto('/_dev/fx?scene=vortex&fx=low');
  const status = page.locator('[data-fx="status"]');
  await expect(status).not.toHaveText('starting');
  test.skip((await status.textContent()) === 'unsupported', 'No hardware WebGL2 in this browser');
  await expect(status).toHaveText('ready');
  await expect.poll(async () => Number(await field(page, 'sim-steps'))).toBeGreaterThan(5);
  // Problems are checked by each test at its end.
  (page as Page & { problems?: string[] }).problems = problems;
}

function problems(page: Page): string[] {
  return (page as Page & { problems?: string[] }).problems ?? [];
}

/** Synthetic pointer events: the same on desktop and mobile projects, unlike page.mouse. */
async function point(page: Page, pointerType: string, x: number, y: number): Promise<void> {
  await page.evaluate(
    ([type, clientX, clientY]) => {
      document.body.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerType: String(type),
          clientX: Number(clientX),
          clientY: Number(clientY),
          bubbles: true,
        }),
      );
    },
    [pointerType, x, y] as const,
  );
}

test('a mouse over the vortex turns the field on, and it fades out when the mouse leaves', async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('[data-fx="mouse"]')).toHaveText('off');

  const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
  for (let i = 0; i < 10; i += 1) {
    await point(page, 'mouse', width * 0.5 + i * 8, height * 0.55);
    await page.waitForTimeout(30);
  }
  await expect.poll(() => mouseAmount(page)).toBeGreaterThan(0.1);
  // The shaders with the field compiled and drew.
  await expect(page.locator('[data-fx="gl-error"]')).toHaveText('none');

  await page.evaluate(() => {
    document.body.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, relatedTarget: null }),
    );
  });
  await expect(page.locator('[data-fx="mouse"]')).toHaveText('off', { timeout: 5000 });
  expect(problems(page)).toEqual([]);
});

test('touch never moves the field', async ({ page }) => {
  await open(page);
  const { width, height } = page.viewportSize() ?? { width: 1280, height: 720 };
  for (let i = 0; i < 10; i += 1) {
    await point(page, 'touch', width * 0.5 + i * 8, height * 0.55);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(300);
  await expect(page.locator('[data-fx="mouse"]')).toHaveText('off');
  expect(problems(page)).toEqual([]);
});
