import { describe, expect, it } from 'vitest';

import tokensCss from '@/styles/tokens.css?raw';

// Guards the order of the spacing and layer scales in tokens.css (P1.DS.05). A layer that
// sneaks out of order (e.g. modal below header) breaks stacking site-wide without any error.

function token(name: string): string {
  const value = new RegExp(`--${name}:\\s*([^;]+);`).exec(tokensCss)?.[1]?.trim();
  if (value === undefined) throw new Error(`--${name} is missing from tokens.css`);
  return value;
}

const REM = /^([\d.]+)rem$/;
const SPACE_STEPS = Array.from({ length: 11 }, (_, i) => `space-${i + 1}`);
const LAYERS_BOTTOM_TO_TOP = [
  'z-fx',
  'z-base',
  'z-header',
  'z-menu',
  'z-cursor',
  'z-modal',
  'z-toast',
  'z-skip-link',
];

describe('spacing scale', () => {
  it('is in rem and strictly increasing', () => {
    const values = SPACE_STEPS.map((name) => {
      const match = REM.exec(token(name));
      if (!match?.[1]) throw new Error(`--${name} must be a rem value`);
      return Number(match[1]);
    });
    values.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(values[i] ?? Infinity));
  });

  it('starts at 4 px', () => {
    expect(token('space-1')).toBe('0.25rem');
  });
});

describe('z-index scale', () => {
  it('stacks layers in the documented order', () => {
    const values = LAYERS_BOTTOM_TO_TOP.map((name) => Number.parseInt(token(name), 10));
    values.forEach((value) => expect(Number.isInteger(value)).toBe(true));
    values.slice(1).forEach((value, i) => expect(value).toBeGreaterThan(values[i] ?? Infinity));
  });

  it('keeps the skip link above everything, including the modal', () => {
    expect(Number(token('z-skip-link'))).toBeGreaterThan(Number(token('z-modal')));
  });
});
