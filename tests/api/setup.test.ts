import { describe, expect, it } from 'vitest';

// Smoke tests for the Workers test pool (P1.ENV.08). Endpoint tests for /api/* land with P1.CONT.05+.
describe('vitest setup (api)', () => {
  it('runs inside the Workers runtime', () => {
    expect(navigator.userAgent).toBe('Cloudflare-Workers');
  });

  it('has the Web Crypto API that the server code relies on', async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lejliczijad'));
    expect(digest.byteLength).toBe(32);
  });

  it('resolves the @/* alias to src/', async () => {
    const { default: source } = await import('@/pages/index.astro?raw');
    expect(source).toContain('<html lang="en">');
  });
});
