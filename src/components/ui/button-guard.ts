// Keeps busy and disabled-but-focusable buttons inert (P1.DS.10). Native `disabled` would drop
// focus while a form sends, so a loading button uses aria-disabled instead, and that blocks
// nothing on its own. One capture listener on the document cancels clicks on such buttons; it also
// covers Enter/Space and implicit form submission, which the browser turns into a click.

import { INERT_BUTTON_SELECTOR } from './button';

const installed = new WeakSet<Document>();

export function onInertButtonClick(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(INERT_BUTTON_SELECTOR)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

/** Installs the guard once per document; view-transition swaps keep the same document. */
export function installButtonGuard(doc: Document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  doc.addEventListener('click', onInertButtonClick, { capture: true });
}
