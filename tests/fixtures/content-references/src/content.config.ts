// FIXTURE_CASE picks which `links` folder loads: `valid` points at an existing item, `ghost` at
// one that does not exist.
import { glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';

const fixtureCase = process.env.FIXTURE_CASE === 'ghost' ? 'ghost' : 'valid';

const items = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/items' }),
  schema: z.object({ title: z.string() }),
});

const links = defineCollection({
  loader: glob({ pattern: '*.json', base: `./src/content/links-${fixtureCase}` }),
  schema: z.object({ relatedItems: z.array(reference('items')) }),
});

export const collections = { items, links };
