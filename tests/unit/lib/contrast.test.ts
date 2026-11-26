import { describe, expect, it } from 'vitest';

import { composite, contrastRatio, parseHex, relativeLuminance } from '@/lib/contrast';

describe('contrast', () => {
  it('parses #rrggbb in any case', () => {
    expect(parseHex('#4D7cff')).toEqual([77, 124, 255]);
  });

  it('rejects other color formats', () => {
    expect(() => parseHex('#fff')).toThrow();
    expect(() => parseHex('rgb(0 0 0)')).toThrow();
  });

  it('gives the WCAG reference luminance for black and white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 10);
  });

  it('gives 21:1 for black on white, symmetric in argument order', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 10);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 10);
  });

  it('matches a known pair (#767676 on white is the classic 4.54:1)', () => {
    expect(contrastRatio(parseHex('#767676'), [255, 255, 255])).toBeCloseTo(4.54, 2);
  });

  it('composites alpha over a background', () => {
    expect(composite([255, 255, 255], 0.5, [0, 0, 0])).toEqual([128, 128, 128]);
    expect(composite([255, 255, 255], 0, [5, 5, 7])).toEqual([5, 5, 7]);
  });
});
