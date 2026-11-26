// The one WebGL renderer of the site (tech.md §7.1). It lives on the persistent FX canvas, so it is
// created once and survives page navigation; everything that draws (vortex, face, transitions)
// asks for it instead of creating its own context.
//
// What it owns: the three.js WebGLRenderer, the pixel ratio cap per quality tier (tech.md §7.2),
// canvas resizing (ResizeObserver + screen changes) and the WebGL context lifecycle. What it does
// not own: the render loop (P1.FX.06) and the GPU resources of the effects. On `restored` the
// owners rebuild whatever lived only on the GPU (render targets, simulation state); three.js itself
// re-uploads geometries, materials and textures on the next render.
//
// Context policy (tech.md §7.6): a lost context gets one restore. A second loss, or a restore that
// never arrives, ends in `failed`, and the page falls back to the static poster for good.

import { WebGLRenderer } from 'three';

import type { Quality } from './capabilities';

/** Tiers that actually render. `static` never creates a renderer. */
export type RenderQuality = Exclude<Quality, 'static'>;

/** Device pixel ratio cap per tier (tech.md §7.2): fill rate is the first thing a weak GPU runs out of. */
export const PIXEL_RATIO_CAP: Readonly<Record<RenderQuality, number>> = {
  high: 2,
  medium: 1.5,
  low: 1,
};

/** How many times a lost context may come back before the FX gives up (tech.md §7.6: "1×"). */
export const MAX_CONTEXT_RESTORES = 1;

/**
 * How long to wait for `webglcontextrestored`. Browsers do not promise a restore (a crashed GPU
 * process may stay down). The poster is already back on `lost`, so this deadline only decides when
 * to stop waiting and free the renderer; it can be generous.
 */
export const CONTEXT_RESTORE_TIMEOUT_MS = 30_000;

export function cappedPixelRatio(devicePixelRatio: number, quality: RenderQuality): number {
  // Zoomed-out pages report ratios below 1; a broken value should never produce an empty buffer.
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(ratio, PIXEL_RATIO_CAP[quality]);
}

// --- Context state machine (pure, unit-tested) ---------------------------------------------------

export type RendererStatus = 'ready' | 'lost' | 'failed' | 'disposed';

export type ContextEvent = 'lost' | 'restored' | 'restore-timeout';

export interface ContextState {
  status: RendererStatus;
  restores: number;
}

/** The next state after a context event. Terminal states (`failed`, `disposed`) never change. */
export function nextContextState(state: ContextState, event: ContextEvent): ContextState {
  if (state.status === 'failed' || state.status === 'disposed') return state;

  switch (event) {
    case 'lost':
      if (state.status === 'lost') return state;
      return state.restores >= MAX_CONTEXT_RESTORES
        ? { ...state, status: 'failed' }
        : { ...state, status: 'lost' };
    case 'restored':
      // A restore we did not wait for (already ready) changes nothing.
      return state.status === 'lost' ? { status: 'ready', restores: state.restores + 1 } : state;
    case 'restore-timeout':
      return state.status === 'lost' ? { ...state, status: 'failed' } : state;
  }
}

// --- Renderer --------------------------------------------------------------------------------------

export interface RendererSize {
  /** CSS pixels. */
  width: number;
  height: number;
  pixelRatio: number;
}

export interface RendererEventMap {
  resize: RendererSize;
  /** The context is gone; stop drawing until `restored`. */
  lost: undefined;
  /** The context is back; rebuild GPU-only resources (render targets, simulation state). */
  restored: undefined;
  /** No context and none coming back: show the static poster and dispose. */
  failed: undefined;
}

type Listener<T> = (payload: T) => void;

/** The parts of three's WebGLRenderer this module drives, so tests can pass a fake. */
export type WebGLRendererLike = Pick<WebGLRenderer, 'setPixelRatio' | 'setSize' | 'dispose'>;

export interface RendererDeps<R extends WebGLRendererLike = WebGLRenderer> {
  createRenderer: (canvas: HTMLCanvasElement) => R;
  devicePixelRatio: () => number;
  /** Observes the canvas' CSS size and returns a stop function. */
  observeSize: (
    canvas: HTMLCanvasElement,
    onSize: (width: number, height: number) => void,
  ) => () => void;
  /** Calls `onChange` when the device pixel ratio changes (window moved to another screen, zoom). */
  watchPixelRatio: (onChange: () => void) => () => void;
}

export interface FxRenderer<R extends WebGLRendererLike = WebGLRenderer> {
  readonly canvas: HTMLCanvasElement;
  /** The three.js renderer. Do not call `dispose()` on it; use `FxRenderer.dispose()`. */
  readonly three: R;
  readonly status: RendererStatus;
  readonly quality: RenderQuality;
  readonly size: RendererSize;
  readonly restores: number;
  /** Applies a new tier's pixel ratio cap (adaptive quality, P1.FX.07). */
  setQuality: (quality: RenderQuality) => void;
  on: <K extends keyof RendererEventMap>(
    type: K,
    listener: Listener<RendererEventMap[K]>,
  ) => () => void;
  dispose: () => void;
}

export interface CreateRendererOptions<R extends WebGLRendererLike = WebGLRenderer> {
  canvas: HTMLCanvasElement;
  quality: RenderQuality;
  deps?: RendererDeps<R>;
}

/**
 * WebGLRenderer settings shared by every effect. Points with additive blending gain nothing from
 * MSAA, and a stencil buffer is never used. `failIfMajorPerformanceCaveat` matches the capability
 * probe: a software rasterizer gets the poster, not a 2 FPS vortex.
 */
function createThreeRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  return new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    stencil: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: true,
  });
}

function observeSize(
  canvas: HTMLCanvasElement,
  onSize: (width: number, height: number) => void,
): () => void {
  if (typeof ResizeObserver === 'undefined') {
    const onResize = (): void => onSize(canvas.clientWidth, canvas.clientHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }
  const observer = new ResizeObserver((entries) => {
    const box = entries[entries.length - 1]?.contentRect;
    if (box) onSize(box.width, box.height);
  });
  observer.observe(canvas);
  return () => observer.disconnect();
}

function watchPixelRatio(onChange: () => void): () => void {
  // A resolution media query only matches the current ratio, so it is re-armed after every change.
  let query: MediaQueryList | null = null;
  const arm = (): void => {
    query = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    query.addEventListener('change', onQueryChange, { once: true });
  };
  const onQueryChange = (): void => {
    onChange();
    arm();
  };
  arm();
  return () => query?.removeEventListener('change', onQueryChange);
}

export const browserRendererDeps: RendererDeps = {
  createRenderer: createThreeRenderer,
  devicePixelRatio: () => window.devicePixelRatio,
  observeSize,
  watchPixelRatio,
};

/**
 * Creates a renderer on `canvas`. Prefer `initRenderer()`, which keeps a single instance.
 * Throws when no WebGL2 context can be created; the caller keeps the poster.
 */
export function createRenderer<R extends WebGLRendererLike = WebGLRenderer>(
  options: CreateRendererOptions<R>,
): FxRenderer<R> {
  const { canvas } = options;
  const deps = (options.deps ?? browserRendererDeps) as RendererDeps<R>;
  const three = deps.createRenderer(canvas);

  let quality = options.quality;
  let state: ContextState = { status: 'ready', restores: 0 };
  let size: RendererSize = { width: 0, height: 0, pixelRatio: 1 };
  let restoreTimer: ReturnType<typeof setTimeout> | undefined;
  const listeners: { [K in keyof RendererEventMap]: Set<Listener<RendererEventMap[K]>> } = {
    resize: new Set(),
    lost: new Set(),
    restored: new Set(),
    failed: new Set(),
  };

  function emit<K extends keyof RendererEventMap>(type: K, payload: RendererEventMap[K]): void {
    for (const listener of [...listeners[type]]) listener(payload);
  }

  /** Pushes size and pixel ratio to three. Zero sizes (hidden canvas) keep the last real size. */
  function apply(width: number, height: number, force = false): void {
    if (width <= 0 || height <= 0) return;
    const pixelRatio = cappedPixelRatio(deps.devicePixelRatio(), quality);
    const changed =
      width !== size.width || height !== size.height || pixelRatio !== size.pixelRatio;
    if (!changed && !force) return;

    size = { width, height, pixelRatio };
    three.setPixelRatio(pixelRatio);
    // `false`: CSS owns the canvas' layout size; three only sets the drawing buffer.
    three.setSize(width, height, false);
    if (changed) emit('resize', size);
  }

  function transition(event: ContextEvent): void {
    const previous = state.status;
    state = nextContextState(state, event);
    if (state.status === previous) return;

    clearTimeout(restoreTimer);
    restoreTimer = undefined;

    if (state.status === 'lost') {
      restoreTimer = setTimeout(() => transition('restore-timeout'), CONTEXT_RESTORE_TIMEOUT_MS);
      emit('lost', undefined);
    } else if (state.status === 'ready') {
      // three re-initialized its GL state in its own restore handler, which runs first because it
      // was registered in the WebGLRenderer constructor. Re-apply the drawing buffer on top.
      apply(size.width, size.height, true);
      emit('restored', undefined);
    } else if (state.status === 'failed') {
      stopObserving();
      emit('failed', undefined);
    }
  }

  // three's own handlers call preventDefault() on loss, which is what lets the browser restore.
  const onLost = (): void => transition('lost');
  const onRestored = (): void => transition('restored');
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const stopSize = deps.observeSize(canvas, (width, height) => apply(width, height));
  const stopPixelRatio = deps.watchPixelRatio(() => apply(size.width, size.height));
  function stopObserving(): void {
    stopSize();
    stopPixelRatio();
  }

  apply(canvas.clientWidth, canvas.clientHeight);

  return {
    canvas,
    three,
    get status() {
      return state.status;
    },
    get quality() {
      return quality;
    },
    get size() {
      return size;
    },
    get restores() {
      return state.restores;
    },
    setQuality(next) {
      if (next === quality) return;
      quality = next;
      apply(size.width, size.height);
    },
    on(type, listener) {
      listeners[type].add(listener);
      return () => listeners[type].delete(listener);
    },
    dispose() {
      if (state.status === 'disposed') return;
      state = { ...state, status: 'disposed' };
      clearTimeout(restoreTimer);
      stopObserving();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      for (const set of Object.values(listeners)) set.clear();
      // No forceContextLoss(): the canvas persists across pages, and a canvas whose context was
      // lost on purpose can never get a working one again.
      three.dispose();
    },
  };
}

// --- Singleton -------------------------------------------------------------------------------------

let current: FxRenderer<WebGLRendererLike> | null = null;

/**
 * Returns the site's renderer, creating it on first call. A second call with the same canvas (the
 * canvas is persisted across navigation) returns the same instance with the new tier applied; a
 * different canvas replaces the old renderer.
 */
export function initRenderer<R extends WebGLRendererLike = WebGLRenderer>(
  options: CreateRendererOptions<R>,
): FxRenderer<R> {
  if (current && current.status !== 'disposed' && current.canvas === options.canvas) {
    current.setQuality(options.quality);
    return current as FxRenderer<R>;
  }
  current?.dispose();
  current = null;
  const renderer = createRenderer(options);
  current = renderer;
  return renderer;
}

/** The live renderer, or `null` before `initRenderer()` and after `disposeRenderer()`. */
export function getRenderer(): FxRenderer<WebGLRendererLike> | null {
  return current && current.status !== 'disposed' ? current : null;
}

export function disposeRenderer(): void {
  current?.dispose();
  current = null;
}
