// Adaptive quality (tech.md §7.2, P1.FX.07). Capability detection (capabilities.ts) picks a
// starting tier from what the device says about itself; this module corrects it with what the
// device actually does: it watches frame times and steps the tier down when frames get slow.
//
// The governor is pure and has no clock of its own: it only sees the frame deltas the render loop
// hands it, so paused periods (hidden tab, canvas off screen, lost context) simply do not exist for
// it, and every rule is unit-tested with made-up deltas.
//
// Rules (tech.md §7.2):
// - FPS is an exponential moving average over a 2 s window, built from frame times (the first
//   window after a reset is a plain mean).
// - A drop needs a full window of fresh samples: after start or any tier change the estimate starts
//   over, so one tier is never judged by the previous tier's frames.
// - Below 50 FPS (desktop) or 28 FPS (mobile) the tier drops one level. Below `low` is `static`:
//   the owner stops the vortex and shows the poster, and nothing is measured any more.
// - Recovery is one level up, at most once per governor, after 10 s of an uninterrupted > 58 FPS,
//   and never above the starting tier.
// - Frames with delta 0 (the first frame after a start or pause) carry no timing and are ignored.

import type { Quality } from './capabilities';
import type { RenderLoop } from './loop';
import type { RenderQuality } from './renderer';

/** Length of the FPS window, in seconds. */
export const FPS_WINDOW_S = 2;
/** Below this averaged FPS the tier drops one level. */
export const DROP_FPS = { desktop: 50, mobile: 28 } as const;
/** Above this averaged FPS, held without a break for RECOVER_AFTER_S, the tier may go up once. */
export const RECOVER_FPS = 58;
export const RECOVER_AFTER_S = 10;
/** How many times the tier may go back up. */
export const MAX_RECOVERIES = 1;

const TIERS: readonly Quality[] = ['high', 'medium', 'low', 'static'];

function below(quality: Quality): Quality {
  return TIERS[Math.min(TIERS.indexOf(quality) + 1, TIERS.length - 1)] ?? 'static';
}

function above(quality: Quality): Quality {
  return TIERS[Math.max(TIERS.indexOf(quality) - 1, 0)] ?? 'high';
}

export interface QualityChange {
  from: Quality;
  to: Quality;
  direction: 'down' | 'up';
  /** Averaged FPS that triggered the change. */
  fps: number;
}

export interface GovernorOptions {
  /** The detected tier; also the ceiling for recovery. */
  initial: RenderQuality;
  /** Phones and tablets get the lower drop threshold. */
  isMobile: boolean;
  /**
   * `false` keeps measuring FPS (for the debug panel) but never changes the tier. Used for a forced
   * `?fx=high|medium|low`: adaptation would fight the tier the tester asked for.
   */
  adaptive?: boolean;
}

export interface QualityGovernor {
  readonly quality: Quality;
  /** Averaged FPS, or `null` until the current window holds any samples. */
  readonly fps: number | null;
  readonly recoveries: number;
  /** Feeds one frame (`delta` in seconds, as the loop gives it). Returns the change it caused, if any. */
  sample: (delta: number) => QualityChange | null;
}

export function createQualityGovernor(options: GovernorOptions): QualityGovernor {
  const ceiling: Quality = options.initial;
  const dropFps = options.isMobile ? DROP_FPS.mobile : DROP_FPS.desktop;
  const adaptive = options.adaptive ?? true;
  let quality: Quality = options.initial;
  let recoveries = 0;
  /** EMA of the frame time in seconds; averaging time (not FPS) keeps one long frame from vanishing. */
  let frameTime: number | null = null;
  /** Seconds of samples since the last reset; a decision needs a full window. */
  let measured = 0;
  let frames = 0;
  /** Seconds the average has stayed above RECOVER_FPS without a break. */
  let stable = 0;

  function reset(): void {
    frameTime = null;
    measured = 0;
    frames = 0;
    stable = 0;
  }

  function change(to: Quality, fps: number): QualityChange {
    const result: QualityChange = {
      from: quality,
      to,
      direction: TIERS.indexOf(to) > TIERS.indexOf(quality) ? 'down' : 'up',
      fps,
    };
    quality = to;
    reset();
    return result;
  }

  return {
    get quality() {
      return quality;
    },
    get fps() {
      return frameTime === null ? null : 1 / frameTime;
    },
    get recoveries() {
      return recoveries;
    },
    sample(delta) {
      if (quality === 'static' || !Number.isFinite(delta) || delta <= 0) return null;

      measured += delta;
      frames += 1;
      if (measured <= FPS_WINDOW_S || frameTime === null) {
        // The first window is a plain mean, so no single frame (often one from the previous tier)
        // seeds the average.
        frameTime = measured / frames;
      } else {
        // Then a time-based EMA: a frame's weight grows with its length, so the window is 2 s of
        // time, not a fixed number of frames, at any frame rate.
        const weight = 1 - Math.exp(-delta / FPS_WINDOW_S);
        frameTime += weight * (delta - frameTime);
      }
      const fps = 1 / frameTime;

      stable = fps > RECOVER_FPS ? stable + delta : 0;
      if (!adaptive || measured < FPS_WINDOW_S) return null;

      if (fps < dropFps) return change(below(quality), fps);
      if (stable >= RECOVER_AFTER_S && recoveries < MAX_RECOVERIES && quality !== ceiling) {
        recoveries += 1;
        return change(above(quality), fps);
      }
      return null;
    },
  };
}

// --- Wiring ----------------------------------------------------------------------------------------

/** The part of the renderer the wiring needs (keeps tests free of three.js). */
export interface QualityTarget {
  setQuality: (quality: RenderQuality) => void;
}

export interface AdaptiveQualityOptions extends GovernorOptions {
  loop: Pick<RenderLoop, 'subscribe'>;
  renderer: QualityTarget;
  /** Called after every change, after the renderer got the new tier. `static` means: show the poster. */
  onChange?: (change: QualityChange) => void;
}

export interface AdaptiveQuality {
  readonly governor: QualityGovernor;
  /** Stops measuring. Called automatically after a drop to `static`. */
  dispose: () => void;
}

/**
 * Feeds the loop's frame deltas to a governor and applies its decisions: a new tier goes to the
 * renderer (pixel ratio cap now; particle counts when the simulation listens to `onChange`), and
 * `static` is handed to the owner, which stops the effects and brings the poster back.
 */
export function attachAdaptiveQuality(options: AdaptiveQualityOptions): AdaptiveQuality {
  const governor = createQualityGovernor(options);
  let stop: (() => void) | null = null;

  const dispose = (): void => {
    stop?.();
    stop = null;
  };

  // Runs after everything else in the frame; it only reads the delta.
  stop = options.loop.subscribe(
    ({ delta }) => {
      const result = governor.sample(delta);
      if (!result) return;
      if (result.to === 'static') dispose();
      else options.renderer.setQuality(result.to);
      options.onChange?.(result);
    },
    { order: Number.POSITIVE_INFINITY },
  );

  return {
    governor,
    dispose,
  };
}
