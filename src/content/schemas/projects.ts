// Frontmatter contract for `src/content/projects/<slug>/index.mdx` (tech.md §5.1).
// The schema is a factory so unit tests can swap Astro's `image()` and `reference()` (which only
// exist inside the content layer) for plain zod types. Messages are written for whoever edits the
// MDX file: Astro prints them next to the field path when the build fails.

import { z } from 'astro/zod';

export const PROJECT_TYPES = ['app', 'website', 'video'] as const;
export const PROJECT_FORMATS = ['full', 'short'] as const;
export const SERVICE_SLUGS = [
  'web-app-development',
  'website-development',
  'promo-videos',
  'educational-videos',
  'seo',
  'ai-integration',
] as const;

// SEO limits from AGENTS.md §8 and tech.md §12.1.
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MIN = 140;
export const SEO_DESCRIPTION_MAX = 160;
// `summary` doubles as a meta description fallback (tech.md §5.1).
export const SUMMARY_MAX = 160;
// Oldest project year we accept; guards against typos such as `202`.
export const MIN_PROJECT_YEAR = 2000;

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// YouTube video IDs are 11 URL-safe base64 characters.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
// Hover previews are self-hosted files under public/ (no third-party media, tech.md §1).
const HOVER_VIDEO_PATH = /^\/(?!.*\.\.)[A-Za-z0-9/_.-]+\.(?:mp4|webm)$/;

const text = (field: string) =>
  z
    .string({ error: `${field} is required.` })
    .trim()
    .min(1, { error: `${field} must not be empty.` });

// Strict object whose unknown-key error names the key and where to add it. Astro prints the issue
// path in front of the message, and that path is empty for top-level keys.
const strict = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Unknown field ${issue.keys.map((key) => `"${key}"`).join(', ')}. Remove it, or add it to src/content/schemas/projects.ts and tech.md §5.1.`
        : undefined,
  });

const uniqueList = <T extends z.ZodType>(item: T, field: string) =>
  z
    .array(item)
    .min(1, { error: `${field} needs at least one item.` })
    .refine((list) => new Set(list).size === list.length, {
      error: `${field} has duplicate items.`,
    });

export interface ProjectSchemaDeps<
  Image extends z.ZodType,
  ClientRef extends z.ZodType,
  TestimonialRef extends z.ZodType,
> {
  /** `image()` from the schema context: validates and imports a co-located image. */
  image: () => Image;
  /** `reference('clients')` */
  clientRef: ClientRef;
  /** `reference('testimonials')` */
  testimonialRef: TestimonialRef;
}

export function projectSchema<
  Image extends z.ZodType,
  ClientRef extends z.ZodType,
  TestimonialRef extends z.ZodType,
>({ image, clientRef, testimonialRef }: ProjectSchemaDeps<Image, ClientRef, TestimonialRef>) {
  return strict({
    title: text('title'),
    slug: z.string().regex(KEBAB_CASE, {
      error: 'slug must be lowercase kebab-case, e.g. "avicena-clinic-system".',
    }),
    client: strict({
      name: text('client.name'),
      country: text('client.country'),
      industry: text('client.industry'),
      logo: clientRef.optional(),
    }),
    type: z.enum(PROJECT_TYPES),
    format: z.enum(PROJECT_FORMATS),
    featured: z.boolean(),
    order: z.number().int().min(0),
    year: z.number().int().min(MIN_PROJECT_YEAR),
    duration: text('duration').optional(),
    role: text('role'),
    services: uniqueList(z.enum(SERVICE_SLUGS), 'services'),
    stack: uniqueList(text('stack item'), 'stack'),
    summary: text('summary').max(SUMMARY_MAX, {
      error: `summary must be ${SUMMARY_MAX} characters or fewer.`,
    }),
    outcome: text('outcome'),
    // `source` is internal (never rendered): every number on the site must be traceable to
    // content/intake (AGENTS.md §7).
    metrics: z
      .array(
        strict({
          label: text('metrics.label'),
          value: text('metrics.value'),
          approximate: z.boolean(),
          source: text('metrics.source'),
        }),
      )
      .optional(),
    liveUrl: z.url({ protocol: /^https$/, error: 'liveUrl must be an https:// URL.' }).optional(),
    cover: image(),
    coverAlt: text('coverAlt'),
    thumb: image(),
    thumbAlt: text('thumbAlt'),
    hoverVideo: z
      .string()
      .regex(HOVER_VIDEO_PATH, {
        error:
          'hoverVideo must be a path under public/ ending in .mp4 or .webm, e.g. "/media/x.mp4".',
      })
      .optional(),
    youtubeId: z
      .string()
      .regex(YOUTUBE_ID, { error: 'youtubeId must be the 11-character YouTube video ID.' })
      .optional(),
    testimonial: testimonialRef.optional(),
    seo: strict({
      title: text('seo.title').max(SEO_TITLE_MAX, {
        error: `seo.title must be ${SEO_TITLE_MAX} characters or fewer.`,
      }),
      description: text('seo.description')
        .min(SEO_DESCRIPTION_MIN, {
          error: `seo.description must be ${SEO_DESCRIPTION_MIN}–${SEO_DESCRIPTION_MAX} characters.`,
        })
        .max(SEO_DESCRIPTION_MAX, {
          error: `seo.description must be ${SEO_DESCRIPTION_MIN}–${SEO_DESCRIPTION_MAX} characters.`,
        }),
      keywords: uniqueList(text('seo keyword'), 'seo.keywords'),
    }),
    publishedAt: z.coerce.date({ error: 'publishedAt must be a date (YYYY-MM-DD).' }),
    updatedAt: z.coerce.date({ error: 'updatedAt must be a date (YYYY-MM-DD).' }).optional(),
    draft: z.boolean(),
  }).superRefine((project, ctx) => {
    if (project.updatedAt && project.updatedAt < project.publishedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['updatedAt'],
        message: 'updatedAt must not be before publishedAt.',
      });
    }
    if (project.year > project.publishedAt.getUTCFullYear()) {
      ctx.addIssue({
        code: 'custom',
        path: ['year'],
        message: 'year must not be after the publishedAt year.',
      });
    }
    // Video projects open a short case study with the embed (prd.md §7.2).
    if (project.type === 'video' && !project.youtubeId) {
      ctx.addIssue({
        code: 'custom',
        path: ['youtubeId'],
        message: 'youtubeId is required for type "video".',
      });
    }
  });
}

/**
 * Entry ID for the glob loader. Projects live in `<slug>/index.mdx`; the folder name and the
 * frontmatter `slug` must agree, because the slug becomes the URL and never changes after launch
 * (prd.md §5). Runs before schema validation, so it only checks what it needs.
 */
export function projectIdFromEntry(entry: string, data: Record<string, unknown>): string {
  const folder = entry.split('/')[0] ?? '';
  if (data.slug !== folder) {
    throw new Error(
      `projects/${entry}: frontmatter slug "${String(data.slug)}" must match the folder name "${folder}".`,
    );
  }
  return folder;
}
