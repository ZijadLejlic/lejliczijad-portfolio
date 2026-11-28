// Shared constants and pure helpers for LiteYouTube (P1.DS.20). The behavior is in
// lite-youtube-controller.ts; styles in src/styles/lite-youtube.css.

export type LiteYouTubeAspect = 'landscape' | 'portrait';

/** On the root: the 11-character YouTube video ID. */
export const LITE_YOUTUBE_ID_ATTR = 'data-video-id';

/** On the root: the video title, used as the accessible name of the iframe. */
export const LITE_YOUTUBE_TITLE_ATTR = 'data-video-title';

/** On the root of every LiteYouTube; the controller finds it with this. */
export const LITE_YOUTUBE_ROOT_ATTR = 'data-lite-youtube';

/** On the play link: a click loads the iframe. */
export const LITE_YOUTUBE_PLAY_ATTR = 'data-lite-youtube-play';

/** Bubbles from the root when the iframe is created; detail: { id }. Hook for `video_play`
 *  analytics (prd.md §6.10, P1.ANL.03). */
export const LITE_YOUTUBE_PLAY_EVENT = 'lite-youtube:play';

/** Same rule as the content schemas (src/content/schemas/shared.ts): 11 URL-safe characters. */
const YOUTUBE_ID = /^[\w-]{11}$/;

/**
 * Feature policy of the iframe. accelerometer and gyroscope are left out on purpose: the site's
 * Permissions-Policy (tech.md §13.2) only allows them for itself, so asking for them would be a
 * console warning for nothing.
 */
export const LITE_YOUTUBE_ALLOW = 'autoplay; encrypted-media; picture-in-picture; fullscreen';

export function isYoutubeId(id: string): boolean {
  return YOUTUBE_ID.test(id);
}

/** Throws at build time on a malformed ID instead of shipping a broken embed. */
export function assertYoutubeId(id: string): string {
  if (!isYoutubeId(id)) {
    throw new Error(`LiteYouTube: "${id}" is not a YouTube video ID (11 characters).`);
  }
  return id;
}

/** Link of the no-JS fallback: the video on YouTube. */
export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(assertYoutubeId(id))}`;
}

/** youtube-nocookie embed that starts playing (the click that created it is the user gesture). */
export function embedUrl(id: string): string {
  const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(assertYoutubeId(id))}?${params}`;
}

export function liteYouTubeClasses(aspect: LiteYouTubeAspect): string[] {
  return ['lite-youtube', `lite-youtube--${aspect}`];
}
