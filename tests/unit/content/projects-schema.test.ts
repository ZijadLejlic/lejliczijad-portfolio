import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import {
  projectIdFromEntry,
  projectSchema,
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_MIN,
  SEO_TITLE_MAX,
  SUMMARY_MAX,
} from '@/content/schemas/projects';

// Astro's image() and reference() only exist inside the content layer; plain strings stand in.
const schema = projectSchema({
  image: () => z.string(),
  clientRef: z.string(),
  testimonialRef: z.string(),
});

const valid = () => ({
  title: 'Example — Clinic Management System',
  slug: 'example-clinic-system',
  client: { name: 'Example Clinic', country: 'Germany', industry: 'Healthcare' },
  type: 'app',
  format: 'full',
  featured: true,
  order: 1,
  year: 2025,
  role: 'Solo full-stack developer',
  services: ['web-app-development'],
  stack: ['Laravel', 'Vue'],
  summary: 'Short summary of the project.',
  outcome: 'One-sentence outcome.',
  cover: './cover.png',
  coverAlt: 'Dashboard of the example app',
  thumb: './thumb.png',
  thumbAlt: 'Dashboard thumbnail',
  seo: {
    title: 'Example case study',
    description: 'x'.repeat(SEO_DESCRIPTION_MIN),
    keywords: ['clinic software'],
  },
  publishedAt: '2026-11-26',
  draft: false,
});

// Loose on purpose: tests feed unknown keys and wrong types.
type Input = Record<string, unknown>;

function issues(input: Input) {
  const result = schema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

const paths = (input: Input) => issues(input).map((issue) => issue.path);

describe('projects schema', () => {
  it('accepts a complete project and coerces dates', () => {
    const result = schema.safeParse({
      ...valid(),
      duration: '4 months',
      metrics: [{ label: 'Less paperwork', value: '40%', approximate: true, source: 'intake' }],
      liveUrl: 'https://example.com',
      hoverVideo: '/media/example.webm',
      youtubeId: 'dQw4w9WgXcQ',
      updatedAt: '2026-12-01',
    });
    expect(result.success).toBe(true);
    expect(result.data?.publishedAt).toBeInstanceOf(Date);
  });

  it('rejects unknown fields at every level with a message naming the field', () => {
    const top = issues({ ...valid(), foo: 'bar' });
    expect(top).toHaveLength(1);
    expect(top[0]?.message).toContain('Unknown field "foo"');

    expect(paths({ ...valid(), client: { ...valid().client, city: 'Berlin' } })).toEqual([
      'client',
    ]);
    expect(paths({ ...valid(), seo: { ...valid().seo, canonical: '/x' } })).toEqual(['seo']);
  });

  it.each(['title', 'slug', 'type', 'format', 'cover', 'coverAlt', 'seo', 'publishedAt', 'draft'])(
    'requires %s',
    (field) => {
      const input = Object.fromEntries(
        Object.entries(valid()).filter(([key]) => key !== field),
      ) as Input;
      expect(paths(input)).toContain(field);
    },
  );

  it('rejects blank strings, including whitespace only', () => {
    expect(issues({ ...valid(), coverAlt: '   ' })).toEqual([
      { path: 'coverAlt', message: 'coverAlt must not be empty.' },
    ]);
  });

  it.each(['Avicena', 'avicena_clinic', 'avicena--clinic', '-avicena', 'avicena/clinic'])(
    'rejects non-kebab-case slug %s',
    (slug) => {
      expect(paths({ ...valid(), slug })).toEqual(['slug']);
    },
  );

  it('enforces SEO and summary lengths', () => {
    const seo = valid().seo;
    expect(paths({ ...valid(), seo: { ...seo, title: 'x'.repeat(SEO_TITLE_MAX + 1) } })).toEqual([
      'seo.title',
    ]);
    expect(
      paths({ ...valid(), seo: { ...seo, description: 'x'.repeat(SEO_DESCRIPTION_MIN - 1) } }),
    ).toEqual(['seo.description']);
    expect(
      paths({ ...valid(), seo: { ...seo, description: 'x'.repeat(SEO_DESCRIPTION_MAX + 1) } }),
    ).toEqual(['seo.description']);
    expect(
      paths({ ...valid(), seo: { ...seo, description: 'x'.repeat(SEO_DESCRIPTION_MAX) } }),
    ).toEqual([]);
    expect(paths({ ...valid(), summary: 'x'.repeat(SUMMARY_MAX + 1) })).toEqual(['summary']);
  });

  it('requires a source for every metric', () => {
    const metric = { label: 'Users', value: '120', approximate: false };
    expect(issues({ ...valid(), metrics: [metric] })).toEqual([
      { path: 'metrics.0.source', message: 'metrics.source is required.' },
    ]);
  });

  it('only accepts known services, without duplicates', () => {
    expect(paths({ ...valid(), services: ['web-design'] })).toEqual(['services.0']);
    expect(paths({ ...valid(), services: [] })).toEqual(['services']);
    expect(paths({ ...valid(), services: ['seo', 'seo'] })).toEqual(['services']);
    expect(paths({ ...valid(), stack: ['Vue', 'Vue'] })).toEqual(['stack']);
  });

  it('only accepts https live links', () => {
    expect(paths({ ...valid(), liveUrl: 'http://example.com' })).toEqual(['liveUrl']);
    expect(paths({ ...valid(), liveUrl: 'ftp://example.com' })).toEqual(['liveUrl']);
  });

  it.each(['https://cdn.example.com/a.mp4', 'media/a.mp4', '/media/a.mov', '/media/../a.mp4'])(
    'rejects hover video path %s',
    (hoverVideo) => {
      expect(paths({ ...valid(), hoverVideo })).toEqual(['hoverVideo']);
    },
  );

  it('validates the YouTube ID format', () => {
    expect(paths({ ...valid(), youtubeId: 'https://youtu.be/dQw4w9WgXcQ' })).toEqual(['youtubeId']);
  });

  it('requires a YouTube ID for video projects', () => {
    expect(paths({ ...valid(), type: 'video' })).toEqual(['youtubeId']);
    expect(paths({ ...valid(), type: 'video', youtubeId: 'dQw4w9WgXcQ' })).toEqual([]);
  });

  it('checks dates against each other', () => {
    expect(paths({ ...valid(), updatedAt: '2026-11-01' })).toEqual(['updatedAt']);
    expect(paths({ ...valid(), year: 2027 })).toEqual(['year']);
    expect(paths({ ...valid(), year: 202 })).toEqual(['year']);
    expect(paths({ ...valid(), publishedAt: 'soon' })).toEqual(['publishedAt']);
  });

  it('rejects fractional or negative order', () => {
    expect(paths({ ...valid(), order: 1.5 })).toEqual(['order']);
    expect(paths({ ...valid(), order: -1 })).toEqual(['order']);
  });
});

describe('projectIdFromEntry', () => {
  it('uses the folder name when it matches the slug', () => {
    expect(projectIdFromEntry('avicena/index.mdx', { slug: 'avicena' })).toBe('avicena');
  });

  it('fails with both names when slug and folder differ', () => {
    expect(() => projectIdFromEntry('avicena/index.mdx', { slug: 'avicena-clinic' })).toThrow(
      'frontmatter slug "avicena-clinic" must match the folder name "avicena"',
    );
    expect(() => projectIdFromEntry('avicena/index.mdx', {})).toThrow('slug "undefined"');
  });
});
