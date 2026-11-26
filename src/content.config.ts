// Content collections (tech.md §5). Each schema is strict: unknown or missing fields fail the build
// with the field path and a message from the schema module.

import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';

import { clientSchema } from '@/content/schemas/clients';
import { faqSchema } from '@/content/schemas/faq';
import { labSchema } from '@/content/schemas/lab';
import { postSchema } from '@/content/schemas/posts';
import { projectIdFromEntry, projectSchema } from '@/content/schemas/projects';
import { serviceSchema } from '@/content/schemas/services';
import { entryName, idFromEntry } from '@/content/schemas/shared';
import { testimonialSchema } from '@/content/schemas/testimonials';

const base = (collection: string) => `./src/content/${collection}`;

const projects = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: base('projects'),
    generateId: ({ entry, data }) => projectIdFromEntry(entry, data),
  }),
  schema: ({ image }) =>
    projectSchema({
      image,
      clientRef: reference('clients'),
      testimonialRef: reference('testimonials'),
    }),
});

const testimonials = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: base('testimonials'),
    generateId: idFromEntry('testimonials', 'id'),
  }),
  schema: ({ image }) => testimonialSchema({ image, projectRef: reference('projects') }),
});

const clients = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: base('clients'),
    generateId: idFromEntry('clients', 'id'),
  }),
  schema: ({ image }) => clientSchema({ image }),
});

const services = defineCollection({
  loader: glob({
    pattern: '*.mdx',
    base: base('services'),
    generateId: idFromEntry('services', 'slug'),
  }),
  schema: () => serviceSchema({ projectRef: reference('projects') }),
});

const posts = defineCollection({
  loader: glob({
    pattern: '*/index.mdx',
    base: base('posts'),
    generateId: idFromEntry('posts', 'slug'),
  }),
  schema: ({ image }) => postSchema({ image, projectRef: reference('projects') }),
});

// The file name is the group ID; the JSON has no ID field of its own.
const faq = defineCollection({
  loader: glob({
    pattern: '*.json',
    base: base('faq'),
    generateId: ({ entry }) => entryName(entry),
  }),
  schema: faqSchema,
});

const lab = defineCollection({
  loader: glob({ pattern: '*.mdx', base: base('lab'), generateId: idFromEntry('lab', 'slug') }),
  schema: ({ image }) => labSchema({ image }),
});

export const collections = { projects, testimonials, clients, services, posts, faq, lab };
