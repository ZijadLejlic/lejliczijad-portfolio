import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/stable';

// Keyboard behavior of Modal (P1.DS.19) on the component gallery (/_dev/ui exists in dev and
// preview builds only). Runs in all 5 Playwright projects.

async function scrollLocked(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.hasAttribute('data-scroll-lock') &&
      getComputedStyle(document.documentElement).overflow === 'hidden',
  );
}

async function focusedInside(page: Page, dialogId: string): Promise<boolean> {
  return page.evaluate(
    (id) => document.getElementById(id)?.contains(document.activeElement) ?? false,
    dialogId,
  );
}

test.describe('Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/_dev/ui#modal');
  });

  test('opens from the keyboard, traps Tab, closes on Esc and returns focus', async ({
    page,
    browserName,
  }) => {
    // WebKit, like Safari, tabs only to form fields unless Option is held.
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    const shiftTab = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    const dialog = page.getByRole('dialog', { name: 'Meet Zijad' });

    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(dialog).toBeHidden();
    await trigger.focus();
    await page.keyboard.press('Enter');

    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close dialog' });
    await expect(close).toBeFocused();
    expect(await scrollLocked(page)).toBe(true);

    // close → link → Cancel → Book a call → back to close.
    const bookCall = dialog.getByRole('link', { name: 'Book a call' });
    const order = [
      dialog.getByRole('link', { name: 'A link inside the dialog' }),
      dialog.getByRole('button', { name: 'Cancel' }),
      bookCall,
      close,
    ];
    for (const target of order) {
      await page.keyboard.press(tab);
      await expect(target).toBeFocused();
    }
    await page.keyboard.press(shiftTab);
    await expect(bookCall).toBeFocused(); // the last element, reached backward from the first
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press(tab);
      expect(await focusedInside(page, 'demo-modal')).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    // Esc closes natively; the cleanup runs on the `close` event, one task later.
    await expect.poll(() => scrollLocked(page)).toBe(false);
  });

  test('the close button and [data-modal-close] close it and return focus', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    const dialog = page.getByRole('dialog', { name: 'Meet Zijad' });

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Enter'); // focus starts on the close button
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Space');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('locks page scroll while open and keeps the scroll position', async ({ page }, testInfo) => {
    const trigger = page.getByRole('button', { name: 'Open dialog' });
    await trigger.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    const widthBefore = await page.evaluate(() => document.documentElement.clientWidth);

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Meet Zijad' })).toBeVisible();
    expect(await scrollLocked(page)).toBe(true);
    // No sideways shift: the content width stays the same with the scrollbar gutter kept.
    expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(widthBefore);

    // Mobile emulation has no mouse wheel in every engine; the overflow check covers it there.
    if (!testInfo.project.use.isMobile) {
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);
    }

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Meet Zijad' })).toBeHidden();
    // Esc closes natively; the cleanup runs on the `close` event, one task later.
    await expect.poll(() => scrollLocked(page)).toBe(false);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('a backdrop click closes the default dialog but not the form dialog', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Meet Zijad' });
    await page.getByRole('button', { name: 'Open dialog' }).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(4, 4); // top-left corner: always backdrop
    await expect(dialog).toBeHidden();

    const formTrigger = page.getByRole('button', { name: 'Open form dialog' });
    const form = page.getByRole('dialog', { name: 'Email me this estimate' });
    await formTrigger.focus();
    await page.keyboard.press('Enter');
    await expect(form).toBeVisible();
    await expect(form.getByLabel('Email')).toBeFocused(); // data-modal-autofocus wins over the close button
    await page.mouse.click(4, 4);
    await expect(form).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(form).toBeHidden();
    await expect(formTrigger).toBeFocused();
    // Esc closes natively; the cleanup runs on the `close` event, one task later.
    await expect.poll(() => scrollLocked(page)).toBe(false);
  });
});
