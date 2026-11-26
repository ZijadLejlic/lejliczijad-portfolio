// Contract for `src/content/posts/<slug>/index.mdx` (tech.md §5.2, prd.md §7.8).

import { z } from 'astro/zod';

import { SUMMARY_MAX } from './projects';
import {
  checkDateOrder,
  date,
  kebabCase,
  seoSchema,
  strictObject,
  text,
  uniqueList,
} from './shared';

const FILE = 'posts.ts';

// Blog slugs carry no publish date (prd.md §5); a bare year such as "web-app-cost-2027" is fine.
const DATE_IN_SLUG = /(?:^|-)\d{4}-\d{2}(?:-|$)/;

export interface PostSchemaDeps<Image extends z.ZodType, ProjectRef extends z.ZodType> {
  image: () => Image;
  /** `reference('projects')` */
  projectRef: ProjectRef;
}

export function postSchema<Image extends z.ZodType, ProjectRef extends z.ZodType>({
  image,
  projectRef,
}: PostSchemaDeps<Image, ProjectRef>) {
  return strictObject(FILE, {
    title: text('title'),
    slug: kebabCase('slug', 'custom-web-app-cost').refine((slug) => !DATE_IN_SLUG.test(slug), {
      error: 'slug must not contain a date (prd.md §5).',
    }),
    // Listing and card text; the meta description lives in `seo.description`.
    description: text('description').max(SUMMARY_MAX, {
      error: `description must be ${SUMMARY_MAX} characters or fewer.`,
    }),
    publishedAt: date('publishedAt'),
    updatedAt: date('updatedAt').optional(),
    tags: uniqueList(kebabCase('tag', 'web-apps'), 'tags'),
    cover: image(),
    coverAlt: text('coverAlt'),
    draft: z.boolean(),
    seo: seoSchema(FILE),
    relatedProjects: uniqueList(projectRef, 'relatedProjects').optional(),
  }).superRefine(checkDateOrder);
}
