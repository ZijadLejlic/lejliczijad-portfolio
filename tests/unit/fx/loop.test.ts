import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_DELTA_S,
  clampDelta,
  createLoop,
  disposeLoop,
  getLoop,
  initLoop,
  type FrameInfo,
  type LoopDeps,
} from '@/fx/core/loop';

// The loop runs on injected deps: a fake rAF that the test advances by hand, a fake visibility
// flag and a fake on-screen observer. The real browser path is covered by
// tests/e2e/fx-loop.spec.ts on /_dev/fx.

interface FakeEnv {
  deps: LoopDeps;
  /** Runs the pending frame at `timestamp` (ms). Fails when no frame is pending. */
  step: (timestamp: number) => void;
  pending: () => boolean;
  requests: () => number;
  setHidden: (hidden: boolean) => void;
  setOnScreen: (onScreen: boolean) => void;
  errors: unknown[];
  stopped: { visibility: number; onScreen: number };
}

function fakeEnv(initiallyHidden = false): FakeEnv {
  let next: ((timestamp: number) => void) | null = null;
  let nextHandle = 0;
  let pendingHandle: number | null = null;
  let requests = 0;
  let hidden = initiallyHidden;
  let onVisibility: (() => void) | null = null;
  let onScreenChange: ((onScreen: boolean) => void) | null = null;
  const errors: unknown[] = [];
  const stopped = { visibility: 0, onScreen: 0 };

  const deps: LoopDeps = {
    requestFrame: (callback) => {
      expect(pendingHandle, 'only one frame may be pending').toBeNull();
      requests += 1;
      next = callback;
      nextHandle += 1;
      pendingHandle = nextHandle;
      return nextHandle;
    },
    cancelFrame: (handle) => {
      if (handle === pendingHandle) {
        next = null;
        pendingHandle = null;
      }
    },
    isHidden: () => hidden,
    watchVisibility: (onChange) => {
      onVisibility = onChange;
      return () => {
        stopped.visibility += 1;
      };
    },
    observeOnScreen: (_target, onChange) => {
      onScreenChange = onChange;
      return () => {
        stopped.onScreen += 1;
      };
    },
    reportError: (error) => errors.push(error),
  };

  return {
    deps,
    step(timestamp) {
      const callback = next;
      expect(callback, 'a frame should be pending').not.toBeNull();
      next = null;
      pendingHandle = null;
      callback?.(timestamp);
    },
    pending: () => next !== null,
    requests: () => requests,
    setHidden(value) {
      hidden = value;
      onVisibility?.();
    },
    setOnScreen(value) {
      onScreenChange?.(value);
    },
    errors,
    stopped,
  };
}

function canvas(): Element {
  return {} as Element;
}

afterEach(() => {
  disposeLoop();
});

describe('clampDelta', () => {
  it.each([
    [16.6667, 0.0166667],
    [33.3333, 0.0333333],
    [50, MAX_DELTA_S],
    [500, MAX_DELTA_S],
    [60_000, MAX_DELTA_S],
  ])('%d ms → %d s', (ms, seconds) => {
    expect(clampDelta(ms)).toBeCloseTo(seconds, 6);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('a broken interval (%d) is 0', (ms) => {
    expect(clampDelta(ms)).toBe(0);
  });
});

describe('createLoop', () => {
  it('does not request a frame until something subscribes', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    expect(loop.running).toBe(false);
    expect(env.requests()).toBe(0);

    loop.subscribe(() => undefined);
    expect(loop.running).toBe(true);
    expect(env.requests()).toBe(1);
  });

  it('runs one rAF chain however many effects subscribe', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    const a = vi.fn();
    const b = vi.fn();
    loop.subscribe(a);
    loop.subscribe(b);
    expect(env.requests()).toBe(1);

    env.step(1000);
    env.step(1016);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
    expect(env.requests()).toBe(3);
  });

  it('gives delta 0 on the first frame, then the clamped interval, and accumulates time', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    const frames: FrameInfo[] = [];
    loop.subscribe((info) => frames.push({ ...info }));

    env.step(1000);
    env.step(1020);
    env.step(1520); // a 500 ms hitch is clamped

    expect(frames.map((info) => info.frame)).toEqual([1, 2, 3]);
    expect(frames[0]?.delta).toBe(0);
    expect(frames[1]?.delta).toBeCloseTo(0.02, 6);
    expect(frames[2]?.delta).toBe(MAX_DELTA_S);
    expect(frames[2]?.time).toBeCloseTo(0.02 + MAX_DELTA_S, 6);
    expect(loop.time).toBeCloseTo(0.02 + MAX_DELTA_S, 6);
  });

  it('runs subscribers by order, then by subscription order', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    const calls: string[] = [];
    loop.subscribe(() => calls.push('draw'), { order: 10 });
    loop.subscribe(() => calls.push('sim'), { order: -10 });
    loop.subscribe(() => calls.push('a'));
    loop.subscribe(() => calls.push('b'));

    env.step(0);
    expect(calls).toEqual(['sim', 'a', 'b', 'draw']);
  });

  it('stops requesting frames when the last subscriber leaves', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    const unsubscribe = loop.subscribe(() => undefined);
    env.step(0);
    unsubscribe();

    expect(env.pending()).toBe(false);
    expect(loop.running).toBe(false);
  });

  it('lets a callback unsubscribe itself or another one during a frame', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    const second = vi.fn();
    let stopSecond = (): void => undefined;
    const stopFirst = loop.subscribe(() => {
      stopFirst();
      stopSecond();
    });
    stopSecond = loop.subscribe(second);

    env.step(0);
    expect(second).not.toHaveBeenCalled();
    expect(loop.running).toBe(false);
  });

  it('removes a throwing callback, reports it once and keeps the others running', () => {
    const env = fakeEnv();
    const loop = createLoop({ deps: env.deps });
    const broken = vi.fn(() => {
      throw new Error('boom');
    });
    const healthy = vi.fn();
    loop.subscribe(broken);
    loop.subscribe(healthy);

    env.step(0);
    env.step(16);
    expect(broken).toHaveBeenCalledTimes(1);
    expect(healthy).toHaveBeenCalledTimes(2);
    expect(env.errors).toHaveLength(1);
    expect(loop.running).toBe(true);
  });

  describe('pausing', () => {
    it('cancels the pending frame while the tab is hidden and resumes when it is visible', () => {
      const env = fakeEnv();
      const loop = createLoop({ deps: env.deps });
      const callback = vi.fn();
      loop.subscribe(callback);
      env.step(1000);

      env.setHidden(true);
      expect(env.pending()).toBe(false);
      expect(loop.running).toBe(false);
      expect([...loop.pauseReasons]).toEqual(['hidden']);

      env.setHidden(false);
      expect(env.pending()).toBe(true);
      expect(loop.pauseReasons.size).toBe(0);
    });

    it('starts paused in a tab that is already hidden', () => {
      const env = fakeEnv(true);
      const loop = createLoop({ deps: env.deps });
      loop.subscribe(() => undefined);
      expect(env.requests()).toBe(0);

      env.setHidden(false);
      expect(env.requests()).toBe(1);
    });

    it('does not count the paused time: delta is 0 after a resume and time continues', () => {
      const env = fakeEnv();
      const loop = createLoop({ deps: env.deps });
      const frames: FrameInfo[] = [];
      loop.subscribe((info) => frames.push({ ...info }));
      env.step(1000);
      env.step(1016);

      env.setHidden(true);
      env.setHidden(false);
      env.step(61_016); // a minute later

      expect(frames[2]?.delta).toBe(0);
      expect(frames[2]?.time).toBeCloseTo(0.016, 6);
    });

    it('pauses while the canvas is off screen', () => {
      const env = fakeEnv();
      const loop = createLoop({ canvas: canvas(), deps: env.deps });
      loop.subscribe(() => undefined);

      env.setOnScreen(false);
      expect(env.pending()).toBe(false);
      expect([...loop.pauseReasons]).toEqual(['offscreen']);

      env.setOnScreen(true);
      expect(env.pending()).toBe(true);
    });

    it('needs every reason cleared before it runs again', () => {
      const env = fakeEnv();
      const loop = createLoop({ canvas: canvas(), deps: env.deps });
      loop.subscribe(() => undefined);

      loop.pause('context');
      env.setHidden(true);
      env.setOnScreen(false);
      env.setHidden(false);
      env.setOnScreen(true);
      expect(env.pending()).toBe(false);

      loop.resume('context');
      expect(env.pending()).toBe(true);
    });

    it('treats repeated pause or resume calls as one', () => {
      const env = fakeEnv();
      const loop = createLoop({ deps: env.deps });
      loop.subscribe(() => undefined);
      loop.pause('context');
      loop.pause('context');
      loop.resume('context');
      loop.resume('context');

      expect(env.pending()).toBe(true);
      expect(env.requests()).toBe(2);
    });

    it('does not run the frame that was already pending when a pause arrives mid-frame', () => {
      const env = fakeEnv();
      const loop = createLoop({ deps: env.deps });
      const later = vi.fn();
      loop.subscribe(() => loop.pause('context'), { order: -1 });
      loop.subscribe(later);

      env.step(0);
      // The current frame finishes for everyone, but no next frame is requested.
      expect(later).toHaveBeenCalledTimes(1);
      expect(env.pending()).toBe(false);
    });
  });

  it('dispose stops the frame, the observers and every later subscription', () => {
    const env = fakeEnv();
    const loop = createLoop({ canvas: canvas(), deps: env.deps });
    loop.subscribe(() => undefined);

    loop.dispose();
    loop.dispose();
    expect(env.pending()).toBe(false);
    expect(env.stopped).toEqual({ visibility: 1, onScreen: 1 });
    expect(loop.disposed).toBe(true);

    loop.subscribe(() => undefined);
    loop.resume('hidden');
    expect(env.pending()).toBe(false);
  });

  it('does not observe the screen without a canvas', () => {
    const env = fakeEnv();
    const observe = vi.spyOn(env.deps, 'observeOnScreen');
    createLoop({ deps: env.deps }).dispose();
    expect(observe).not.toHaveBeenCalled();
  });
});

describe('initLoop', () => {
  it('returns the same loop for the same canvas (it survives navigation)', () => {
    const env = fakeEnv();
    const target = canvas();
    const first = initLoop({ canvas: target, deps: env.deps });
    expect(initLoop({ canvas: target, deps: env.deps })).toBe(first);
    expect(getLoop()).toBe(first);
  });

  it('replaces the loop for another canvas and disposes the old one', () => {
    const env = fakeEnv();
    const first = initLoop({ canvas: canvas(), deps: env.deps });
    const second = initLoop({ canvas: canvas(), deps: env.deps });
    expect(second).not.toBe(first);
    expect(first.disposed).toBe(true);
  });

  it('creates a new loop after the old one was disposed', () => {
    const env = fakeEnv();
    const target = canvas();
    const first = initLoop({ canvas: target, deps: env.deps });
    first.dispose();
    expect(initLoop({ canvas: target, deps: env.deps })).not.toBe(first);

    disposeLoop();
    expect(getLoop()).toBeNull();
  });
});
