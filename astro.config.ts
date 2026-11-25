import { defineConfig, envField } from 'astro/config';

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
