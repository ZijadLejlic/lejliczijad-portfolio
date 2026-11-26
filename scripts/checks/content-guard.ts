// Content guard (P1.ENV.18, AGENTS.md §7): the production build fails if anything that ships still
// carries a placeholder. Runs before `astro build` in `pnpm build:prod`; preview and dev builds skip
// it on purpose, so content-pending work can still be reviewed on a preview deploy.
//
// Usage: node scripts/checks/content-guard.ts [dir ...]   (default: src public)
// Exit codes: 0 = clean, 1 = placeholders found.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Rule {
  name: string;
  pattern: RegExp;
}

export interface Finding {
  file: string;
  line: number;
  column: number;
  rule: string;
  text: string;
}

// `lorem` is case-insensitive (Lorem ipsum). PLACEHOLDER is upper case only, so the HTML
// `placeholder` attribute and identifiers such as `facePlaceholder` stay allowed.
const RULES: readonly Rule[] = [
  { name: 'TODO(content)', pattern: /TODO\(content\)/g },
  { name: 'lorem', pattern: /\blorem\b/gi },
  { name: 'PLACEHOLDER', pattern: /\bPLACEHOLDER\b/g },
];

const DEFAULT_ROOTS = ['src', 'public'];

// Text formats that end up in the site. Images, fonts and other binaries are skipped.
const TEXT_EXTENSIONS = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mdx',
  '.svelte',
  '.svg',
  '.ts',
  '.txt',
  '.webmanifest',
  '.xml',
  '.yaml',
  '.yml',
]);

// `/_dev` is never part of the production build (P1.DS.26), so demo copy there is fine.
const IGNORED_DIRS = [join('src', 'pages', '_dev')];

const MAX_SNIPPET = 120;

export function findPlaceholders(source: string, file: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((lineText, index) => {
    for (const rule of RULES) {
      for (const match of lineText.matchAll(rule.pattern)) {
        findings.push({
          file,
          line: index + 1,
          column: match.index + 1,
          rule: rule.name,
          text: lineText.trim().slice(0, MAX_SNIPPET),
        });
      }
    }
  });
  return findings;
}

function isIgnored(dir: string, cwd: string): boolean {
  const rel = relative(cwd, dir);
  return IGNORED_DIRS.some((ignored) => rel === ignored || rel.startsWith(ignored + sep));
}

function listTextFiles(dir: string, cwd: string): string[] {
  if (isIgnored(dir, cwd)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTextFiles(path, cwd));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(path);
    }
  }
  return files;
}

export function scanRoots(roots: readonly string[], cwd: string): Finding[] {
  const findings: Finding[] = [];
  for (const root of roots) {
    const absRoot = resolve(cwd, root);
    if (!existsSync(absRoot)) continue;
    for (const file of listTextFiles(absRoot, cwd).sort()) {
      findings.push(...findPlaceholders(readFileSync(file, 'utf8'), relative(cwd, file)));
    }
  }
  return findings;
}

export function formatReport(findings: readonly Finding[]): string {
  const lines = findings.map((f) => `  ${f.file}:${f.line}:${f.column}  ${f.rule}  ${f.text}`);
  return [
    `content-guard: ${findings.length} placeholder(s) found. The production build is blocked.`,
    ...lines,
    'Replace each placeholder with approved content (AGENTS.md §7) before a production build.',
  ].join('\n');
}

function main(argv: readonly string[]): number {
  const roots = argv.length > 0 ? argv : DEFAULT_ROOTS;
  const findings = scanRoots(roots, process.cwd());
  if (findings.length > 0) {
    console.error(formatReport(findings));
    return 1;
  }
  console.log(`content-guard: no placeholders in ${roots.join(', ')}.`);
  return 0;
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
