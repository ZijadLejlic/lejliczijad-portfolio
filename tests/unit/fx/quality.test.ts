import { describe, expect, it, vi } from 'vitest';

import {
  DROP_FPS,
  FPS_WINDOW_S,
  MAX_RECOVERIES,
  RECOVER_AFTER_S,
  RECOVER_FPS,
  attachAdaptiveQuality,
  createQualityGovernor,
  type QualityChange,
  type QualityGovernor,
} from '@/fx/core/quality';
import type { FrameCallback } from '@/fx/core/loop';

// The governor is clock-free: these tests feed it made-up frame deltas (seconds), exactly what the
// render loop hands it. The real throttled browser is covered by tests/e2e/fx-quality.spec.ts.

const at = (fps: number): number => 1 / fps;

/** Feeds `seconds` worth of frames at `fps` and returns every change on the way. */
function run(governor: QualityGovernor, fps: number, seconds: number): QualityChange[] {
  const changes: QualityChange[] = [];
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i += 1) {
    const change = governor.sample(at(fps));
    if (change) changes.push(change);
  }
  return changes;
}

describe('constants', () => {
  it('match tech.md §7.2', () => {
    expect(FPS_WINDOW_S).toBe(2);
    expect(DROP_FPS).toEqual({ desktop: 50, mobile: 28 });
    expect(RECOVER_FPS).toBe(58);
    expect(RECOVER_AFTER_S).toBe(10);
    expect(MAX_RECOVERIES).toBe(1);
  });
});

describe('measuring', () => {
  it('has no FPS before the first sample', () => {
    expect(createQualityGovernor({ initial: 'high', isMobile: false }).fps).toBeNull();
  });

  it('averages a steady frame rate to that rate', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    run(governor, 60, 3);
    expect(governor.fps).toBeCloseTo(60, 5);
  });

  it('ignores zero, negative and non-finite deltas (first frame after a pause)', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    for (const delta of [0, -0.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(governor.sample(delta)).toBeNull();
    }
    expect(governor.fps).toBeNull();
  });

  it('weights by time, so the window is ~2 s at any frame rate', () => {
    // After one window of 30 FPS that follows a long 60 FPS run, the average has moved
    // 1 - e^-1 ≈ 63 % of the way from 60 FPS frame time to 30 FPS frame time.
    for (const rate of [30, 120]) {
      const governor = createQualityGovernor({ initial: 'high', isMobile: true });
      run(governor, 60, 10);
      run(governor, rate, FPS_WINDOW_S);
      const expected = at(60) + (1 - Math.exp(-1)) * (at(rate) - at(60));
      expect(1 / (governor.fps ?? 0)).toBeCloseTo(expected, 3);
    }
  });

  it('lets one long frame move the average less than a sustained slowdown', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    run(governor, 60, 3);
    expect(governor.sample(0.05)).toBeNull();
    expect(governor.fps).toBeGreaterThan(DROP_FPS.desktop);
  });
});

describe('dropping', () => {
  it('waits for a full window before judging', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    expect(run(governor, 20, FPS_WINDOW_S - 0.1)).toEqual([]);
    const [change] = run(governor, 20, 0.2);
    expect(change).toMatchObject({ from: 'high', to: 'medium', direction: 'down' });
    expect(change?.fps).toBeLessThan(DROP_FPS.desktop);
  });

  it('drops one level below 50 FPS on desktop, not at 50', () => {
    const slow = createQualityGovernor({ initial: 'high', isMobile: false });
    expect(run(slow, 45, 2.5).map((c) => c.to)).toEqual(['medium']);
    const ok = createQualityGovernor({ initial: 'high', isMobile: false });
    expect(run(ok, 51, 10)).toEqual([]);
  });

  it('uses 28 FPS on mobile', () => {
    const phone = createQualityGovernor({ initial: 'medium', isMobile: true });
    expect(run(phone, 40, 10)).toEqual([]);
    expect(run(phone, 25, 3).map((c) => c.to)).toEqual(['low']);
  });

  it('measures each tier afresh: one level per window, down to static', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    const changes = run(governor, 20, 4 * FPS_WINDOW_S + 1);
    expect(changes.map((c) => c.to)).toEqual(['medium', 'low', 'static']);
    expect(governor.quality).toBe('static');
    // Every change starts a fresh window, so static has no average left.
    expect(governor.fps).toBeNull();
  });

  it('measures nothing once static', () => {
    const governor = createQualityGovernor({ initial: 'low', isMobile: false });
    run(governor, 20, 3);
    expect(governor.quality).toBe('static');
    expect(run(governor, 120, 30)).toEqual([]);
    expect(governor.fps).toBeNull();
  });

  it('does not count paused time: frames on both sides of a pause join one window', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    expect(run(governor, 20, 1)).toEqual([]);
    governor.sample(0); // first frame after the pause
    expect(run(governor, 20, 0.9)).toEqual([]);
    expect(run(governor, 20, 0.2).map((c) => c.to)).toEqual(['medium']);
  });
});

describe('recovering', () => {
  function droppedOnce(): QualityGovernor {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false });
    // Slow frames until the drop, and not one more, so the next window holds only fast frames.
    while (!governor.sample(at(30)));
    expect(governor.quality).toBe('medium');
    return governor;
  }

  it('goes one level up after 10 s of stable > 58 FPS', () => {
    const governor = droppedOnce();
    expect(run(governor, 60, RECOVER_AFTER_S - 0.2)).toEqual([]);
    const changes = run(governor, 60, 0.5);
    expect(changes).toMatchObject([{ from: 'medium', to: 'high', direction: 'up' }]);
    expect(governor.recoveries).toBe(1);
  });

  it('restarts the 10 s when the average dips to 58 or below', () => {
    const governor = droppedOnce();
    run(governor, 60, 8);
    run(governor, 55, 2); // above the drop threshold, below the recovery one
    expect(run(governor, 60, 8)).toEqual([]);
    expect(governor.quality).toBe('medium');
    expect(run(governor, 60, 4).map((c) => c.to)).toEqual(['high']);
  });

  it('recovers at most once', () => {
    const governor = droppedOnce();
    run(governor, 60, 11);
    expect(governor.quality).toBe('high');
    while (!governor.sample(at(30)));
    expect(governor.quality).toBe('medium');
    expect(run(governor, 60, 60)).toEqual([]);
    expect(governor.recoveries).toBe(1);
  });

  it('never goes above the detected tier', () => {
    const governor = createQualityGovernor({ initial: 'medium', isMobile: false });
    expect(run(governor, 60, 30)).toEqual([]);
    expect(governor.quality).toBe('medium');
    expect(governor.recoveries).toBe(0);
  });
});

describe('measure-only mode (forced ?fx=)', () => {
  it('reports FPS but never changes the tier', () => {
    const governor = createQualityGovernor({ initial: 'high', isMobile: false, adaptive: false });
    expect(run(governor, 10, 20)).toEqual([]);
    expect(governor.quality).toBe('high');
    expect(governor.fps).toBeCloseTo(10, 5);
  });
});

describe('attachAdaptiveQuality', () => {
  function fakeLoop(): {
    loop: { subscribe: (cb: FrameCallback, options?: { order?: number }) => () => void };
    frame: (delta: number) => void;
    subscribed: () => boolean;
    order: () => number | undefined;
  } {
    let callback: FrameCallback | null = null;
    let order: number | undefined;
    let frame = 0;
    return {
      loop: {
        subscribe(cb, options) {
          callback = cb;
          order = options?.order;
          return () => {
            callback = null;
          };
        },
      },
      frame(delta) {
        frame += 1;
        callback?.({ delta, time: 0, frame });
      },
      subscribed: () => callback !== null,
      order: () => order,
    };
  }

  const feed = (fake: ReturnType<typeof fakeLoop>, fps: number, seconds: number): void => {
    for (let i = 0; i < Math.round(fps * seconds); i += 1) fake.frame(at(fps));
  };

  it('runs after the other frame callbacks', () => {
    const fake = fakeLoop();
    attachAdaptiveQuality({
      loop: fake.loop,
      renderer: { setQuality: vi.fn() },
      initial: 'high',
      isMobile: false,
    });
    expect(fake.order()).toBe(Number.POSITIVE_INFINITY);
  });

  it('applies drops to the renderer and reports them', () => {
    const fake = fakeLoop();
    const setQuality = vi.fn();
    const onChange = vi.fn();
    attachAdaptiveQuality({
      loop: fake.loop,
      renderer: { setQuality },
      initial: 'high',
      isMobile: false,
      onChange,
    });
    feed(fake, 20, 2.1);
    expect(setQuality).toHaveBeenCalledWith('medium');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 'high', to: 'medium' }));
  });

  it('hands static to the owner and stops listening', () => {
    const fake = fakeLoop();
    const setQuality = vi.fn();
    const onChange = vi.fn();
    attachAdaptiveQuality({
      loop: fake.loop,
      renderer: { setQuality },
      initial: 'low',
      isMobile: false,
      onChange,
    });
    feed(fake, 20, 2.1);
    expect(setQuality).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ to: 'static' }));
    expect(fake.subscribed()).toBe(false);
  });

  it('keeps a forced tier and still measures', () => {
    const fake = fakeLoop();
    const setQuality = vi.fn();
    const adaptive = attachAdaptiveQuality({
      loop: fake.loop,
      renderer: { setQuality },
      initial: 'high',
      isMobile: false,
      adaptive: false,
    });
    feed(fake, 10, 10);
    expect(setQuality).not.toHaveBeenCalled();
    expect(adaptive.governor.fps).toBeCloseTo(10, 5);
  });

  it('dispose unsubscribes', () => {
    const fake = fakeLoop();
    const adaptive = attachAdaptiveQuality({
      loop: fake.loop,
      renderer: { setQuality: vi.fn() },
      initial: 'high',
      isMobile: false,
    });
    adaptive.dispose();
    adaptive.dispose();
    expect(fake.subscribed()).toBe(false);
  });
});
