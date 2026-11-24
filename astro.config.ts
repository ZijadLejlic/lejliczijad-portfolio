import { defineConfig } from 'astro/config';

// Rendering baseline from tech.md §4. The Cloudflare adapter is added in P1.ENV.13.
export default defineConfig({
  site: 'https://lejliczijad.com',
  trailingSlash: 'never',
  output: 'static',
  build: {
    format: 'file',
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
