import { describe, expect, it } from 'vitest';

import { loadBenchmarks } from '@/fx/core/browser-env';

// The bundled tables replace detect-gpu's unpkg download (tech.md §13.3), so they must load
// exactly like its own loader: data version stripped, GPU entries left.
describe('loadBenchmarks', () => {
  it.each(['d-apple.json', 'd-nvidia.json', 'm-adreno.json', 'm-apple-ipad.json'])(
    'loads %s from the bundle without its version header',
    async (file) => {
      const entries = await loadBenchmarks(file);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries.slice(0, 5)) {
        expect(Array.isArray(entry)).toBe(true);
        expect(typeof entry[0]).toBe('string');
      }
    },
  );

  it('rejects a file that is not in the bundle', async () => {
    await expect(loadBenchmarks('../../package.json')).rejects.toThrow(/No detect-gpu benchmark/);
  });
});
