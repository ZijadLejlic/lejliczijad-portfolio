// Minimal site for tests/unit/content-references.test.ts: a real `astro build` with only the
// content-references integration, so the test sees the log event Astro actually emits.
import { join } from 'node:path';

import { defineConfig } from 'astro/config';

import { contentReferences } from '../../../scripts/checks/content-references.ts';

const out = process.env.FIXTURE_OUT_DIR;
if (!out) throw new Error('FIXTURE_OUT_DIR is required');

export default defineConfig({
  output: 'static',
  outDir: join(out, 'dist'),
  cacheDir: join(out, 'cache'),
  integrations: [contentReferences()],
});
