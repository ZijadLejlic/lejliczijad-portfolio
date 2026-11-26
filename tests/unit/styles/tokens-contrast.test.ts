import { describe, expect, it } from 'vitest';

import { contrastRatio, parseHex } from '@/lib/contrast';
import tokensCss from '@/styles/tokens.css?raw';

// Every color pairing the design system allows (docs/design/contrast.md). Adding a token or a
// new pairing means adding a row here; changing a value that drops a pair below AA fails CI.
const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

type Pair = { fg: string; bg: string; min: number };

const SURFACES = ['bg', 'surface-1', 'surface-2'] as const;
const onSurfaces = (fg: string, min: number, surfaces: readonly string[] = SURFACES): Pair[] =>
  surfaces.map((bg) => ({ fg, bg, min }));

const PAIRS: Pair[] = [
  ...onSurfaces('text', AA_TEXT),
  ...onSurfaces('text-muted', AA_TEXT),
  // Not allowed on surface-2 (4.48:1).
  ...onSurfaces('text-subtle', AA_TEXT, ['bg', 'surface-1']),
  ...onSurfaces('accent', AA_TEXT),
  ...onSurfaces('accent-hover', AA_TEXT),
  ...onSurfaces('danger', AA_TEXT),
  // The availability dot is a graphic, not text.
  ...onSurfaces('success', AA_NON_TEXT),
  ...onSurfaces('focus', AA_NON_TEXT),
  { fg: 'on-accent', bg: 'accent', min: AA_TEXT },
  { fg: 'on-accent', bg: 'accent-hover', min: AA_TEXT },
  { fg: 'on-accent', bg: 'accent-pressed', min: AA_TEXT },
];

function readHexTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value);
  }
  return tokens;
}

const tokens = readHexTokens(tokensCss);

function color(name: string): ReturnType<typeof parseHex> {
  const value = tokens.get(name);
  if (!value) throw new Error(`--color-${name} is missing from tokens.css or is not a #rrggbb hex`);
  return parseHex(value);
}

describe('color tokens contrast (WCAG 2.2 AA)', () => {
  it.each(PAIRS)('--color-$fg on --color-$bg is at least $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(min);
  });
});
