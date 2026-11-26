// The one render loop of the site (tech.md §7.1). Every effect (vortex simulation, face points,
// transitions, debug panel) registers a frame callback here instead of calling
// requestAnimationFrame itself, so the site never runs more than one rAF chain.
//
// The loop stops requesting frames entirely (no rAF pending, so no GPU work) whenever it has a
// reason to pause:
// - `hidden`: the tab is in the background (`visibilitychange`). Browsers throttle rAF in hidden
//   tabs, but throttled is not zero, and the "Gotovo kad" for P1.FX.06 is 0 % GPU.
// - `offscreen`: the canvas is not in the viewport or not rendered (`display: none`), seen by an
//   IntersectionObserver.
// - any reason the owner adds with `pause()`, e.g. `context` while the WebGL context is lost.
// It also idles while nothing is subscribed.
//
// Time: `delta` is clamped to MAX_DELTA_S so a long frame (GC pause, slow device, debugger) never
// turns into one huge simulation step. `time` only advances while the loop runs, so shaders driven
// by it continue where they stopped after a pause instead of jumping.

/** Longest step one frame may take, in seconds (= 20 FPS). Longer frames are slowed down, not skipped. */
export const MAX_DELTA_S = 0.05;

const MS_PER_S = 1000;

export interface FrameInfo {
  /** Seconds since the previous frame, clamped to [0, MAX_DELTA_S]. 0 on the first frame after a start or pause. */
  delta: number;
  /** Seconds the loop has been running, without paused periods. */
  time: number;
  /** Frames rendered since the loop was created. */
  frame: number;
}

export type FrameCallback = (info: FrameInfo) => void;

/** Built-in pause reasons; owners may use their own strings too. */
export type PauseReason = 'hidden' | 'offscreen' | 'context' | (string & {});

export interface SubscribeOptions {
  /** Lower runs first (simulation before drawing). Equal orders keep subscription order. */
  order?: number;
}

export interface LoopDeps {
  requestFrame: (callback: (timestamp: number) => void) => number;
  cancelFrame: (handle: number) => void;
  isHidden: () => boolean;
  /** Calls `onChange` when the page's visibility changes and returns a stop function. */
  watchVisibility: (onChange: () => void) => () => void;
  /** Reports whether `target` is on screen; returns a stop function. */
  observeOnScreen: (target: Element, onChange: (onScreen: boolean) => void) => () => void;
  /** Where a throwing frame callback is reported (it is removed, the others keep running). */
  reportError: (error: unknown) => void;
}

export interface RenderLoop {
  /** True while a frame is pending: no reason to pause and at least one subscriber. */
  readonly running: boolean;
  readonly disposed: boolean;
  readonly frame: number;
  readonly time: number;
  /** Active pause reasons, for the debug panel and tests. */
  readonly pauseReasons: ReadonlySet<PauseReason>;
  subscribe: (callback: FrameCallback, options?: SubscribeOptions) => () => void;
  pause: (reason: PauseReason) => void;
  resume: (reason: PauseReason) => void;
  dispose: () => void;
}

export interface CreateLoopOptions {
  /** The FX canvas; the loop pauses while it is off screen. Omit to skip that check. */
  canvas?: Element;
  deps?: LoopDeps;
}

/** Clamps a raw frame interval (ms) to the step the simulation may take (s). */
export function clampDelta(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(elapsedMs / MS_PER_S, MAX_DELTA_S);
}

function watchVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function observeOnScreen(target: Element, onChange: (onScreen: boolean) => void): () => void {
  // Without IntersectionObserver the canvas is assumed visible; the visibility pause still works.
  if (typeof IntersectionObserver === 'undefined') return () => undefined;
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry) onChange(entry.isIntersecting);
  });
  observer.observe(target);
  return () => observer.disconnect();
}

function reportError(error: unknown): void {
  // tech.md §7.6: FX errors reach the console in dev only; production keeps the effect silent.
  if (import.meta.env.DEV) console.error(error);
}

export const browserLoopDeps: LoopDeps = {
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => cancelAnimationFrame(handle),
  isHidden: () => document.visibilityState === 'hidden',
  watchVisibility,
  observeOnScreen,
  reportError,
};

interface Subscriber {
  callback: FrameCallback;
  order: number;
}

export function createLoop(options: CreateLoopOptions = {}): RenderLoop {
  const deps = options.deps ?? browserLoopDeps;
  const reasons = new Set<PauseReason>();
  let subscribers: Subscriber[] = [];
  let handle: number | null = null;
  /** Timestamp of the previous frame; null after a start or pause, so the next delta is 0. */
  let lastTimestamp: number | null = null;
  let frame = 0;
  let time = 0;
  let disposed = false;

  const shouldRun = (): boolean => !disposed && reasons.size === 0 && subscribers.length > 0;

  function tick(timestamp: number): void {
    handle = null;
    if (!shouldRun()) return;

    const delta = lastTimestamp === null ? 0 : clampDelta(timestamp - lastTimestamp);
    lastTimestamp = timestamp;
    time += delta;
    frame += 1;
    const info: FrameInfo = { delta, time, frame };

    // A snapshot: callbacks may (un)subscribe while the frame runs.
    for (const subscriber of [...subscribers]) {
      if (!subscribers.includes(subscriber)) continue;
      try {
        subscriber.callback(info);
      } catch (error) {
        // One broken effect must not stop the others, nor throw every frame.
        subscribers = subscribers.filter((item) => item !== subscriber);
        deps.reportError(error);
      }
    }

    sync();
  }

  /** Requests or cancels the next frame so that a frame is pending exactly when the loop should run. */
  function sync(): void {
    if (shouldRun()) {
      handle ??= deps.requestFrame(tick);
      return;
    }
    if (handle !== null) deps.cancelFrame(handle);
    handle = null;
    lastTimestamp = null;
  }

  function setReason(reason: PauseReason, active: boolean): void {
    if (active) reasons.add(reason);
    else reasons.delete(reason);
    sync();
  }

  const onVisibility = (): void => setReason('hidden', deps.isHidden());
  const stopVisibility = deps.watchVisibility(onVisibility);
  const stopOnScreen = options.canvas
    ? deps.observeOnScreen(options.canvas, (onScreen) => setReason('offscreen', !onScreen))
    : () => undefined;
  if (deps.isHidden()) reasons.add('hidden');

  return {
    get running() {
      return handle !== null;
    },
    get disposed() {
      return disposed;
    },
    get frame() {
      return frame;
    },
    get time() {
      return time;
    },
    get pauseReasons() {
      return new Set(reasons);
    },
    subscribe(callback, subscribeOptions = {}) {
      if (disposed) return () => undefined;
      const subscriber: Subscriber = { callback, order: subscribeOptions.order ?? 0 };
      // Insert after every subscriber with the same or a lower order (stable).
      const index = subscribers.findIndex((item) => item.order > subscriber.order);
      subscribers =
        index === -1
          ? [...subscribers, subscriber]
          : [...subscribers.slice(0, index), subscriber, ...subscribers.slice(index)];
      sync();
      return () => {
        subscribers = subscribers.filter((item) => item !== subscriber);
        sync();
      };
    },
    pause(reason) {
      setReason(reason, true);
    },
    resume(reason) {
      setReason(reason, false);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      subscribers = [];
      reasons.clear();
      stopVisibility();
      stopOnScreen();
      sync();
    },
  };
}

// --- Singleton -------------------------------------------------------------------------------------

let current: { loop: RenderLoop; canvas: Element | undefined } | null = null;

/**
 * Returns the site's loop, creating it on first call. Like the renderer it outlives navigation: a
 * second call with the same (persisted) canvas returns the same loop; another canvas replaces it.
 */
export function initLoop(options: CreateLoopOptions = {}): RenderLoop {
  if (current && !current.loop.disposed && current.canvas === options.canvas) return current.loop;
  current?.loop.dispose();
  const loop = createLoop(options);
  current = { loop, canvas: options.canvas };
  return loop;
}

/** The live loop, or `null` before `initLoop()` and after `disposeLoop()`. */
export function getLoop(): RenderLoop | null {
  return current?.loop ?? null;
}

export function disposeLoop(): void {
  current?.loop.dispose();
  current = null;
}
