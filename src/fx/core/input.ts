// Pointer input for the FX layer (P1.FX.10, tech.md §7.3). One passive listener set on the window
// records where a mouse (or pen) is, in normalized device coordinates of the viewport, and how far
// it moved since the last frame. It does no smoothing and knows nothing about the scene: the vortex
// mouse field (src/fx/vortex/mouse.ts) reads it once per frame.
//
// Touch is ignored on purpose: a finger has no hover, and dragging to scroll would sweep the field
// through the text the reader is following. The FX canvas has `pointer-events: none`, so the
// listeners sit on the window and see the pointer over any content.

/** Pointer types that move the field. Touch never does (see above). */
export const FIELD_POINTER_TYPES: ReadonlySet<string> = new Set(['mouse', 'pen']);

export interface PointerSnapshot {
  /** True while a mouse or pen is over the page. */
  readonly present: boolean;
  /** Position in normalized device coordinates (−1 … 1, +y up); last known while absent. */
  readonly ndcX: number;
  readonly ndcY: number;
}

export interface PointerInput extends PointerSnapshot {
  /** CSS px the pointer travelled since the previous call; resets the counter. */
  takeTravel: () => number;
  dispose: () => void;
}

export interface PointerInputDeps {
  /** The event target to listen on (the window). */
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  /** Viewport size in CSS px. */
  viewport: () => { width: number; height: number };
}

/** Client px → NDC. Pure, for tests. */
export function toNdc(
  clientX: number,
  clientY: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const width = Math.max(viewport.width, 1);
  const height = Math.max(viewport.height, 1);
  return { x: (clientX / width) * 2 - 1, y: 1 - (clientY / height) * 2 };
}

function browserDeps(): PointerInputDeps {
  return {
    target: window,
    viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
  };
}

export function createPointerInput(deps: PointerInputDeps = browserDeps()): PointerInput {
  const { target, viewport } = deps;
  let present = false;
  let ndcX = 0;
  let ndcY = 0;
  let lastX: number | null = null;
  let lastY: number | null = null;
  let travel = 0;

  const onMove = (event: PointerEvent): void => {
    if (!FIELD_POINTER_TYPES.has(event.pointerType)) {
      // A touch after a mouse (hybrid laptop): the mouse is no longer where the user looks.
      present = false;
      lastX = null;
      lastY = null;
      return;
    }
    const { clientX, clientY } = event;
    if (present && lastX !== null && lastY !== null) {
      travel += Math.hypot(clientX - lastX, clientY - lastY);
    }
    lastX = clientX;
    lastY = clientY;
    const ndc = toNdc(clientX, clientY, viewport());
    ndcX = ndc.x;
    ndcY = ndc.y;
    present = true;
  };

  const leave = (): void => {
    present = false;
    lastX = null;
    lastY = null;
  };

  // `relatedTarget === null` on pointerout from any element means the pointer left the window.
  const onOut = (event: PointerEvent): void => {
    if (event.relatedTarget === null) leave();
  };

  const options: AddEventListenerOptions = { passive: true };
  target.addEventListener('pointermove', onMove as EventListener, options);
  target.addEventListener('pointerdown', onMove as EventListener, options);
  target.addEventListener('pointerout', onOut as EventListener, options);
  target.addEventListener('blur', leave, options);

  return {
    get present() {
      return present;
    },
    get ndcX() {
      return ndcX;
    },
    get ndcY() {
      return ndcY;
    },
    takeTravel() {
      const value = travel;
      travel = 0;
      return value;
    },
    dispose() {
      target.removeEventListener('pointermove', onMove as EventListener);
      target.removeEventListener('pointerdown', onMove as EventListener);
      target.removeEventListener('pointerout', onOut as EventListener);
      target.removeEventListener('blur', leave);
      leave();
    },
  };
}
