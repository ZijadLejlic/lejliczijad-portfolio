import { readFileSync } from 'node:fs';

import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { getViteConfig } from 'astro/config';
import { defineProject } from 'vitest/config';

// API tests run with the same compatibility date as production. It is read from wrangler.jsonc
// instead of passing `wrangler.configPath`, because that config's `main` is the Astro server
// entrypoint, which only builds through Astro's Vite plugins.
const COMPATIBILITY_DATE_PATTERN = /"compatibility_date":\s*"(\d{4}-\d{2}-\d{2})"/;
const WORKERS_COMPATIBILITY_DATE = COMPATIBILITY_DATE_PATTERN.exec(
  readFileSync(new URL('./wrangler.jsonc', import.meta.url), 'utf8'),
)?.[1];
if (!WORKERS_COMPATIBILITY_DATE) {
  throw new Error('vitest.config.ts: compatibility_date not found in wrangler.jsonc');
}

// Two projects (tech.md §16):
// - unit: plain Node, built on Astro's Vite config so `@/*` resolves the way it does in the app.
// - api:  runs inside workerd through the Cloudflare Vitest plugin. Astro's Vite plugins are not
//         loaded there, so the alias comes from tsconfig `paths` via Vite's native resolver.
export default getViteConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
          // Vitest stubs CSS to an empty string by default, even with `?raw`. Token tests
          // (tests/unit/styles) read the real source of src/styles, so let those through.
          css: { include: [/src\/styles\/.+\.css/] },
        },
      },
      defineProject({
        resolve: { tsconfigPaths: true },
        plugins: [
          cloudflareTest({
            miniflare: { compatibilityDate: WORKERS_COMPATIBILITY_DATE },
          }),
        ],
        test: {
          name: 'api',
          include: ['tests/api/**/*.test.ts'],
        },
      }),
    ],
  },
});
