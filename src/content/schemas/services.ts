// Contract for `src/content/services/<slug>.mdx` (tech.md §5.2, page sections in prd.md §7.4).

import { z } from 'astro/zod';

import { SERVICE_SLUGS } from './projects';
import { seoSchema, strictObject, text, uniqueList } from './shared';

const FILE = 'services.ts';

// prd.md §7.4: "FAQ (4–6 questions)" and "relevant projects (2–3 cards)".
export const SERVICE_FAQ_MIN = 4;
export const SERVICE_FAQ_MAX = 6;
export const RELATED_PROJECTS_MIN = 2;
export const RELATED_PROJECTS_MAX = 3;

export interface ServiceSchemaDeps<ProjectRef extends z.ZodType> {
  /** `reference('projects')` */
  projectRef: ProjectRef;
}

export function serviceSchema<ProjectRef extends z.ZodType>({
  projectRef,
}: ServiceSchemaDeps<ProjectRef>) {
  return strictObject(FILE, {
    slug: z.enum(SERVICE_SLUGS, {
      error: `slug must be one of: ${SERVICE_SLUGS.join(', ')}.`,
    }),
    title: text('title'),
    h1: text('h1'),
    summary: text('summary'),
    deliverables: uniqueList(text('deliverables item'), 'deliverables'),
    audience: uniqueList(text('audience item'), 'audience'),
    process: z
      .array(
        strictObject(FILE, {
          title: text('process.title'),
          description: text('process.description'),
        }),
      )
      .min(1, { error: 'process needs at least 1 step.' }),
    tech: uniqueList(text('tech item'), 'tech'),
    // Shown as "Projects typically from €X" (whole euros, prd.md §7.4).
    fromPrice: z
      .number()
      .int({ error: 'fromPrice must be whole euros.' })
      .positive({ error: 'fromPrice must be greater than 0.' })
      .optional(),
    relatedProjects: uniqueList(projectRef, 'relatedProjects', {
      min: RELATED_PROJECTS_MIN,
      max: RELATED_PROJECTS_MAX,
    }),
    faq: z
      .array(strictObject(FILE, { q: text('faq.q'), a: text('faq.a') }))
      .min(SERVICE_FAQ_MIN, { error: `faq needs ${SERVICE_FAQ_MIN}–${SERVICE_FAQ_MAX} questions.` })
      .max(SERVICE_FAQ_MAX, {
        error: `faq needs ${SERVICE_FAQ_MIN}–${SERVICE_FAQ_MAX} questions.`,
      }),
    seo: seoSchema(FILE),
  });
}
