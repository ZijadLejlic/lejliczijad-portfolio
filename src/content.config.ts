// Content collections (tech.md §5). Each schema is strict: unknown or missing fields fail the build
// with the field path and a message from the schema module.

import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';

import { projectIdFromEntry, projectSchema } from '@/content/schemas/projects';

const projects = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: './src/content/projects',
    generateId: ({ entry, data }) => projectIdFromEntry(entry, data),
  }),
  schema: ({ image }) =>
    projectSchema({
      image,
      // `clients` and `testimonials` collections arrive in P1.CNT.02; until then a project that
      // sets `client.logo` or `testimonial` fails the build because the collection is missing.
      clientRef: reference('clients'),
      testimonialRef: reference('testimonials'),
    }),
});

export const collections = { projects };
