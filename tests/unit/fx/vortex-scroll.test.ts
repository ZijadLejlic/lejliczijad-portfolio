import { describe, expect, it } from 'vitest';

import type { FrameCallback, SubscribeOptions } from '@/fx/core/loop';
import { VORTEX_SIMULATION_ORDER, vortexDefines } from '@/fx/vortex/simulation';
import {
  PAGE_SWAP_EVENT,
  SCROLL,
  SCROLL_REACTION_ORDER,
  SCROLL_SPEED_BOOST,
  SCROLL_SWIRL_BOOST,
  attachScrollReaction,
  createScrollTracker,
  scrollRotationFactor,
  type ScrollTracker,
} from '@/fx/vortex/scroll';

// The tracker is fed scroll positions frame by frame; the browser path (real wheel scrolling on
// /_dev/fx?scene=vortex) is covered by tests/e2e/fx-scroll.spec.ts.

const FRAME = 1 / 60;
const VIEWPORT = 800;

/** Scrolls at `speed` viewport heights per second for `seconds`, starting at `from` px. */
function scrollFor(tracker: ScrollTracker, from: number, speed: number, seconds: number): number[] {
  const values: number[] = [];
  let y = from;
  for (let t = 0; t < seconds; t += FRAME) {
    y += speed * VIEWPORT * FRAME;
    values.push(tracker.update({ y, viewport: VIEWPORT, delta: FRAME }));
  }
  return values;
}

function start(tracker: ScrollTracker, y = 0): void {
  tracker.update({ y, viewport: VIEWPORT, delta: 0 });
}

function maxStep(values: number[]): number {
  let max = 0;
  for (let i = 1; i < values.length; i += 1) {
    max = Math.max(max, Math.abs((values[i] ?? 0) - (values[i - 1] ?? 0)));
  }
  return max;
}

describe('createScrollTracker', () => {
  it('stays at 0 while the page does not move', () => {
    const tracker = createScrollTracker();
    start(tracker, 300);
    expect(scrollFor(tracker, 300, 0, 1).every((value) => value === 0)).toBe(true);
  });

  it('takes a baseline on the first frame and on delta 0', () => {
    const tracker = createScrollTracker();
    expect(tracker.update({ y: 5000, viewport: VIEWPORT, delta: FRAME })).toBe(0);
    expect(tracker.update({ y: 9000, viewport: VIEWPORT, delta: 0 })).toBe(0);
    expect(tracker.update({ y: 9000, viewport: VIEWPORT, delta: FRAME })).toBe(0);
  });

  it('rises with the scroll speed and saturates below 1', () => {
    const slow = createScrollTracker();
    const fast = createScrollTracker();
    start(slow);
    start(fast);
    const slowEnd = scrollFor(slow, 0, 1, 2).at(-1) ?? 0;
    const fastEnd = scrollFor(fast, 0, 20, 2).at(-1) ?? 0;
    expect(slowEnd).toBeGreaterThan(0.2);
    expect(slowEnd).toBeCloseTo(Math.tanh(1 / SCROLL.FULL_SPEED), 2);
    expect(fastEnd).toBeGreaterThan(slowEnd);
    expect(fastEnd).toBeGreaterThan(0.99);
    expect(fastEnd).toBeLessThan(1);
  });

  it('ignores the direction', () => {
    const down = createScrollTracker();
    const up = createScrollTracker();
    start(down, 4000);
    start(up, 4000);
    expect(scrollFor(up, 4000, -3, 0.5)).toEqual(scrollFor(down, 4000, 3, 0.5));
  });

  it('measures in viewport heights, so a phone and a desktop feel the same', () => {
    const phone = createScrollTracker();
    const desktop = createScrollTracker();
    phone.update({ y: 0, viewport: 700, delta: 0 });
    desktop.update({ y: 0, viewport: 1400, delta: 0 });
    const a = phone.update({ y: 70, viewport: 700, delta: FRAME });
    const b = desktop.update({ y: 140, viewport: 1400, delta: FRAME });
    expect(a).toBeCloseTo(b, 10);
  });

  it('never jumps: the fastest fling changes the value by little per frame', () => {
    const tracker = createScrollTracker();
    start(tracker);
    // Just under the jump threshold, the hardest a real scroll can push it.
    const fling = scrollFor(tracker, 0, SCROLL.JUMP_SPEED * 0.99, 1);
    expect(maxStep(fling)).toBeLessThan(0.1);

    // On a slow device the loop's longest step (0.05 s) still keeps it within the rise rate.
    const slow = createScrollTracker();
    slow.update({ y: 0, viewport: VIEWPORT, delta: 0 });
    const steps: number[] = [];
    for (let i = 1; i <= 20; i += 1) {
      steps.push(slow.update({ y: i * 0.05 * 24 * VIEWPORT, viewport: VIEWPORT, delta: 0.05 }));
    }
    expect(maxStep([0, ...steps])).toBeLessThanOrEqual(SCROLL.MAX_RISE_RATE * 0.05 + 1e-9);
  });

  it('rises faster than it falls', () => {
    const tracker = createScrollTracker();
    start(tracker);
    const rise = scrollFor(tracker, 0, 8, 0.5);
    const peak = rise.at(-1) ?? 0;
    const fall = scrollFor(tracker, 8 * VIEWPORT * 0.5, 0, 0.5);
    expect(peak - (fall.at(-1) ?? 0)).toBeLessThan(peak - (rise[0] ?? 0));
    expect(maxStep(fall)).toBeLessThan(0.05);
  });

  it('settles to exactly 0 after the scroll stops', () => {
    const tracker = createScrollTracker();
    start(tracker);
    scrollFor(tracker, 0, 10, 0.5);
    const after = scrollFor(tracker, 4000, 0, 10);
    expect(after.at(-1)).toBe(0);
    expect(tracker.speed).toBe(0);
  });

  it('treats a jump (anchor, Home/End, page swap) as no frame at all', () => {
    const tracker = createScrollTracker();
    start(tracker);
    expect(tracker.update({ y: 3 * VIEWPORT, viewport: VIEWPORT, delta: FRAME })).toBe(0);
    // Scrolling on from the new position is measured from there, not from the old one.
    const values = scrollFor(tracker, 3 * VIEWPORT, 1, 0.2);
    expect(values.at(-1) ?? 1).toBeLessThan(0.3);

    const busy = createScrollTracker();
    start(busy);
    const before = scrollFor(busy, 0, 2, 0.5).at(-1) ?? 0;
    const after = busy.update({ y: 0, viewport: VIEWPORT, delta: FRAME });
    expect(Math.abs(after - before)).toBeLessThan(0.01);
  });

  it('reset() forgets the baseline but keeps the value decaying smoothly', () => {
    const tracker = createScrollTracker();
    start(tracker);
    const before = scrollFor(tracker, 0, 3, 0.5).at(-1) ?? 0;
    tracker.reset();
    // A swap that restores a nearby scroll position is not measured as a scroll.
    expect(tracker.update({ y: 120, viewport: VIEWPORT, delta: FRAME })).toBe(before);
    const next = tracker.update({ y: 120, viewport: VIEWPORT, delta: FRAME });
    expect(next).toBeLessThan(before);
    expect(before - next).toBeLessThan(0.05);
  });

  it('ignores broken samples', () => {
    const tracker = createScrollTracker();
    start(tracker);
    expect(tracker.update({ y: Number.NaN, viewport: VIEWPORT, delta: FRAME })).toBe(0);
    expect(tracker.update({ y: 100, viewport: 0, delta: FRAME })).toBe(0);
  });
});

describe('scrollRotationFactor', () => {
  it('is 1 at rest and bounded on the fastest scroll', () => {
    expect(scrollRotationFactor(0)).toBe(1);
    expect(scrollRotationFactor(1)).toBeCloseTo(
      (1 + SCROLL_SPEED_BOOST) * (1 + SCROLL_SWIRL_BOOST),
      10,
    );
    expect(scrollRotationFactor(1)).toBeLessThanOrEqual(3);
  });

  it('reaches the shaders as defines', () => {
    const defines = vortexDefines();
    expect(defines.SCROLL_SPEED_BOOST).toBe(String(SCROLL_SPEED_BOOST));
    expect(Number(defines.SCROLL_SWIRL_BOOST)).toBe(SCROLL_SWIRL_BOOST);
  });
});

describe('attachScrollReaction', () => {
  function setup() {
    const subscribers: Array<{ callback: FrameCallback; options?: SubscribeOptions }> = [];
    let unsubscribed = 0;
    const loop = {
      subscribe: (callback: FrameCallback, options?: SubscribeOptions) => {
        const entry = { callback, options };
        subscribers.push(entry);
        return () => {
          unsubscribed += 1;
          subscribers.splice(subscribers.indexOf(entry), 1);
        };
      },
    };
    const source = { scrollY: 0, innerHeight: VIEWPORT };
    const events = new EventTarget();
    const target = { value: 0 };
    const reaction = attachScrollReaction({ loop, target, source, events });
    const frame = (delta = FRAME): void => {
      for (const { callback } of [...subscribers]) callback({ delta, time: 0, frame: 0 });
    };
    return {
      reaction,
      subscribers,
      source,
      events,
      target,
      frame,
      unsubscribed: () => unsubscribed,
    };
  }

  it('runs between the state tween and the simulation', () => {
    const { subscribers } = setup();
    expect(subscribers[0]?.options?.order).toBe(SCROLL_REACTION_ORDER);
    expect(SCROLL_REACTION_ORDER).toBeLessThan(VORTEX_SIMULATION_ORDER);
  });

  it('writes the scroll value into the target every frame', () => {
    const { source, target, frame } = setup();
    frame(0);
    for (let i = 0; i < 30; i += 1) {
      source.scrollY += 40;
      frame();
    }
    expect(target.value).toBeGreaterThan(0.3);
  });

  it('resets the baseline on a page swap', () => {
    const { source, target, events, frame } = setup();
    frame(0);
    events.dispatchEvent(new Event(PAGE_SWAP_EVENT));
    source.scrollY = 300;
    frame();
    expect(target.value).toBe(0);
  });

  it('dispose() stops listening and zeroes the target', () => {
    const { reaction, source, target, events, frame, subscribers, unsubscribed } = setup();
    frame(0);
    source.scrollY = 40;
    frame();
    expect(target.value).toBeGreaterThan(0);
    reaction.dispose();
    reaction.dispose();
    expect(unsubscribed()).toBe(1);
    expect(subscribers).toHaveLength(0);
    expect(target.value).toBe(0);
    events.dispatchEvent(new Event(PAGE_SWAP_EVENT));
    expect(target.value).toBe(0);
  });
});
