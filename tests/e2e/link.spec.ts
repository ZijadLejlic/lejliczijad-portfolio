import { expect, test } from '../fixtures/stable';

// Link (P1.DS.11) on the component gallery (/_dev/ui exists in dev and preview builds only).
test.describe('Link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/_dev/ui#link');
  });

  test('an external link is announced with the new-tab hint and opens a new tab', async ({
    page,
    context,
  }) => {
    const demo = page.locator('[data-demo="link"]');
    const github = demo.getByRole('link', { name: 'GitHub (opens in a new tab)' }).first();
    await expect(github).toHaveAttribute('target', '_blank');
    await expect(github).toHaveAttribute('rel', 'noopener noreferrer');

    // Answer the request locally; only the new tab matters, not GitHub.
    await context.route('https://github.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
    );
    const popupPromise = context.waitForEvent('page');
    await github.click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toContain('github.com/ZijadLejlic');
    // noopener: the new tab gets no handle back to this page.
    expect(await popup.evaluate(() => window.opener)).toBeNull();
    await popup.close();
  });

  test('an internal link has no hint and activates with Enter', async ({ page }) => {
    const internal = page
      .locator('[data-demo="link"]')
      .getByRole('link', { name: 'internal case study', exact: true });
    await expect(internal).not.toHaveAttribute('target');
    await internal.focus();
    await expect(internal).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#link$/);
  });

  test('the underline draws in on hover and focus', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.match(/pixel|iphone/i) !== null, 'No hover on touch devices.');
    const label = page
      .locator('[data-demo="link"]')
      .getByRole('link', { name: 'Work', exact: true })
      .locator('.link__label');
    const hoverLineWidth = () =>
      label.evaluate((el) => getComputedStyle(el).backgroundSize.split(',')[0]?.trim() ?? '');

    // Reduced motion (stable fixture) makes the transition instant.
    await expect.poll(hoverLineWidth).toMatch(/^0%/);
    await label.hover();
    await expect.poll(hoverLineWidth).toMatch(/^100%/);
    await page.mouse.move(0, 0);
    await expect.poll(hoverLineWidth).toMatch(/^0%/);
    await label.locator('..').focus();
    await expect.poll(hoverLineWidth).toMatch(/^100%/);
  });
});
