// Contract for `src/content/lab/<slug>.mdx` (tech.md §5.2, prd.md §7.7).

import { z } from 'astro/zod';

import { SUMMARY_MAX } from './projects';
import { date, kebabCase, strictObject, text, uniqueList } from './shared';

const FILE = 'lab.ts';

// Name of the Svelte island that runs the experiment, e.g. "VortexPlayground".
const COMPONENT_NAME = /^[A-Z][A-Za-z0-9]*$/;

export interface LabSchemaDeps<Image extends z.ZodType> {
  image: () => Image;
}

export function labSchema<Image extends z.ZodType>({ image }: LabSchemaDeps<Image>) {
  return strictObject(FILE, {
    slug: kebabCase('slug', 'vortex-playground'),
    title: text('title'),
    description: text('description').max(SUMMARY_MAX, {
      error: `description must be ${SUMMARY_MAX} characters or fewer.`,
    }),
    tech: uniqueList(text('tech item'), 'tech'),
    component: z.string().regex(COMPONENT_NAME, {
      error: 'component must be a PascalCase component name, e.g. "VortexPlayground".',
    }),
    cover: image(),
    // Not in the tech.md §5.2 list, but every image needs alt text (AGENTS.md §6.2).
    coverAlt: text('coverAlt'),
    publishedAt: date('publishedAt'),
  });
}
