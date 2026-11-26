// Contract for `src/content/testimonials/<id>.json` (tech.md §5.2). Testimonials are published
// verbatim and only with written consent (AGENTS.md §7), so `consent` must be literally `true`.

import { z } from 'astro/zod';

import { date, httpsUrl, kebabCase, strictObject, text, youtubeId } from './shared';

const FILE = 'testimonials.ts';

// Longest excerpt shown on the site (prd.md §13, 2026-11-24).
export const QUOTE_MAX = 400;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const TESTIMONIAL_SOURCES = ['direct', 'clutch', 'google'] as const;

const LINKEDIN_URL = /^https:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^/?#]+\/?$/;

export interface TestimonialSchemaDeps<Image extends z.ZodType, ProjectRef extends z.ZodType> {
  image: () => Image;
  /** `reference('projects')` */
  projectRef: ProjectRef;
}

export function testimonialSchema<Image extends z.ZodType, ProjectRef extends z.ZodType>({
  image,
  projectRef,
}: TestimonialSchemaDeps<Image, ProjectRef>) {
  return strictObject(FILE, {
    id: kebabCase('id', 'avicena-director'),
    quote: text('quote').max(QUOTE_MAX, {
      error: `quote must be ${QUOTE_MAX} characters or fewer.`,
    }),
    author: text('author'),
    role: text('role'),
    company: text('company'),
    photo: image().optional(),
    linkedin: httpsUrl('linkedin')
      .regex(LINKEDIN_URL, {
        error: 'linkedin must be a profile URL, e.g. "https://www.linkedin.com/in/name".',
      })
      .optional(),
    projectRef: projectRef.optional(),
    videoYoutubeId: youtubeId('videoYoutubeId').optional(),
    rating: z
      .number()
      .int({ error: 'rating must be a whole number.' })
      .min(RATING_MIN, { error: `rating must be ${RATING_MIN}–${RATING_MAX}.` })
      .max(RATING_MAX, { error: `rating must be ${RATING_MIN}–${RATING_MAX}.` })
      .optional(),
    source: z.enum(TESTIMONIAL_SOURCES),
    date: date('date'),
    consent: z.literal(true, {
      error: 'consent must be true: publish a testimonial only with the client’s written consent.',
    }),
  });
}
