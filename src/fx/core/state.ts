// The FX state controller (tech.md §7.1, §7.3). Pages and the transition controller only say
// which state the scene is in (`idle`, `hero`, `transition-out`, `transition-in`, `section:<id>`);
// this module turns that into the uniform values the vortex reads and tweens between them.
//
// It is plain TypeScript with no WebGL and no clock of its own: the render loop calls
// `update(delta)` once per frame and the simulation copies `values` into its uniforms with
// `writeUniforms()`. That keeps every state and every tween unit-testable (P1.FX.13).
//
// Uniforms driven by input rather than state (`uMouse`, `uScrollVel`, `uTime`) are not here.

/** Uniforms whose value depends on the FX state (tech.md §7.3). */
export const STATE_UNIFORMS = [
  'uSpeed',
  'uSwirl',
  'uNoiseAmp',
  'uDim',
  'uAttract',
  'uMouseStrength',
] as const;
export type StateUniform = (typeof STATE_UNIFORMS)[number];
export type UniformValues = Record<StateUniform, number>;

export const BASE_STATES = ['idle', 'hero', 'transition-out', 'transition-in'] as const;
export type BaseState = (typeof BASE_STATES)[number];
export type SectionState = `section:${string}`;
export type FxState = BaseState | SectionState;

const SECTION_PREFIX = 'section:';
/** Section ids follow the slug rules of the site: lowercase kebab-case. */
const SECTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Starting values per state. They are tuned visually once the vortex renders (P1.FX.08–P1.FX.12)
 * and the page transition is approved (P1.FX.14); only the shape of each state is fixed here:
 * - `idle`: the neutral vortex every other state is measured against (all factors 1, no dim).
 * - `hero`: calmer and slightly dimmed so the face and the H1 stay in front.
 * - `transition-out`: speed-up and pull to the centre ("swallowing" the old page), no mouse field.
 * - `transition-in`: the vortex releases the particles again; the page state follows.
 */
export const STATE_PRESETS: Readonly<Record<BaseState, Readonly<UniformValues>>> = {
  idle: { uSpeed: 1, uSwirl: 1, uNoiseAmp: 1, uDim: 0, uAttract: 0, uMouseStrength: 1 },
  hero: { uSpeed: 0.8, uSwirl: 1, uNoiseAmp: 0.9, uDim: 0.15, uAttract: 0, uMouseStrength: 1 },
  'transition-out': {
    uSpeed: 3,
    uSwirl: 2.2,
    uNoiseAmp: 0.4,
    uDim: 0,
    uAttract: 1,
    uMouseStrength: 0,
  },
  'transition-in': {
    uSpeed: 1.6,
    uSwirl: 1.4,
    uNoiseAmp: 1,
    uDim: 0,
    uAttract: 0.3,
    uMouseStrength: 0.5,
  },
};

/**
 * A section without its own overrides is the idle vortex dimmed behind text. The per-section
 * `uDim` that keeps text at AA contrast is measured in P1.FX.12 and passed in as `sections`.
 */
export const DEFAULT_SECTION: Readonly<Partial<UniformValues>> = { uDim: 0.35 };

/** Matches `--ease-out` and `--ease-in-out` in src/styles/tokens.css (a test keeps them equal). */
export const EASINGS = {
  linear: [0, 0, 1, 1],
  out: [0.22, 1, 0.36, 1],
  'in-out': [0.65, 0, 0.35, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type EaseName = keyof typeof EASINGS;

export interface TweenSpec {
  /** Seconds. 0 jumps to the target on the next `update()`. */
  duration: number;
  ease: EaseName;
}

/** `--dur-slow` (700 ms): the default for moving between page and section states. */
export const DEFAULT_TWEEN: Readonly<TweenSpec> = { duration: 0.7, ease: 'in-out' };

/**
 * Tweens *into* the transition states. Out + in stays within the 700 ms of prd.md §6.4, and the
 * out half is short enough that navigation never waits on it longer than 350 ms (P1.FX.14).
 */
export const TRANSITION_TWEENS: Readonly<Record<'transition-out' | 'transition-in', TweenSpec>> = {
  'transition-out': { duration: 0.3, ease: 'in-out' },
  'transition-in': { duration: 0.35, ease: 'out' },
};

export function isSectionState(state: string): state is SectionState {
  return state.startsWith(SECTION_PREFIX) && SECTION_ID.test(state.slice(SECTION_PREFIX.length));
}

/**
 * Reads a state from untrusted text (`data-fx-state` on `<main>`, tech.md §7.1). Anything that
 * is not a known state or a well-formed `section:<id>` gives `null`, so a typo in markup falls
 * back to the caller's default instead of a broken scene.
 */
export function parseFxState(value: string | null | undefined): FxState | null {
  if (typeof value !== 'string') return null;
  const state = value.trim();
  if ((BASE_STATES as readonly string[]).includes(state)) return state as BaseState;
  return isSectionState(state) ? state : null;
}

/** Cubic Bézier timing function, like CSS `cubic-bezier(x1, y1, x2, y2)`. Maps [0, 1] → [0, 1]. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number): number => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number): number => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx;

  const NEWTON_STEPS = 8;
  const BISECT_STEPS = 30;
  const EPSILON = 1e-7;

  function solveT(x: number): number {
    // Newton first (fast where the curve is not flat), bisection as the safe fallback.
    let t = x;
    for (let i = 0; i < NEWTON_STEPS; i += 1) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < EPSILON) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < EPSILON) break;
      t -= error / slope;
    }
    let low = 0;
    let high = 1;
    t = x;
    for (let i = 0; i < BISECT_STEPS; i += 1) {
      const value = sampleX(t);
      if (Math.abs(value - x) < EPSILON) return t;
      if (value < x) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return t;
  }

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
}

const EASE_FUNCTIONS: Record<EaseName, (x: number) => number> = {
  linear: (x) => Math.min(Math.max(x, 0), 1),
  out: cubicBezier(...EASINGS.out),
  'in-out': cubicBezier(...EASINGS['in-out']),
};

export function ease(name: EaseName, progress: number): number {
  return EASE_FUNCTIONS[name](progress);
}

/** How a `setState()` ended: reached the target, or another `setState()`/`dispose()` came first. */
export type TransitionResult = 'completed' | 'interrupted';

export interface SetStateOptions {
  /** Overrides the tween for this change only. */
  tween?: Partial<TweenSpec>;
  /** Jumps to the target now (e.g. restoring a page state without animation). */
  immediate?: boolean;
}

export interface StateChange {
  state: FxState;
  previous: FxState;
}

export interface StateController {
  readonly state: FxState;
  /** Current, possibly mid-tween, uniform values. A fresh copy on every read. */
  readonly values: Readonly<UniformValues>;
  /** True while a tween is running. */
  readonly animating: boolean;
  readonly disposed: boolean;
  /**
   * Moves to `state` and resolves when the tween ends. Asking for the state the controller is
   * already in does nothing: it resolves at once, or with the running tween if it is still heading
   * there. A new state mid-tween starts from the current values, so interrupted transitions never
   * jump.
   */
  setState: (state: FxState, options?: SetStateOptions) => Promise<TransitionResult>;
  /** Advances the tween by `delta` seconds; call it once per frame from the render loop. */
  update: (delta: number) => void;
  /** Copies the current values into three.js-style uniforms (`{ uSpeed: { value } }`). */
  writeUniforms: (uniforms: Partial<Record<StateUniform, { value: number }>>) => void;
  /** Called on every state change (not every frame). Returns an unsubscribe function. */
  onChange: (listener: (change: StateChange) => void) => () => void;
  dispose: () => void;
}

export interface CreateStateControllerOptions {
  initial?: FxState;
  /** Per-section overrides on top of the idle values, keyed by section id (without `section:`). */
  sections?: Readonly<Record<string, Readonly<Partial<UniformValues>>>>;
}

/** The target values of a state. Unknown sections get the idle vortex with DEFAULT_SECTION. */
export function resolveValues(
  state: FxState,
  sections: CreateStateControllerOptions['sections'] = {},
): UniformValues {
  if (!isSectionState(state)) return { ...STATE_PRESETS[state] };
  const id = state.slice(SECTION_PREFIX.length);
  return { ...STATE_PRESETS.idle, ...DEFAULT_SECTION, ...sections[id] };
}

function tweenFor(state: FxState, override: Partial<TweenSpec> | undefined): TweenSpec {
  const base =
    state === 'transition-out' || state === 'transition-in'
      ? TRANSITION_TWEENS[state]
      : DEFAULT_TWEEN;
  return { ...base, ...override };
}

interface Tween {
  from: UniformValues;
  to: UniformValues;
  spec: TweenSpec;
  elapsed: number;
  /** Everyone waiting on this tween: the `setState()` that started it and repeats of it. */
  waiting: Array<(result: TransitionResult) => void>;
}

function assertState(state: FxState): void {
  if (parseFxState(state) !== state) throw new TypeError(`Unknown FX state: ${String(state)}`);
}

export function createStateController(options: CreateStateControllerOptions = {}): StateController {
  const sections = options.sections ?? {};
  const initial = options.initial ?? 'idle';
  assertState(initial);

  let state: FxState = initial;
  let values = resolveValues(initial, sections);
  let tween: Tween | null = null;
  let disposed = false;
  const listeners = new Set<(change: StateChange) => void>();

  function finishTween(result: TransitionResult): void {
    const current = tween;
    tween = null;
    for (const resolve of current?.waiting ?? []) resolve(result);
  }

  return {
    get state() {
      return state;
    },
    get values() {
      return { ...values };
    },
    get animating() {
      return tween !== null;
    },
    get disposed() {
      return disposed;
    },
    setState(next, setOptions = {}) {
      if (disposed) return Promise.resolve('interrupted');
      assertState(next);
      if (next === state && !setOptions.immediate) {
        const running = tween;
        if (!running) return Promise.resolve('completed');
        return new Promise<TransitionResult>((resolve) => running.waiting.push(resolve));
      }

      finishTween('interrupted');
      const previous = state;
      state = next;
      const target = resolveValues(next, sections);
      for (const listener of [...listeners]) listener({ state: next, previous });

      const spec = tweenFor(next, setOptions.tween);
      if (setOptions.immediate || !(spec.duration > 0)) {
        values = target;
        return Promise.resolve('completed');
      }
      return new Promise<TransitionResult>((resolve) => {
        tween = { from: { ...values }, to: target, spec, elapsed: 0, waiting: [resolve] };
      });
    },
    update(delta) {
      if (!tween || !(delta > 0) || !Number.isFinite(delta)) return;
      const current = tween;
      current.elapsed = Math.min(current.elapsed + delta, current.spec.duration);
      const progress = ease(current.spec.ease, current.elapsed / current.spec.duration);
      const next = { ...values };
      for (const key of STATE_UNIFORMS) {
        next[key] = current.from[key] + (current.to[key] - current.from[key]) * progress;
      }
      values = next;
      if (current.elapsed >= current.spec.duration) {
        values = { ...current.to };
        finishTween('completed');
      }
    },
    writeUniforms(uniforms) {
      for (const key of STATE_UNIFORMS) {
        const uniform = uniforms[key];
        if (uniform) uniform.value = values[key];
      }
    },
    onChange(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      finishTween('interrupted');
      listeners.clear();
    },
  };
}
