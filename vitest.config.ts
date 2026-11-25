import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { getViteConfig } from 'astro/config';
import { defineProject } from 'vitest/config';

// Pinned so API tests do not drift with the local workerd build. P1.ENV.13 moves this
// into wrangler.jsonc, and the api project then reads it from there via `wrangler.configPath`.
const WORKERS_COMPATIBILITY_DATE = '2026-11-10';

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
