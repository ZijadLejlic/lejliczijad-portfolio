// WCAG 2.x contrast math (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio). Pure, no DOM, so
// token tests and later FX checks (P1.FX.12) share one implementation.

export type Rgb = readonly [number, number, number];

const HEX_COLOR = /^#([0-9a-f]{6})$/i;
const SRGB_LINEAR_THRESHOLD = 0.040_45;
const SRGB_LINEAR_DIVISOR = 12.92;
const SRGB_GAMMA_OFFSET = 0.055;
const SRGB_GAMMA_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;
const CONTRAST_FLARE = 0.05;
const CHANNEL_MAX = 255;

export function parseHex(hex: string): Rgb {
  const match = HEX_COLOR.exec(hex.trim());
  if (!match?.[1]) throw new Error(`Expected a #rrggbb color, got "${hex}"`);
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toLinear(channel: number): number {
  const c = channel / CHANNEL_MAX;
  return c <= SRGB_LINEAR_THRESHOLD
    ? c / SRGB_LINEAR_DIVISOR
    : ((c + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_SCALE) ** SRGB_GAMMA;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  return LUMA_R * toLinear(r) + LUMA_G * toLinear(g) + LUMA_B * toLinear(b);
}

/** Composites a translucent foreground over an opaque background (alpha 0..1). */
export function composite(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  return [mix(fg[0], bg[0]), mix(fg[1], bg[1]), mix(fg[2], bg[2])];
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + CONTRAST_FLARE) / (lo + CONTRAST_FLARE);
}
