// Behavior of Modal (P1.DS.19) on top of the native <dialog>. showModal() already puts the dialog
// in the top layer, makes the rest of the page inert and closes on Esc (the `cancel` event). This
// controller adds what the platform leaves out or does differently per browser:
// - a strict focus trap (Tab never reaches the browser UI from the last element),
// - focus back on the opener after closing, whichever way it closed,
// - page scroll lock without a sideways shift,
// - optional close on backdrop click and on [data-modal-close] elements.
//
// Every close path (Esc, close button, backdrop, closeModal(), navigation) ends in teardown(),
// which is synchronous and idempotent, so nothing waits on the async `close` event.

import {
  FOCUSABLE_SELECTOR,
  MODAL_AUTOFOCUS_ATTR,
  MODAL_BACKDROP_CLOSE_ATTR,
  MODAL_CLOSE_ATTR,
  MODAL_OPEN_ATTR,
  SCROLL_LOCK_ATTR,
  scrollLockValue,
  trapFocusIndex,
} from './modal';

const teardowns = new WeakMap<HTMLDialogElement, () => void>();
const lockCounts = new WeakMap<Document, number>();
const openDialogs = new Set<HTMLDialogElement>();
const installed = new WeakSet<Document>();

function lockScroll(doc: Document): void {
  const count = lockCounts.get(doc) ?? 0;
  if (count === 0) {
    const root = doc.documentElement;
    const scrollbarWidth = (doc.defaultView?.innerWidth ?? 0) - root.clientWidth;
    root.setAttribute(SCROLL_LOCK_ATTR, scrollLockValue(scrollbarWidth));
  }
  lockCounts.set(doc, count + 1);
}

function unlockScroll(doc: Document): void {
  const count = (lockCounts.get(doc) ?? 0) - 1;
  if (count <= 0) {
    lockCounts.delete(doc);
    doc.documentElement.removeAttribute(SCROLL_LOCK_ATTR);
  } else {
    lockCounts.set(doc, count);
  }
}

function tabbables(dialog: HTMLDialogElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(':disabled') &&
      !element.closest('[inert]') &&
      element.getClientRects().length > 0,
  );
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey) return;
  const dialog = event.currentTarget;
  if (!(dialog instanceof HTMLDialogElement)) return;
  const items = tabbables(dialog);
  const active = dialog.ownerDocument.activeElement;
  const current = active instanceof HTMLElement ? items.indexOf(active) : -1;
  const next = trapFocusIndex(current, items.length, event.shiftKey);
  if (next === null) return;
  event.preventDefault();
  items[next]?.focus();
}

/** Opens `dialog` as a modal. `opener` gets focus back on close (default: the focused element). */
export function openModal(dialog: HTMLDialogElement, opener?: Element | null): void {
  if (dialog.open || !dialog.isConnected) return;
  const doc = dialog.ownerDocument;
  const returnTo = opener ?? doc.activeElement;

  // A press that starts inside the panel and ends on the backdrop (selecting text) is not a
  // backdrop click, so both ends have to be on the dialog element itself. The panel fills the
  // dialog, so only the ::backdrop reports the dialog as the target.
  let pressedOnBackdrop = false;
  const onPointerdown = (event: PointerEvent): void => {
    pressedOnBackdrop = event.target === dialog;
  };
  const onClick = (event: MouseEvent): void => {
    const target = event.target;
    if (target === dialog) {
      if (pressedOnBackdrop && dialog.hasAttribute(MODAL_BACKDROP_CLOSE_ATTR)) closeModal(dialog);
    } else if (target instanceof Element && target.closest(`[${MODAL_CLOSE_ATTR}]`)) {
      closeModal(dialog);
    }
    pressedOnBackdrop = false;
  };
  const onClose = (): void => {
    // The `close` event is queued, so the one from a previous close can arrive after a quick
    // reopen. It must not tear down the dialog that is open again.
    if (dialog.open) return;
    teardown(dialog);
  };

  dialog.addEventListener('keydown', onKeydown);
  dialog.addEventListener('pointerdown', onPointerdown);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('close', onClose);

  teardowns.set(dialog, () => {
    dialog.removeEventListener('keydown', onKeydown);
    dialog.removeEventListener('pointerdown', onPointerdown);
    dialog.removeEventListener('click', onClick);
    dialog.removeEventListener('close', onClose);
    unlockScroll(doc);
    openDialogs.delete(dialog);
    if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus();
  });

  lockScroll(doc);
  openDialogs.add(dialog);
  // Focuses the [autofocus] element, or else the first focusable one (the close button).
  dialog.showModal();
  dialog.querySelector<HTMLElement>(`[${MODAL_AUTOFOCUS_ATTR}]`)?.focus();
}

function teardown(dialog: HTMLDialogElement): void {
  const run = teardowns.get(dialog);
  if (!run) return;
  teardowns.delete(dialog);
  run();
}

/** Closes `dialog` and runs the cleanup right away (focus back, scroll unlocked). */
export function closeModal(dialog: HTMLDialogElement): void {
  if (dialog.open) dialog.close();
  teardown(dialog);
}

/** Closes every open modal, e.g. before Astro swaps the page (P1.LAY.07). */
export function closeAllModals(): void {
  for (const dialog of [...openDialogs]) closeModal(dialog);
}

function onTriggerClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const trigger = target.closest(`[${MODAL_OPEN_ATTR}]`);
  if (!trigger) return;
  const id = trigger.getAttribute(MODAL_OPEN_ATTR);
  const dialog = id ? trigger.ownerDocument.getElementById(id) : null;
  if (!(dialog instanceof HTMLDialogElement)) return;
  event.preventDefault();
  openModal(dialog, trigger);
}

/**
 * Wires every [data-modal-open] trigger with one delegated listener, once per document. A view
 * transition swap keeps the document, so triggers on the next page work without re-init; open
 * modals are closed before the swap so the scroll lock cannot outlive its page.
 */
export function installModalTriggers(doc: Document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  doc.addEventListener('click', onTriggerClick);
  doc.addEventListener('astro:before-swap', closeAllModals);
}
