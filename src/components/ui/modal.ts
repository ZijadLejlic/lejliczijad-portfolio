// Shared types, attribute names and pure helpers for Modal (P1.DS.19). Svelte islands (Meet me,
// P1.HOME.03; forms later) cannot render an Astro component, so they render the same markup with
// these classes and src/styles/modal.css, and open it with openModal() from modal-controller.ts.

export type ModalSize = 'sm' | 'md' | 'lg';

/** On a trigger: the id of the dialog it opens. Clicks are delegated (modal-controller.ts). */
export const MODAL_OPEN_ATTR = 'data-modal-open';

/** On any element inside an open dialog: a click closes the dialog. */
export const MODAL_CLOSE_ATTR = 'data-modal-close';

/** On the dialog: a click on the backdrop closes it. Left out for forms, so a stray click does
 *  not throw away what someone typed. Esc always closes. */
export const MODAL_BACKDROP_CLOSE_ATTR = 'data-backdrop-close';

/** On an element inside the dialog: it gets focus when the dialog opens, instead of the first
 *  focusable element (the close button). Use it for the first field of a form. Same effect as
 *  `autofocus` in a dialog, without tripping the page-wide no-autofocus lint rule. */
export const MODAL_AUTOFOCUS_ATTR = 'data-modal-autofocus';

/** On <html> while at least one modal is open: locks page scroll (modal.css). */
export const SCROLL_LOCK_ATTR = 'data-scroll-lock';

/**
 * Elements that can take keyboard focus. Disabled, hidden and tabindex="-1" elements are
 * filtered out afterwards (modal-controller.ts), because a selector cannot see visibility.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Class list for the dialog element. */
export function modalClasses(size: ModalSize): string[] {
  return ['modal', `modal--${size}`];
}

/** ids of the title and the optional description, derived from the dialog id. */
export function modalIds(id: string): { title: string; description: string } {
  return { title: `${id}-title`, description: `${id}-description` };
}

/** Attributes for the button that opens a dialog; spread them into <Button>. */
export function modalTriggerAttributes(id: string): Record<string, string> {
  return { [MODAL_OPEN_ATTR]: id, 'aria-haspopup': 'dialog', 'aria-controls': id };
}

/**
 * Focus trap: where Tab (or Shift+Tab) should go from the element at `current` among `count`
 * tabbable elements of the dialog. Returns the index to focus when focus would leave the dialog,
 * or null when the browser's own Tab order already stays inside. `current` is -1 when focus is
 * on none of them (e.g. on the dialog itself).
 */
export function trapFocusIndex(current: number, count: number, backward: boolean): number | null {
  if (count === 0) return null;
  const last = count - 1;
  if (current < 0) return backward ? last : 0;
  if (backward && current === 0) return last;
  if (!backward && current === last) return 0;
  return null;
}

/**
 * Value for SCROLL_LOCK_ATTR. "gutter" keeps the space of a classic scrollbar reserved while
 * scrolling is off, so the page does not shift sideways; "plain" when there was no scrollbar
 * (overlay scrollbars, or a page shorter than the window), where a gutter would add a shift.
 */
export function scrollLockValue(scrollbarWidth: number): 'gutter' | 'plain' {
  return scrollbarWidth > 0 ? 'gutter' : 'plain';
}
