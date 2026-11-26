// Font fetch (P1.ENV.19, ADR-017): Clash Display and Satoshi are under the ITF FFL v2.0, which
// forbids redistributing the files through public repositories (docs/licenses.md). So they are not
// committed: this script downloads the official Fontshare ZIPs, extracts the exact WOFF2 files and
// checks each one against a pinned SHA-256 before writing it to src/assets/fonts/. The bytes stay
// identical to the ZIP (ADR-013: no modification). Runs on `pnpm install` (postinstall).
//
// Usage: node scripts/fonts/fetch.ts
// Exit codes: 0 = all fonts present and verified, 1 = download, extract or hash check failed.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface FontSource {
  file: string;
  family: 'clash-display' | 'satoshi';
  entry: string;
  sha256: string;
}

const DOWNLOAD_BASE = 'https://api.fontshare.com/v2/fonts/download/';
const DOWNLOAD_TIMEOUT_MS = 60_000;
// unzip writes one ~30 KB file to stdout; the default 1 MB buffer is plenty, this is headroom.
const MAX_ENTRY_BYTES = 4 * 1024 * 1024;

// Full hashes of the files verified on 2026-11-26 (docs/licenses.md lists the first 16 chars).
export const FONTS: readonly FontSource[] = [
  {
    file: 'ClashDisplay-Medium.woff2',
    family: 'clash-display',
    entry: 'ClashDisplay_Complete/Fonts/WEB/fonts/ClashDisplay-Medium.woff2',
    sha256: 'ef1dc0dbd18fcbf8986a8c19bffc40d162b89f6acc95a83d28597841ee4620da',
  },
  {
    file: 'ClashDisplay-Semibold.woff2',
    family: 'clash-display',
    entry: 'ClashDisplay_Complete/Fonts/WEB/fonts/ClashDisplay-Semibold.woff2',
    sha256: '5271b81f6d403a5accdcee2d3791edd3f7d81b9f71efe121fc399f446dc5b591',
  },
  {
    file: 'Satoshi-Regular.woff2',
    family: 'satoshi',
    entry: 'Satoshi_Complete/Fonts/WEB/fonts/Satoshi-Regular.woff2',
    sha256: '5aa97d938f523dd893c52473c3a021a0bf4ba0f95290edcc0749c088717f951f',
  },
  {
    file: 'Satoshi-Medium.woff2',
    family: 'satoshi',
    entry: 'Satoshi_Complete/Fonts/WEB/fonts/Satoshi-Medium.woff2',
    sha256: 'd492ce178ab9042bd6bcad1b9ef49b1436ba5f4f833dee4a7a2ed94e9d8c922e',
  },
];

export function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Fonts that are missing on disk or whose bytes do not match the pinned hash. */
export function missingFonts(dir: string, fonts: readonly FontSource[] = FONTS): FontSource[] {
  return fonts.filter((font) => {
    const path = join(dir, font.file);
    return !existsSync(path) || sha256(readFileSync(path)) !== font.sha256;
  });
}

/** Throws if `data` is not the exact file the font entry pins. */
export function verifyFont(font: FontSource, data: Uint8Array): void {
  const actual = sha256(data);
  if (actual !== font.sha256) {
    throw new Error(
      `${font.file}: SHA-256 mismatch (expected ${font.sha256}, got ${actual}). ` +
        'Fontshare may have published a new version; check the license and update docs/licenses.md ' +
        'and the hash in scripts/fonts/fetch.ts together.',
    );
  }
}

async function download(url: string, target: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`GET ${url} failed with HTTP ${response.status}`);
  writeFileSync(target, new Uint8Array(await response.arrayBuffer()));
}

export async function fetchFonts(dir: string): Promise<string[]> {
  const todo = missingFonts(dir);
  if (todo.length === 0) return [];

  mkdirSync(dir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'fonts-'));
  try {
    const zips = new Map<FontSource['family'], string>();
    for (const font of todo) {
      let zip = zips.get(font.family);
      if (!zip) {
        zip = join(tmp, `${font.family}.zip`);
        await download(`${DOWNLOAD_BASE}${font.family}`, zip);
        zips.set(font.family, zip);
      }
      // System unzip (present on macOS and the Ubuntu runners) avoids a new dependency.
      const data = execFileSync('unzip', ['-p', zip, font.entry], { maxBuffer: MAX_ENTRY_BYTES });
      verifyFont(font, data);
      writeFileSync(join(dir, font.file), data);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return todo.map((font) => font.file);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = resolve(fileURLToPath(new URL('../../src/assets/fonts', import.meta.url)));
  try {
    const written = await fetchFonts(dir);
    console.log(
      written.length === 0
        ? 'fonts: all ITF fonts present and verified.'
        : `fonts: downloaded and verified ${written.join(', ')}.`,
    );
  } catch (error) {
    console.error(`fonts: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
