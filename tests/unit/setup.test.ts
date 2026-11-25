import { describe, expect, it } from 'vitest';

// Smoke tests for the Vitest setup itself (P1.ENV.08). Replace with real unit tests as modules land.
describe('vitest setup (unit)', () => {
  it('runs in Node', () => {
    // Node 21+ exposes navigator; this avoids pulling in @types/node just for a smoke test.
    expect(navigator.userAgent).toMatch(/^Node\.js\//);
  });

  it('resolves the @/* alias to src/', async () => {
    // `?raw` loads the file as text, so this proves path resolution without rendering Astro.
    const { default: source } = await import('@/pages/index.astro?raw');
    expect(source).toContain('<html lang="en">');
  });
});
