import { defineConfig, devices } from '@playwright/test';

import { site } from './src/data/site.ts';

// Playwright setup (tech.md §16). One config serves e2e, visual, a11y and overflow specs; each
// lives in its own folder under tests/ and the npm scripts pick the folder.
//
// By default the suite builds the site and serves dist/ with `astro preview`, so tests run against
// the same static HTML that ships. CI (P1.ENV.10) points PLAYWRIGHT_BASE_URL at the PR preview
// deploy instead, and then no local server is started.

// The repo does not ship @types/node (it would leak Node globals into browser code typings), so the
// one Node global this file reads is declared locally. Module-scoped, so it does not leak either.
declare const process: { env: Record<string, string | undefined> };

const PREVIEW_PORT = 4322; // Not 4321, so a running `pnpm dev` does not get picked up by mistake.
const LOCAL_BASE_URL = `http://localhost:${PREVIEW_PORT}`;
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests',
  testMatch: ['{e2e,visual,a11y,overflow}/**/*.spec.ts'],
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: externalBaseUrl ?? LOCAL_BASE_URL,
    // Stable-by-default context: reduced motion turns FX, reveals and smooth scroll off (tech.md
    // §6.5), and a fixed locale and timezone keep the footer clock and number formats deterministic.
    // The `?fx=off` half lives in tests/fixtures/stable.ts.
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: site.timezone,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'iphone-15', use: { ...devices['iPhone 15'] } },
  ],

  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm build && pnpm preview --port ${PREVIEW_PORT}`,
        url: LOCAL_BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
      },
});
