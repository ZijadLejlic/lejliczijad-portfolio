import { describe, expect, it } from 'vitest';

import { healthResponse } from '@/server/health';

describe('GET /api/health', () => {
  it('returns only ok and version', async () => {
    const response = healthResponse('abc1234');
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ ok: true, version: 'abc1234' });
  });

  it('is never cached and is sent as JSON', () => {
    const { headers } = healthResponse('abc1234');
    expect(headers.get('Cache-Control')).toBe('no-store');
    expect(headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
