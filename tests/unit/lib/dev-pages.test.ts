import { describe, expect, it } from 'vitest';

import { DEV_PAGES, shouldServeDevPages } from '@/lib/dev-pages';

// /_dev/* must never reach a production build (P1.DS.08, P1.DS.26).
describe('shouldServeDevPages', () => {
  it('always serves dev pages from `astro dev`', () => {
    expect(shouldServeDevPages('dev', 'production')).toBe(true);
    expect(shouldServeDevPages('dev', undefined)).toBe(true);
  });

  it('builds them into development and preview builds', () => {
    expect(shouldServeDevPages('build', 'development')).toBe(true);
    expect(shouldServeDevPages('build', 'preview')).toBe(true);
  });

  it('keeps them out of production and fails closed on an unknown env', () => {
    expect(shouldServeDevPages('build', 'production')).toBe(false);
    expect(shouldServeDevPages('build', undefined)).toBe(false);
    expect(shouldServeDevPages('build', 'staging')).toBe(false);
  });

  it('only registers routes under /_dev', () => {
    for (const page of DEV_PAGES) expect(page.pattern).toMatch(/^\/_dev\//);
  });
});
