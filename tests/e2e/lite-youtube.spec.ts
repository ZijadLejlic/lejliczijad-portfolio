import { expect, test } from '../fixtures/stable';

// LiteYouTube (P1.DS.20) on the component gallery. YouTube is never contacted: the embed host is
// stubbed, so the test only checks that the iframe is created on click, not what YouTube serves.
const YOUTUBE_HOSTS = /youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com/;

test.describe('LiteYouTube', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/youtube-nocookie\.com/, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title>' }),
    );
  });

  test('makes no YouTube request and creates no iframe before the click', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (request) => urls.push(request.url()));

    await page.goto('/_dev/ui#lite-youtube');
    await page
      .locator('[data-demo="lite-youtube"] [data-lite-youtube]')
      .first()
      .scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');

    expect(urls.filter((url) => YOUTUBE_HOSTS.test(new URL(url).hostname))).toEqual([]);
    await expect(page.locator('[data-demo="lite-youtube"] iframe')).toHaveCount(0);
  });

  test('loads the nocookie iframe on click, names it and moves focus into it', async ({ page }) => {
    await page.goto('/_dev/ui#lite-youtube');
    const root = page.locator('[data-demo="lite-youtube"] [data-lite-youtube]').first();
    const play = root.getByRole('link', { name: 'Play video: Demo walkthrough' });
    const box = await root.boundingBox();

    await play.click();

    const frame = root.locator('iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('title', 'Demo walkthrough');
    const src = await frame.getAttribute('src');
    expect(src).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/aaaaaaaaaaa\?/);
    await expect(root).toHaveAttribute('data-state', 'playing');
    await expect(play).toHaveCount(0);
    // Same box: no layout shift when the poster becomes the player.
    expect((await root.boundingBox())?.height).toBeCloseTo(box?.height ?? 0, 0);
    expect(await frame.evaluate((el) => el === document.activeElement)).toBe(true);
  });

  test('starts from the keyboard with Enter', async ({ page }) => {
    await page.goto('/_dev/ui#lite-youtube');
    const root = page.locator('[data-demo="lite-youtube"] [data-lite-youtube]').first();
    await root.getByRole('link', { name: /Play video/ }).focus();
    await page.keyboard.press('Enter');
    await expect(root.locator('iframe')).toHaveCount(1);
  });

  test('portrait variant keeps 9:16', async ({ page }) => {
    await page.goto('/_dev/ui#lite-youtube');
    const box = await page
      .locator('[data-lite-youtube].lite-youtube--portrait')
      .first()
      .boundingBox();
    expect((box?.height ?? 0) / (box?.width ?? 1)).toBeCloseTo(16 / 9, 1);
  });

  test('stops the video when the dialog it is in closes', async ({ page }) => {
    await page.goto('/_dev/ui#lite-youtube');
    await page.getByRole('button', { name: 'Open video in a dialog' }).click();
    const dialog = page.getByRole('dialog', { name: 'Video in a dialog' });
    await dialog.getByRole('link', { name: /Play video/ }).click();
    await expect(dialog.locator('iframe')).toHaveCount(1);

    // Esc is not used here: with focus inside a cross-origin iframe the key goes to the iframe.
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(dialog).toBeHidden();
    const root = page.locator('#demo-modal-video [data-lite-youtube]');
    await expect(root.locator('iframe')).toHaveCount(0);
    await expect(root).toHaveAttribute('data-state', 'idle');
  });

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/_dev/ui#lite-youtube');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
});
