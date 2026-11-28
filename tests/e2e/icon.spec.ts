import { expect, test } from '../fixtures/stable';

import { ICON_NAMES } from '../../src/components/ui/icons';

// Icon (P1.DS.13): every icon is inline SVG, so the gallery loads no icon file of any kind.
test.describe('Icon', () => {
  test('renders the whole set inline and makes no icon requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/_dev/ui#icon');
    const demo = page.locator('[data-demo="icon"]');
    for (const name of ICON_NAMES) {
      await expect(demo.locator(`svg[data-icon="${name}"]`).first()).toBeVisible();
    }

    const iconRequests = requests.filter((url) =>
      /\.svg(\?|#|$)|sprite|lucide/i.test(new URL(url).pathname),
    );
    expect(iconRequests).toEqual([]);
    expect(await page.locator('svg use').count()).toBe(0);
  });

  test('is hidden from assistive tech unless labelled', async ({ page }) => {
    await page.goto('/_dev/ui#icon');
    const demo = page.locator('[data-demo="icon"]');
    await expect(demo.getByRole('img', { name: 'Done' })).toBeVisible();
    await expect(demo.locator('svg[data-icon="mail"]').first()).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('takes its color from the text and its size from the token', async ({ page }) => {
    await page.goto('/_dev/ui#icon');
    const labelled = page.getByRole('img', { name: 'Done' });
    const { stroke, color, width } = await labelled.evaluate((el) => {
      const style = getComputedStyle(el);
      return { stroke: style.stroke, color: style.color, width: el.getBoundingClientRect().width };
    });
    expect(stroke).toBe(color);
    expect(width).toBe(20);
  });
});

test('a container can size the default icon with one class', async ({ page }) => {
  // Button sizes its icons to 1.25em; Icon's own 1em default must not win.
  await page.goto('/_dev/ui#button');
  const icon = page.locator('.button__icon svg[data-icon="arrow-right"]').first();
  const { width, fontSize } = await icon.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    fontSize: parseFloat(getComputedStyle(el).fontSize),
  }));
  expect(width).toBeCloseTo(fontSize * 1.25, 1);
});
