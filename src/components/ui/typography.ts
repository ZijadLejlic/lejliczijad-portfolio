// Shared prop types and mappings for the typography components (P1.DS.09).

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Visual size of a heading, independent of its level (outline stays correct, look can vary). */
export type HeadingSize = 'display' | 'h1' | 'h2' | 'h3' | 'body';

/** Size a heading gets when none is given: the matching step of the type scale. */
export function defaultHeadingSize(level: HeadingLevel): HeadingSize {
  if (level === 1) return 'h1';
  if (level === 2) return 'h2';
  if (level === 3) return 'h3';
  return 'body';
}

export type TextSize = 'lead' | 'body' | 'small';

/**
 * Text color. `subtle` (4.93:1 on bg) must not sit on surface-2 or above the FX canvas
 * (docs/design/contrast.md); use `muted` there.
 */
export type TextTone = 'default' | 'muted' | 'subtle';
