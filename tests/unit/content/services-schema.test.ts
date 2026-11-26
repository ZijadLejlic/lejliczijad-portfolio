import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { SEO_DESCRIPTION_MIN } from '@/content/schemas/projects';
import { SERVICE_FAQ_MAX, SERVICE_FAQ_MIN, serviceSchema } from '@/content/schemas/services';

import { issuesOf, pathsOf, without, type Input } from './helpers';

const schema = serviceSchema({ projectRef: z.string() });

const faq = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ q: `Question ${index}?`, a: 'Answer.' }));

const valid = (): Input => ({
  slug: 'web-app-development',
  title: 'Web app development',
  h1: 'Custom web apps for growing businesses',
  summary: 'What the client gets.',
  deliverables: ['Working MVP'],
  audience: ['Clinic owners'],
  process: [{ title: 'Discovery', description: 'We map the workflow.' }],
  tech: ['Laravel', 'Vue'],
  relatedProjects: ['avicena', 'kp-bau'],
  faq: faq(SERVICE_FAQ_MIN),
  seo: {
    title: 'Web app development',
    description: 'x'.repeat(SEO_DESCRIPTION_MIN),
    keywords: ['web app developer'],
  },
});

describe('services schema', () => {
  it('accepts a complete service', () => {
    expect(pathsOf(schema, { ...valid(), fromPrice: 4500 })).toEqual([]);
  });

  it('only accepts the six service slugs', () => {
    expect(issuesOf(schema, { ...valid(), slug: 'web-design' })[0]?.message).toContain(
      'slug must be one of: web-app-development',
    );
  });

  it.each(['h1', 'deliverables', 'process', 'relatedProjects', 'faq', 'seo'])(
    'requires %s',
    (field) => {
      expect(pathsOf(schema, without(valid(), field))).toContain(field);
    },
  );

  it(`needs ${SERVICE_FAQ_MIN}–${SERVICE_FAQ_MAX} FAQ entries`, () => {
    expect(pathsOf(schema, { ...valid(), faq: faq(SERVICE_FAQ_MIN - 1) })).toEqual(['faq']);
    expect(pathsOf(schema, { ...valid(), faq: faq(SERVICE_FAQ_MAX + 1) })).toEqual(['faq']);
    expect(pathsOf(schema, { ...valid(), faq: faq(SERVICE_FAQ_MAX) })).toEqual([]);
  });

  it('needs 2–3 distinct related projects', () => {
    expect(pathsOf(schema, { ...valid(), relatedProjects: ['avicena'] })).toEqual([
      'relatedProjects',
    ]);
    expect(pathsOf(schema, { ...valid(), relatedProjects: ['avicena', 'avicena'] })).toEqual([
      'relatedProjects',
    ]);
    expect(pathsOf(schema, { ...valid(), relatedProjects: ['a', 'b', 'c', 'd'] })).toEqual([
      'relatedProjects',
    ]);
  });

  it('only accepts a positive whole-euro starting price', () => {
    expect(pathsOf(schema, { ...valid(), fromPrice: 0 })).toEqual(['fromPrice']);
    expect(pathsOf(schema, { ...valid(), fromPrice: 999.5 })).toEqual(['fromPrice']);
  });

  it('keeps process steps and FAQ entries strict', () => {
    expect(
      pathsOf(schema, {
        ...valid(),
        process: [{ title: 'Discovery', description: 'x', weeks: 1 }],
      }),
    ).toEqual(['process.0']);
    expect(pathsOf(schema, { ...valid(), process: [] })).toEqual(['process']);
  });
});
