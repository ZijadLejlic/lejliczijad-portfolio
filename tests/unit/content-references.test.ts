import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AstroIntegrationLogger } from 'astro';
import { afterEach, describe, expect, it } from 'vitest';

import {
  contentReferences,
  formatFailure,
  isInvalidReference,
} from '../../scripts/checks/content-references';

type Destination = AstroIntegrationLogger['options']['destination'];
type LogEvent = Parameters<Destination['write']>[0];

const MESSAGE =
  'Invalid content reference: entry "demo" in collection "posts" (field: relatedProjects[0]) ' +
  'references "ghost" in collection "projects", but that entry does not exist.';

const event = (overrides: Partial<LogEvent> = {}): LogEvent => ({
  label: 'content',
  level: 'error',
  message: MESSAGE,
  newLine: true,
  ...overrides,
});

describe('isInvalidReference', () => {
  it('matches the content error Astro logs for a missing entry', () => {
    expect(isInvalidReference(event())).toBe(true);
  });

  it('ignores other levels, labels and messages', () => {
    expect(isInvalidReference(event({ level: 'warn' }))).toBe(false);
    expect(isInvalidReference(event({ label: 'build' }))).toBe(false);
    expect(isInvalidReference(event({ message: 'Synced content' }))).toBe(false);
  });
});

describe('formatFailure', () => {
  it('lists every invalid reference', () => {
    expect(formatFailure([MESSAGE, MESSAGE])).toBe(
      [
        'Build stopped: 2 invalid content references.',
        `  - ${MESSAGE}`,
        `  - ${MESSAGE}`,
        'Fix the referenced ID or add the missing entry (tech.md §5.2).',
      ].join('\n'),
    );
  });

  it('uses the singular for one reference', () => {
    expect(formatFailure([MESSAGE])).toMatch(/^Build stopped: 1 invalid content reference\.$/m);
  });
});

// Runs the two hooks by hand against a fake logger, in the order `astro build` runs them.
function runHooks(events: LogEvent[]) {
  const written: LogEvent[] = [];
  const destination: Destination = { write: (e) => written.push(e) };
  const logger = { options: { destination, level: 'info' } } as unknown as AstroIntegrationLogger;
  const { hooks } = contentReferences();
  const setup = hooks['astro:config:setup'] as unknown as (p: { logger: typeof logger }) => void;
  const buildStart = hooks['astro:build:start'] as unknown as () => void;

  setup({ logger });
  for (const e of events) destination.write(e);
  return { written, buildStart };
}

describe('contentReferences integration', () => {
  it('throws on build start after an invalid reference was logged', () => {
    const { buildStart } = runHooks([event()]);
    expect(buildStart).toThrow(/Build stopped: 1 invalid content reference\./);
  });

  it('still passes every log line through to the original destination', () => {
    const lines = [event({ level: 'info', message: 'Synced content' }), event()];
    expect(runHooks(lines).written).toEqual(lines);
  });

  it('does not throw when no invalid reference was logged', () => {
    const { buildStart } = runHooks([event({ level: 'warn', message: 'No files found' })]);
    expect(buildStart).not.toThrow();
  });
});

// A real `astro build` of tests/fixtures/content-references, so an Astro upgrade that changes the
// log event (label, level or text) fails here instead of silently letting bad references through.
describe('astro build with the integration', () => {
  const FIXTURE = join('tests', 'fixtures', 'content-references');
  const ASTRO = join(process.cwd(), 'node_modules', '.bin', 'astro');
  const BUILD_TIMEOUT_MS = 60_000;
  let outDir: string | undefined;

  afterEach(() => {
    // Astro writes generated types next to the fixture's config; dist and cache go to outDir.
    rmSync(join(FIXTURE, '.astro'), { recursive: true, force: true });
    if (outDir) rmSync(outDir, { recursive: true, force: true });
    outDir = undefined;
  });

  function build(fixtureCase: 'valid' | 'ghost') {
    outDir = mkdtempSync(join(tmpdir(), 'content-references-'));
    return spawnSync(ASTRO, ['build'], {
      cwd: FIXTURE,
      encoding: 'utf8',
      env: { ...process.env, FIXTURE_CASE: fixtureCase, FIXTURE_OUT_DIR: outDir },
    });
  }

  it(
    'fails with the missing entry named',
    () => {
      const result = build('ghost');
      const output = result.stdout + result.stderr;
      expect(result.status).not.toBe(0);
      expect(output).toContain('Build stopped: 1 invalid content reference.');
      expect(output).toContain('references "ghost" in collection "items"');
    },
    BUILD_TIMEOUT_MS,
  );

  it(
    'builds when every reference exists',
    () => {
      const result = build('valid');
      expect(result.stdout + result.stderr).not.toContain('Build stopped');
      expect(result.status).toBe(0);
    },
    BUILD_TIMEOUT_MS,
  );
});
