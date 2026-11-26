import { expect, test } from '../fixtures/stable';

// Keyboard behavior of Button (P1.DS.10) on the component gallery. /_dev/ui exists in dev and
// preview builds (the ones Playwright runs against), never in production.
test.describe('Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/_dev/ui#button');
  });

  test('disabled controls leave the tab order; a loading button keeps focus', async ({
    page,
    browserName,
  }) => {
    const demo = page.locator('[data-demo="button"]');

    await expect(demo.getByRole('button', { name: 'Disabled button' })).toBeDisabled();
    const disabledLink = demo.getByRole('link', { name: 'Disabled link' });
    await expect(disabledLink).toHaveAttribute('aria-disabled', 'true');
    await expect(disabledLink).not.toHaveAttribute('href');

    const loading = demo.getByRole('button', { name: 'Send message Sending' });
    await expect(loading).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled, not the disabled attribute: Playwright reports it as disabled, but it stays
    // in the tab order.
    await expect(loading).not.toHaveAttribute('disabled');

    // Tab forward from the control just before the disabled pair; the next stop is the loading
    // button, so both disabled controls were skipped.
    await demo.getByRole('link', { name: 'Opens in a new tab' }).focus();
    // WebKit, like Safari, tabs only to form fields unless Option is held.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(loading).toBeFocused();
  });

  test('a loading submit button ignores Enter, Space and implicit submission', async ({ page }) => {
    const form = page.locator('#button-form');
    const submit = form.getByRole('button', { name: 'Submit form Sending' });
    const startUrl = page.url();

    await form.getByLabel('Name').fill('Test');
    await form.getByLabel('Name').press('Enter');
    await submit.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(submit).toBeFocused();
    // Safari does not focus a button on click, so focus is checked before the click.
    await submit.click({ force: true });

    // Give a navigation the chance to start before asserting it did not.
    await page.waitForTimeout(300);
    expect(page.url()).toBe(startUrl);
  });

  test('an enabled button link is reachable and activates with Enter', async ({ page }) => {
    const link = page.locator('[data-demo="button"]').getByRole('link', { name: 'Meet me' });
    await link.focus();
    await expect(link).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#button-form$/);
  });
});
