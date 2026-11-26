import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { findPlaceholders, formatReport, scanRoots } from '../../scripts/checks/content-guard';

const GUARD = join('scripts', 'checks', 'content-guard.ts');

describe('findPlaceholders', () => {
  it('finds TODO(content) with its position', () => {
    const findings = findPlaceholders('title: Avicena\nsummary: TODO(content): outcome', 'a.mdx');
    expect(findings).toEqual([
      {
        file: 'a.mdx',
        line: 2,
        column: 10,
        rule: 'TODO(content)',
        text: 'summary: TODO(content): outcome',
      },
    ]);
  });

  it('finds lorem in any case', () => {
    const rules = findPlaceholders('Lorem ipsum\nLOREM\nlorem', 'x.md').map((f) => f.rule);
    expect(rules).toEqual(['lorem', 'lorem', 'lorem']);
  });

  it('finds upper-case PLACEHOLDER', () => {
    expect(findPlaceholders('<p>PLACEHOLDER</p>', 'x.astro')).toHaveLength(1);
  });

  it('allows the placeholder attribute and identifiers that contain the words', () => {
    const source = [
      '<input placeholder="you@company.com" />',
      'facePlaceholder: true,',
      'const FACE_PLACEHOLDER_URL = "/x";',
      'loremaster and dolorem are fine',
      'TODO: refactor (not a content placeholder)',
    ].join('\n');
    expect(findPlaceholders(source, 'x.astro')).toEqual([]);
  });

  it('reports every hit on a line', () => {
    expect(findPlaceholders('TODO(content) and lorem and PLACEHOLDER', 'x.md')).toHaveLength(3);
  });
});

describe('scanRoots', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'content-guard-'));
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  function write(path: string, text: string): void {
    const full = join(cwd, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, text);
  }

  it('scans nested text files and skips binaries', () => {
    write('src/content/projects/avicena/index.mdx', '# Avicena\n\nTODO(content): results');
    write('src/assets/image.png', 'lorem');
    write('public/llms.txt', 'Lorem ipsum');

    const findings = scanRoots(['src', 'public'], cwd);
    expect(findings.map((f) => `${f.file}:${f.rule}`)).toEqual([
      `${join('src', 'content', 'projects', 'avicena', 'index.mdx')}:TODO(content)`,
      `${join('public', 'llms.txt')}:lorem`,
    ]);
  });

  it('ignores the dev-only /_dev pages', () => {
    write('src/pages/_dev/ui.astro', '<p>Lorem ipsum</p>');
    expect(scanRoots(['src'], cwd)).toEqual([]);
  });

  it('skips roots that do not exist', () => {
    expect(scanRoots(['missing'], cwd)).toEqual([]);
  });

  it('formats a report that names each file and line', () => {
    write('src/data/site.ts', "label: 'TODO(content): availability'");
    const report = formatReport(scanRoots(['src'], cwd));
    expect(report).toContain('1 placeholder(s) found');
    expect(report).toContain(`${join('src', 'data', 'site.ts')}:1:9  TODO(content)`);
  });
});

describe('content-guard CLI and build:prod', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'content-guard-cli-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function runGuard(root: string) {
    return spawnSync(process.execPath, [GUARD, root], { encoding: 'utf8' });
  }

  it('exits 1 and names the file when a placeholder is present', () => {
    writeFileSync(join(dir, 'page.mdx'), 'Intro\nPLACEHOLDER');
    const result = runGuard(dir);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('page.mdx:2:1  PLACEHOLDER');
  });

  it('exits 0 on clean content', () => {
    writeFileSync(join(dir, 'page.mdx'), 'Approved copy.');
    const result = runGuard(dir);
    expect(result.status).toBe(0);
  });

  it('runs before astro build in build:prod, so a hit stops the build', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['build:prod']).toBe(`node ${GUARD} && astro build`);
  });
});
