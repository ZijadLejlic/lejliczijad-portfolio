import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { entryName, idFromEntry, uniqueList } from '@/content/schemas/shared';

describe('entryName', () => {
  it.each([
    ['avicena.json', 'avicena'],
    ['web-app-development.mdx', 'web-app-development'],
    ['custom-web-app-cost/index.mdx', 'custom-web-app-cost'],
    ['index.mdx', 'index'],
  ])('%s → %s', (entry, name) => {
    expect(entryName(entry)).toBe(name);
  });
});

describe('idFromEntry', () => {
  const generateId = idFromEntry('services', 'slug');

  it('returns the file name when the field matches it', () => {
    expect(generateId({ entry: 'seo.mdx', data: { slug: 'seo' } })).toBe('seo');
  });

  it('fails with both names when they differ', () => {
    expect(() => generateId({ entry: 'seo.mdx', data: { slug: 'ai-integration' } })).toThrow(
      'services/seo.mdx: slug "ai-integration" must match the file name "seo".',
    );
  });
});

describe('uniqueList', () => {
  it('compares objects by value, as references are objects after transform', () => {
    const list = uniqueList(z.object({ collection: z.string(), id: z.string() }), 'refs');
    const ref = { collection: 'projects', id: 'avicena' };
    expect(list.safeParse([ref, { ...ref }]).success).toBe(false);
    expect(list.safeParse([ref, { ...ref, id: 'kp-bau' }]).success).toBe(true);
  });

  it('enforces the requested size', () => {
    const list = uniqueList(z.string(), 'items', { min: 2, max: 3 });
    expect(list.safeParse(['a']).error?.issues[0]?.message).toBe('items needs 2–3 items.');
    expect(list.safeParse(['a', 'b', 'c', 'd']).success).toBe(false);
    expect(list.safeParse(['a', 'b']).success).toBe(true);
  });
});
