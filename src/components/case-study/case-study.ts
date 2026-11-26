// Pure helpers behind the case-study MDX components (P1.CNT.04). Kept out of the .astro files so
// unit tests can cover them without rendering.

import type { ImageMetadata } from 'astro';

/** An image used in MDX: always paired with its alt text (AGENTS.md §6.2). */
export interface CaseStudyImage {
  src: ImageMetadata;
  alt: string;
}

// Output formats for every case-study image (tech.md §2: AVIF + WebP, original as fallback).
export const IMAGE_FORMATS = ['avif', 'webp'] as const;

// Same rule as the content schemas (src/content/schemas/shared.ts): 11 URL-safe characters.
const YOUTUBE_ID = /^[\w-]{11}$/;

// Prefixes an author may already have typed for an approximate number.
const APPROXIMATE_PREFIX = /^(?:~|about\s+)/i;

/**
 * Value of a metric without any approximate marker. The component adds the marker itself, so
 * "~40%", "about 40%" and "40%" with `approximate` all render the same way (AGENTS.md §7).
 */
export function metricValue(value: string): string {
  const trimmed = value.trim().replace(APPROXIMATE_PREFIX, '').trim();
  if (trimmed === '') throw new Error('Metric: value must not be empty.');
  return trimmed;
}

/** Throws at build time on a malformed ID instead of shipping a broken link. */
export function assertYoutubeId(id: string): string {
  if (!YOUTUBE_ID.test(id)) {
    throw new Error(`VideoWalkthrough: "${id}" is not a YouTube video ID (11 characters).`);
  }
  return id;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(assertYoutubeId(id))}`;
}

/** Host shown for a live link, e.g. "aps-aluminium.ba". Only https links are accepted. */
export function linkHost(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error(`Summary: liveUrl must be https (${url}).`);
  return parsed.host.replace(/^www\./, '');
}
