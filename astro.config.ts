import { execFileSync } from 'node:child_process';

import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import { defineConfig, envField } from 'astro/config';

import { site } from './src/data/site.ts';

// Commit shown by /api/health (tech.md §9.6). CI provides GITHUB_SHA; locally ask git.
function appVersion(): string {
  const sha = process.env.GITHUB_SHA;
  if (sha) return sha.slice(0, 12);
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Rendering baseline from tech.md §4. Worker settings live in wrangler.jsonc (P1.ENV.13).
export default defineConfig({
  site: site.url,
  trailingSlash: 'never',
  output: 'static',
  // MDX for content collections (tech.md §2, §5): case studies, posts, services, lab.
  integrations: [mdx()],
  adapter: cloudflare({
    // Images are optimized once at build with Sharp (tech.md §2: astro:assets, AVIF + WebP);
    // the Worker never transforms images, so no Cloudflare Images binding is needed.
    imageService: 'compile',
  }),
  // No sessions (tech.md §1: no database, no sessions). Without this the adapter adds and
  // auto-provisions a SESSION KV namespace on deploy.
  session: false,
  build: {
    format: 'file',
  },
  vite: {
    define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  // Env contract from tech.md §9.7. Public vars are validated when `astro:env/client` is first
  // imported during dev/build (src/lib/deploy-env.ts), so a missing required var fails the build.
  // Secrets are read at runtime from the Worker env (`wrangler secret put` / `.dev.vars`), are
  // validated on first access and are never inlined into the bundle.
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', url: true }),
      PUBLIC_DEPLOY_ENV: envField.enum({
        context: 'client',
        access: 'public',
        values: ['production', 'preview', 'development'],
      }),
      // Optional until the features that need them land (P1.CONT.04, P1.ANL.02).
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_UMAMI_WEBSITE_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),

      TURNSTILE_SECRET: envField.string({ context: 'server', access: 'secret' }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      // tech.md §9.7 asks for 32+ random bytes; base64 of 32 bytes is 44 chars.
      LEAD_TOKEN_SECRET: envField.string({ context: 'server', access: 'secret', min: 44 }),
      IP_HASH_SALT: envField.string({ context: 'server', access: 'secret', min: 32 }),
      // Not secret, but tech.md §9.7 makes them Worker vars read at runtime, and only the
      // `secret` access level is read from the runtime env instead of being inlined at build.
      CONTACT_TO: envField.string({ context: 'server', access: 'secret' }),
      MAIL_FROM: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
