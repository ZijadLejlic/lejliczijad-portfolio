// Scroll reaction of the vortex (P1.FX.11, tech.md §7.3). Scroll speed becomes `uScrollVel`
// (0 at rest, towards 1 on a fast scroll), which the position pass turns into a faster swirl and a
// faster time scale. Direction does not matter: scrolling up or down both stir the dust.
//
// Why it does not jerk:
// - The scroll position is read once per frame (`window.scrollY`, no layout), not per event, so a
//   burst of wheel events and a smooth trackpad scroll give the same kind of signal.
// - The raw speed is smoothed with separate rise and fall times (fast in, slow out), then soft
//   saturated (tanh), so a violent fling tops out instead of spinning the disk without limit, and
//   the value may only change so fast per second (MAX_RISE_RATE, MAX_FALL_RATE).
// - A frame that moves faster than JUMP_SPEED is a jump, not a scroll (anchor link, Home/End
//   without smooth scrolling, the scroll reset of a page swap). It is ignored: the baseline moves,
//   the value does not.
// - The first frame after a start or a pause (delta 0) and a page swap (`reset()`) only take a new
//   baseline.
// - Only the rate of rotation changes, never a position, so even a fast change of the value turns
//   the particles a little faster rather than moving them.
//
// The tracker is pure (tests feed it positions); `attachScrollReaction()` connects it to the loop,
// the window and Astro's page swaps, and writes the simulation input.

import type { FrameInfo, RenderLoop } from '../core/loop';

export const SCROLL = {
  /** Smoothed speed (viewport heights per second) that gives tanh(1) ≈ 0.76. */
  FULL_SPEED: 4,
  /** Time constants (s) of the smoothed speed: rising while scrolling, falling once it stops. */
  RISE: 0.12,
  FALL: 0.6,
  /** Most the value may rise / fall per second, so even the hardest fling eases in (≥ 0.25 s). */
  MAX_RISE_RATE: 4,
  MAX_FALL_RATE: 2,
  /** Faster than this (viewport heights per second) a frame is a jump and is ignored. */
  JUMP_SPEED: 25,
  /** Below this the value is set to exactly 0, so a resting page writes a stable uniform. */
  REST: 1e-4,
} as const;

/**
 * How much the position pass speeds up at uScrollVel = 1 (also GLSL defines through VORTEX):
 * time scale × (1 + SCROLL_SPEED_BOOST · v), swirl × (1 + SCROLL_SWIRL_BOOST · v).
 */
export const SCROLL_SPEED_BOOST = 0.5;
export const SCROLL_SWIRL_BOOST = 1;

/** Loop order: after the FX state tween (−200), before the simulation step (−100). */
export const SCROLL_REACTION_ORDER = -150;

/** Rotation rate relative to rest for a given uScrollVel; same formula as vortex-position.glsl. */
export function scrollRotationFactor(scrollVel: number): number {
  return (1 + SCROLL_SPEED_BOOST * scrollVel) * (1 + SCROLL_SWIRL_BOOST * scrollVel);
}

export interface ScrollSample {
  /** Scroll position in px (`window.scrollY`). */
  y: number;
  /** Viewport height in px; speeds are measured in viewport heights so every screen feels alike. */
  viewport: number;
  /** Seconds since the previous frame (the loop's clamped delta); 0 takes a new baseline only. */
  delta: number;
}

export interface ScrollTracker {
  /** Current uScrollVel in [0, 1). */
  readonly value: number;
  /** Smoothed scroll speed in viewport heights per second, for the debug panel. */
  readonly speed: number;
  /** Feeds one frame and returns the new value. */
  update: (sample: ScrollSample) => number;
  /** Forgets the baseline (page swap, restored scroll position); the value keeps decaying. */
  reset: () => void;
}

/** Smoothing factor of an exponential follow with time constant `tau` over `delta` seconds. */
function follow(delta: number, tau: number): number {
  return 1 - Math.exp(-delta / tau);
}

export function createScrollTracker(): ScrollTracker {
  let baseline: number | null = null;
  let speed = 0;
  let value = 0;

  function update({ y, viewport, delta }: ScrollSample): number {
    if (!Number.isFinite(y) || !(viewport > 0)) return value;
    const previous = baseline;
    baseline = y;
    if (previous === null || !(delta > 0)) return value;

    let raw = Math.abs(y - previous) / viewport / delta;
    // A jump is not a scroll: keep the speed where it was, as if this frame had not happened.
    if (raw > SCROLL.JUMP_SPEED) raw = speed;
    speed += (raw - speed) * follow(delta, raw > speed ? SCROLL.RISE : SCROLL.FALL);
    const wanted = Math.tanh(speed / SCROLL.FULL_SPEED);
    value = Math.min(
      Math.max(wanted, value - SCROLL.MAX_FALL_RATE * delta),
      value + SCROLL.MAX_RISE_RATE * delta,
    );
    if (value < SCROLL.REST && wanted < SCROLL.REST) {
      speed = 0;
      value = 0;
    }
    return value;
  }

  return {
    get value() {
      return value;
    },
    get speed() {
      return speed;
    },
    update,
    reset() {
      baseline = null;
    },
  };
}

export interface ScrollWindow {
  readonly scrollY: number;
  readonly innerHeight: number;
}

export interface ScrollReactionOptions {
  loop: Pick<RenderLoop, 'subscribe'>;
  /** The simulation input to write (`simulation.inputs.uScrollVel`); kept across rebuilds. */
  target: { value: number };
  /** Where the scroll position comes from; defaults to `window`. */
  source?: ScrollWindow;
  /** Where page swaps are announced; defaults to `document` (`astro:after-swap`). */
  events?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
}

export interface ScrollReaction {
  readonly tracker: ScrollTracker;
  dispose: () => void;
}

/** Astro's event after the new page is in place and its scroll position set (P1.LAY.07). */
export const PAGE_SWAP_EVENT = 'astro:after-swap';

/** Updates `target` from the scroll speed once per frame until `dispose()`. */
export function attachScrollReaction(options: ScrollReactionOptions): ScrollReaction {
  const { loop, target } = options;
  const source = options.source ?? window;
  const events = options.events ?? document;
  const tracker = createScrollTracker();

  const unsubscribe = loop.subscribe(
    ({ delta }: FrameInfo) => {
      target.value = tracker.update({ y: source.scrollY, viewport: source.innerHeight, delta });
    },
    { order: SCROLL_REACTION_ORDER },
  );
  const onSwap = (): void => tracker.reset();
  events.addEventListener(PAGE_SWAP_EVENT, onSwap);

  let disposed = false;
  return {
    tracker,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      events.removeEventListener(PAGE_SWAP_EVENT, onSwap);
      target.value = 0;
    },
  };
}
