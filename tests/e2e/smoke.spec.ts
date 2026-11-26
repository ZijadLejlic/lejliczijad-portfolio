import { expect, test } from '../fixtures/stable';

// Smoke test for the Playwright setup (P1.ENV.09). Real flows (menu, forms, filter) arrive with
// their tasks; this proves the server, browsers, devices and stable mode are wired up.
test('home page loads cleanly in stable mode', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));

  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).searchParams.get('fx')).toBe('off');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(/Zijad Lejlić/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

  expect(problems).toEqual([]);
});
