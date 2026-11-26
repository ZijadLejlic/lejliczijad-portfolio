import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type FontSource, missingFonts, sha256, verifyFont } from '../../scripts/fonts/fetch';

const BYTES = new TextEncoder().encode('font bytes');
const FONT: FontSource = {
  file: 'Test-Regular.woff2',
  family: 'satoshi',
  entry: 'Test/Test-Regular.woff2',
  sha256: sha256(BYTES),
};

describe('verifyFont', () => {
  it('accepts the exact pinned bytes', () => {
    expect(() => verifyFont(FONT, BYTES)).not.toThrow();
  });

  it('rejects changed bytes and names the file', () => {
    const changed = new TextEncoder().encode('font bytez');
    expect(() => verifyFont(FONT, changed)).toThrow(/Test-Regular\.woff2: SHA-256 mismatch/);
  });
});

describe('missingFonts', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fonts-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists a font that is not on disk', () => {
    expect(missingFonts(dir, [FONT])).toEqual([FONT]);
  });

  it('skips a font whose bytes match', () => {
    writeFileSync(join(dir, FONT.file), BYTES);
    expect(missingFonts(dir, [FONT])).toEqual([]);
  });

  it('lists a font whose bytes do not match, so it is downloaded again', () => {
    writeFileSync(join(dir, FONT.file), 'corrupt');
    expect(missingFonts(dir, [FONT])).toEqual([FONT]);
  });
});
