import { describe, expect, it } from 'vitest';

import tokensCss from '@/styles/tokens.css?raw';

// Guards the fluid type scale in tokens.css (P1.DS.04). Font metrics are not available in Node,
// so the "longest word fits at 320 px" check lives in docs/design/typography.md; this test keeps
// the math sane: clamps are well-formed, the hierarchy holds at every width, body stays >= 16 px.

const ROOT_PX = 16;
const MIN_VIEWPORT = 320;
const MAX_VIEWPORT = 2560;
const SAMPLE_VIEWPORTS = [MIN_VIEWPORT, 375, 768, 1024, 1280, 1920, MAX_VIEWPORT];
const MIN_BODY_PX = 16;
const HIERARCHY = ['display', 'h1', 'h2', 'h3', 'lead', 'body'] as const;

type Clamp = { min: number; rem: number; vw: number; max: number };

const CLAMP = /^clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)$/;

function readFluidSize(name: string): Clamp {
  const declaration = new RegExp(`--text-${name}:\\s*([^;]+);`).exec(tokensCss);
  const match = declaration?.[1] ? CLAMP.exec(declaration[1].trim()) : null;
  if (!match) throw new Error(`--text-${name} must be clamp(<rem>, <rem> + <vw>, <rem>)`);
  const [min, rem, vw, max] = match.slice(1).map(Number) as [number, number, number, number];
  return { min, rem, vw, max };
}

const fluidPx = ({ rem, vw }: Clamp, viewport: number) => rem * ROOT_PX + (vw * viewport) / 100;
const resolvedPx = (c: Clamp, viewport: number) =>
  Math.min(c.max * ROOT_PX, Math.max(c.min * ROOT_PX, fluidPx(c, viewport)));

const sizes = Object.fromEntries(HIERARCHY.map((name) => [name, readFluidSize(name)])) as Record<
  (typeof HIERARCHY)[number],
  Clamp
>;

describe('fluid type scale', () => {
  it.each(HIERARCHY)('--text-%s has min < max and reaches max by 2560 px', (name) => {
    const c = sizes[name];
    expect(c.min).toBeLessThan(c.max);
    expect(fluidPx(c, MAX_VIEWPORT)).toBeGreaterThanOrEqual(c.max * ROOT_PX);
  });

  it('keeps body text at 16 px or more at every width', () => {
    for (const viewport of SAMPLE_VIEWPORTS) {
      expect(resolvedPx(sizes.body, viewport)).toBeGreaterThanOrEqual(MIN_BODY_PX);
    }
  });

  // display and h1 are both 40 px on the smallest phones (approved trade-off so long words fit),
  // so that one step may be equal; every other step must be strictly larger.
  it.each(SAMPLE_VIEWPORTS)('keeps display >= h1 > h2 > h3 > lead > body at %i px', (viewport) => {
    const px = HIERARCHY.map((name) => resolvedPx(sizes[name], viewport));
    const [display = 0, h1 = 0, ...rest] = px;
    expect(display).toBeGreaterThanOrEqual(h1);
    [h1, ...rest].forEach((value, i, steps) => {
      if (i > 0) expect(steps[i - 1]).toBeGreaterThan(value);
    });
  });

  it('makes display larger than h1 from tablet width up', () => {
    for (const viewport of SAMPLE_VIEWPORTS.filter((v) => v >= 768)) {
      expect(resolvedPx(sizes.display, viewport)).toBeGreaterThan(resolvedPx(sizes.h1, viewport));
    }
  });
});
