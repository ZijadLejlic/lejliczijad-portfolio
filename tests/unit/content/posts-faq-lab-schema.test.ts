import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { faqSchema } from '@/content/schemas/faq';
import { labSchema } from '@/content/schemas/lab';
import { postSchema } from '@/content/schemas/posts';
import { SEO_DESCRIPTION_MIN, SUMMARY_MAX } from '@/content/schemas/projects';

import { issuesOf, pathsOf, without, type Input } from './helpers';

const post = postSchema({ image: () => z.string(), projectRef: z.string() });
const faq = faqSchema();
const lab = labSchema({ image: () => z.string() });

const validPost = (): Input => ({
  title: 'How Much Does a Custom Web App Cost in 2027?',
  slug: 'custom-web-app-cost-2027',
  description: 'What drives the price of a custom web app.',
  publishedAt: '2026-11-26',
  tags: ['pricing', 'web-apps'],
  cover: './cover.png',
  coverAlt: 'Price ranges for web app projects',
  draft: false,
  seo: {
    title: 'Custom web app cost in 2027',
    description: 'x'.repeat(SEO_DESCRIPTION_MIN),
    keywords: ['custom web app cost'],
  },
});

const validLab = (): Input => ({
  slug: 'vortex-playground',
  title: 'Vortex playground',
  description: 'Tune the particle vortex with sliders.',
  tech: ['three.js', 'GLSL'],
  component: 'VortexPlayground',
  cover: './cover.png',
  coverAlt: 'Particle vortex with parameter sliders',
  publishedAt: '2026-11-26',
});

describe('posts schema', () => {
  it('accepts a post, with optional related projects', () => {
    expect(pathsOf(post, validPost())).toEqual([]);
    expect(pathsOf(post, { ...validPost(), relatedProjects: ['avicena'] })).toEqual([]);
  });

  it.each(['2027-01-web-app-cost', 'web-app-cost-2027-01-15', 'news-2026-11'])(
    'rejects a date in slug %s',
    (slug) => {
      expect(issuesOf(post, { ...validPost(), slug })).toEqual([
        { path: 'slug', message: 'slug must not contain a date (prd.md §5).' },
      ]);
    },
  );

  it.each(['title', 'slug', 'description', 'cover', 'coverAlt', 'draft', 'seo', 'tags'])(
    'requires %s',
    (field) => {
      expect(pathsOf(post, without(validPost(), field))).toContain(field);
    },
  );

  it('validates tags, description length and date order', () => {
    expect(pathsOf(post, { ...validPost(), tags: ['Web Apps'] })).toEqual(['tags.0']);
    expect(pathsOf(post, { ...validPost(), tags: ['seo', 'seo'] })).toEqual(['tags']);
    expect(pathsOf(post, { ...validPost(), description: 'x'.repeat(SUMMARY_MAX + 1) })).toEqual([
      'description',
    ]);
    expect(pathsOf(post, { ...validPost(), updatedAt: '2026-11-01' })).toEqual(['updatedAt']);
  });
});

describe('faq schema', () => {
  const item = (id: string) => ({ id, q: 'How do you invoice?', a: 'Monthly, by milestone.' });

  it('accepts a group of questions', () => {
    expect(pathsOf(faq, { group: 'Pricing & payment', items: [item('invoicing')] })).toEqual([]);
  });

  it('rejects empty groups, duplicate IDs and non-kebab IDs', () => {
    expect(pathsOf(faq, { group: 'Pricing', items: [] })).toEqual(['items']);
    expect(
      issuesOf(faq, { group: 'Pricing', items: [item('invoicing'), item('invoicing')] }),
    ).toEqual([{ path: 'items.1.id', message: 'items.id "invoicing" is used more than once.' }]);
    expect(pathsOf(faq, { group: 'Pricing', items: [item('How invoicing')] })).toEqual([
      'items.0.id',
    ]);
  });
});

describe('lab schema', () => {
  it('accepts an experiment', () => {
    expect(pathsOf(lab, validLab())).toEqual([]);
  });

  it.each(['vortexPlayground', 'vortex-playground', 'Vortex Playground'])(
    'rejects component name %s',
    (component) => {
      expect(pathsOf(lab, { ...validLab(), component })).toEqual(['component']);
    },
  );

  it.each(['slug', 'component', 'cover', 'coverAlt', 'publishedAt'])('requires %s', (field) => {
    expect(pathsOf(lab, without(validLab(), field))).toContain(field);
  });
});
