// Shared prop types and class mapping for Button (P1.DS.10). Svelte islands (forms, P1.CONT.03)
// cannot render an Astro component, so they reuse these classes with src/styles/button.css.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonClassOptions {
  variant: ButtonVariant;
  size: ButtonSize;
  block?: boolean;
}

/** Class list for a button or button-styled link. */
export function buttonClasses({ variant, size, block = false }: ButtonClassOptions): string[] {
  const classes = ['button', `button--${variant}`, `button--${size}`];
  if (block) classes.push('button--block');
  return classes;
}

/**
 * `rel` for a button-styled link. A link that opens a new tab always gets `noopener noreferrer`
 * (AGENTS.md §11), whatever else the caller passes.
 */
export function linkRel(target: string | undefined, rel: string | undefined): string | undefined {
  if (target !== '_blank') return rel;
  const tokens = new Set((rel ?? '').split(/\s+/).filter(Boolean));
  tokens.add('noopener');
  tokens.add('noreferrer');
  return [...tokens].join(' ');
}

/** Selector for a control that looks busy or disabled but keeps focus (see button-guard.ts). */
export const INERT_BUTTON_SELECTOR = '.button[aria-disabled="true"]';
