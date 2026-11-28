import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import LiteYouTube from '@/components/media/LiteYouTube.astro';
import {
  LITE_YOUTUBE_ALLOW,
  assertYoutubeId,
  embedUrl,
  isYoutubeId,
  liteYouTubeClasses,
  watchUrl,
} from '@/components/media/lite-youtube';

import css from '@/styles/lite-youtube.css?raw';

// Helpers and server-rendered markup of LiteYouTube (P1.DS.20). Clicking, the iframe and the
// zero-request guarantee run in real browsers in tests/e2e/lite-youtube.spec.ts.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

const ID = 'dQw4w9WgXcQ';

describe('video ID and URLs', () => {
  it('accepts only 11 URL-safe characters', () => {
    expect(isYoutubeId(ID)).toBe(true);
    expect(isYoutubeId('a-b_c-d_e-f')).toBe(true);
    expect(isYoutubeId('short')).toBe(false);
    expect(isYoutubeId(`${ID}&list=x`)).toBe(false);
    expect(() => assertYoutubeId('nope')).toThrow(/not a YouTube video ID/);
  });

  it('builds a youtube-nocookie embed that autoplays and a plain watch link', () => {
    const url = new URL(embedUrl(ID));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe(`/embed/${ID}`);
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
    expect(watchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });

  it('does not ask for sensors the site Permissions-Policy blocks', () => {
    expect(LITE_YOUTUBE_ALLOW).not.toMatch(/accelerometer|gyroscope/);
  });

  it('names the aspect class', () => {
    expect(liteYouTubeClasses('portrait')).toEqual(['lite-youtube', 'lite-youtube--portrait']);
  });
});

describe('LiteYouTube markup', () => {
  async function render(props: Record<string, unknown>) {
    return container.renderToString(LiteYouTube, { props });
  }

  it('renders a link and no iframe or YouTube image before the click', async () => {
    const html = await render({ youtubeId: ID, title: 'Walkthrough' });
    expect(html).toContain(`href="https://www.youtube.com/watch?v=${ID}"`);
    expect(html).toContain('Play video: Walkthrough');
    expect(html).toContain(`data-video-id="${ID}"`);
    expect(html).not.toMatch(/<iframe/);
    expect(html).not.toMatch(/ytimg|youtube-nocookie/);
  });

  it('defaults to landscape and can be portrait', async () => {
    expect(await render({ youtubeId: ID, title: 'T' })).toContain('lite-youtube--landscape');
    expect(await render({ youtubeId: ID, title: 'T', aspect: 'portrait' })).toContain(
      'lite-youtube--portrait',
    );
  });

  it('fails the build on a malformed ID', async () => {
    await expect(render({ youtubeId: 'x', title: 'Bad' })).rejects.toThrow(
      /not a YouTube video ID/,
    );
  });
});

describe('lite-youtube.css', () => {
  it('scopes every rule to .lite-youtube', () => {
    const selectors = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(^|\})\s*([^{}]+)\{/g)]
      .map((m) => m[2]?.trim() ?? '')
      .flatMap((list) => list.split(','))
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('@'));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toMatch(/^\.lite-youtube/);
  });
});
