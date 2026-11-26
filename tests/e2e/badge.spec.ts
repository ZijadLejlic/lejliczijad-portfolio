import { expect, test } from '../fixtures/stable';

// Availability badge (P1.DS.12) on the component gallery: the text is readable, the dot is
// hidden from assistive tech, and the pulse runs only without reduced motion.
const ring = '[data-demo="availability-badge"] [data-availability="available"] .badge__dot--pulse';

const ringAnimation = (el: Element) => getComputedStyle(el, '::after').animationName;

test.describe('AvailabilityBadge', () => {
  test('exposes the label as text and hides the dot', async ({ page }) => {
    await page.goto('/_dev/ui#availability-badge');
    const demo = page.locator('[data-demo="availability-badge"]');

    await expect(demo.getByText('Available for new projects — January 2027')).toBeVisible();
    await expect(demo.getByText('Fully booked until March 2027')).toBeVisible();
    await expect(demo.locator('.badge__dot').first()).toHaveAttribute('aria-hidden', 'true');
  });

  test('pulses only without reduced motion', async ({ page }) => {
    // The stable fixture runs with reducedMotion: 'reduce'.
    await page.goto('/_dev/ui#availability-badge');
    await expect(page.locator(ring).first()).toBeAttached();
    expect(await page.locator(ring).first().evaluate(ringAnimation)).toBe('none');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    expect(await page.locator(ring).first().evaluate(ringAnimation)).not.toBe('none');
  });
});
