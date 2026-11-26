import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CONTEXT_RESTORE_TIMEOUT_MS,
  cappedPixelRatio,
  createRenderer,
  disposeRenderer,
  getRenderer,
  initRenderer,
  nextContextState,
  type ContextState,
  type RendererDeps,
  type WebGLRendererLike,
} from '@/fx/core/renderer';

// The renderer is driven through injected deps, so the whole lifecycle (resize, context loss and
// restore, disposal) runs in Node without WebGL. The real browser path is covered by
// tests/e2e/fx-renderer.spec.ts on /_dev/fx.

describe('cappedPixelRatio', () => {
  it.each([
    [3, 'high', 2],
    [2, 'high', 2],
    [1.25, 'high', 1.25],
    [3, 'medium', 1.5],
    [1, 'medium', 1],
    [2, 'low', 1],
    [0.8, 'low', 0.8],
  ] as const)('dpr %d on %s → %d', (dpr, quality, expected) => {
    expect(cappedPixelRatio(dpr, quality)).toBe(expected);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'treats a broken ratio (%d) as 1',
    (dpr) => {
      expect(cappedPixelRatio(dpr, 'high')).toBe(1);
    },
  );
});

describe('nextContextState', () => {
  const ready: ContextState = { status: 'ready', restores: 0 };

  it('lost → restored counts one restore', () => {
    const lost = nextContextState(ready, 'lost');
    expect(lost).toEqual({ status: 'lost', restores: 0 });
    expect(nextContextState(lost, 'restored')).toEqual({ status: 'ready', restores: 1 });
  });

  it('a second loss after one restore fails', () => {
    expect(nextContextState({ status: 'ready', restores: 1 }, 'lost')).toEqual({
      status: 'failed',
      restores: 1,
    });
  });

  it('a restore that never arrives fails', () => {
    expect(nextContextState({ status: 'lost', restores: 0 }, 'restore-timeout').status).toBe(
      'failed',
    );
  });

  it('ignores events that do not apply', () => {
    expect(nextContextState(ready, 'restored')).toBe(ready);
    expect(nextContextState(ready, 'restore-timeout')).toBe(ready);
    const lost: ContextState = { status: 'lost', restores: 0 };
    expect(nextContextState(lost, 'lost')).toBe(lost);
  });

  it.each(['failed', 'disposed'] as const)('%s is terminal', (status) => {
    const state: ContextState = { status, restores: 0 };
    for (const event of ['lost', 'restored', 'restore-timeout'] as const) {
      expect(nextContextState(state, event)).toBe(state);
    }
  });
});

// --- Fakes ----------------------------------------------------------------------------------------

class FakeThree implements WebGLRendererLike {
  calls: string[] = [];
  pixelRatio = 1;
  width = 0;
  height = 0;
  disposed = false;

  setPixelRatio(value: number): void {
    this.pixelRatio = value;
    this.calls.push(`ratio:${value}`);
  }

  setSize(width: number, height: number, updateStyle?: boolean): void {
    this.width = width;
    this.height = height;
    this.calls.push(`size:${width}x${height}:${String(updateStyle)}`);
  }

  dispose(): void {
    this.disposed = true;
  }
}

function fakeCanvas(width = 800, height = 600): HTMLCanvasElement {
  const target = new EventTarget() as EventTarget & { clientWidth: number; clientHeight: number };
  target.clientWidth = width;
  target.clientHeight = height;
  return target as unknown as HTMLCanvasElement;
}

interface Harness {
  deps: RendererDeps<FakeThree>;
  three: FakeThree;
  resizeTo: (width: number, height: number) => void;
  setDpr: (dpr: number) => void;
  observers: () => number;
}

function harness(initialDpr = 2): Harness {
  const three = new FakeThree();
  let dpr = initialDpr;
  let onSize: ((width: number, height: number) => void) | null = null;
  let onRatio: (() => void) | null = null;
  let active = 0;

  return {
    three,
    deps: {
      createRenderer: () => three,
      devicePixelRatio: () => dpr,
      observeSize: (_canvas, callback) => {
        onSize = callback;
        active += 1;
        return () => {
          onSize = null;
          active -= 1;
        };
      },
      watchPixelRatio: (callback) => {
        onRatio = callback;
        active += 1;
        return () => {
          onRatio = null;
          active -= 1;
        };
      },
    },
    resizeTo: (width, height) => onSize?.(width, height),
    setDpr: (value) => {
      dpr = value;
      onRatio?.();
    },
    observers: () => active,
  };
}

function lose(canvas: HTMLCanvasElement): void {
  canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
}

function restore(canvas: HTMLCanvasElement): void {
  canvas.dispatchEvent(new Event('webglcontextrestored'));
}

// --- Renderer ---------------------------------------------------------------------------------------

describe('createRenderer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('sizes the drawing buffer from the canvas CSS size and the capped ratio', () => {
    const h = harness(3);
    const fx = createRenderer({ canvas: fakeCanvas(1280, 720), quality: 'medium', deps: h.deps });

    expect(fx.size).toEqual({ width: 1280, height: 720, pixelRatio: 1.5 });
    expect(h.three.pixelRatio).toBe(1.5);
    // updateStyle = false: CSS keeps owning the canvas layout.
    expect(h.three.calls).toContain('size:1280x720:false');
  });

  it('follows resizes and skips no-op or zero sizes', () => {
    const h = harness(1);
    const fx = createRenderer({ canvas: fakeCanvas(), quality: 'high', deps: h.deps });
    const sizes: unknown[] = [];
    fx.on('resize', (size) => sizes.push(size));

    h.resizeTo(1024, 768);
    h.resizeTo(1024, 768);
    h.resizeTo(0, 0);

    expect(sizes).toEqual([{ width: 1024, height: 768, pixelRatio: 1 }]);
    expect(fx.size.width).toBe(1024);
  });

  it('re-applies the cap when the pixel ratio or the tier changes', () => {
    const h = harness(1);
    const fx = createRenderer({ canvas: fakeCanvas(), quality: 'high', deps: h.deps });

    h.setDpr(2);
    expect(h.three.pixelRatio).toBe(2);
    fx.setQuality('low');
    expect(h.three.pixelRatio).toBe(1);
    expect(fx.quality).toBe('low');
  });

  it('recovers from one context loss', () => {
    const h = harness();
    const canvas = fakeCanvas();
    const fx = createRenderer({ canvas, quality: 'high', deps: h.deps });
    const events: string[] = [];
    fx.on('lost', () => events.push('lost'));
    fx.on('restored', () => events.push('restored'));

    lose(canvas);
    expect(fx.status).toBe('lost');
    h.three.calls = [];
    restore(canvas);

    expect(fx.status).toBe('ready');
    expect(fx.restores).toBe(1);
    expect(events).toEqual(['lost', 'restored']);
    // The drawing buffer is set again on top of three's own re-initialization.
    expect(h.three.calls).toEqual(['ratio:2', 'size:800x600:false']);

    // The restore deadline was cleared: nothing fails later.
    vi.advanceTimersByTime(CONTEXT_RESTORE_TIMEOUT_MS * 2);
    expect(fx.status).toBe('ready');
  });

  it('fails on a second loss and stops observing', () => {
    const h = harness();
    const canvas = fakeCanvas();
    const fx = createRenderer({ canvas, quality: 'high', deps: h.deps });
    const failed = vi.fn();
    fx.on('failed', failed);

    lose(canvas);
    restore(canvas);
    lose(canvas);

    expect(fx.status).toBe('failed');
    expect(failed).toHaveBeenCalledOnce();
    expect(h.observers()).toBe(0);

    restore(canvas);
    expect(fx.status).toBe('failed');
  });

  it('fails when the restore never comes', () => {
    const h = harness();
    const canvas = fakeCanvas();
    const fx = createRenderer({ canvas, quality: 'high', deps: h.deps });
    const failed = vi.fn();
    fx.on('failed', failed);

    lose(canvas);
    vi.advanceTimersByTime(CONTEXT_RESTORE_TIMEOUT_MS - 1);
    expect(fx.status).toBe('lost');
    vi.advanceTimersByTime(1);

    expect(fx.status).toBe('failed');
    expect(failed).toHaveBeenCalledOnce();
  });

  it('dispose releases everything and ignores later events', () => {
    const h = harness();
    const canvas = fakeCanvas();
    const fx = createRenderer({ canvas, quality: 'high', deps: h.deps });
    const lost = vi.fn();
    fx.on('lost', lost);

    fx.dispose();
    fx.dispose();
    lose(canvas);

    expect(fx.status).toBe('disposed');
    expect(h.three.disposed).toBe(true);
    expect(h.observers()).toBe(0);
    expect(lost).not.toHaveBeenCalled();
  });

  it('unsubscribe removes a listener', () => {
    const h = harness();
    const canvas = fakeCanvas();
    const fx = createRenderer({ canvas, quality: 'high', deps: h.deps });
    const lost = vi.fn();
    const off = fx.on('lost', lost);

    off();
    lose(canvas);
    expect(lost).not.toHaveBeenCalled();
  });
});

describe('initRenderer singleton', () => {
  afterEach(() => disposeRenderer());

  it('returns the same instance for the persisted canvas and applies the new tier', () => {
    const h = harness(2);
    const canvas = fakeCanvas();
    const create = vi.spyOn(h.deps, 'createRenderer');

    const first = initRenderer({ canvas, quality: 'high', deps: h.deps });
    const second = initRenderer({ canvas, quality: 'medium', deps: h.deps });

    expect(second).toBe(first);
    expect(create).toHaveBeenCalledOnce();
    expect(first.quality).toBe('medium');
    expect(getRenderer()).toBe(first);
  });

  it('replaces the renderer for a different canvas', () => {
    const a = harness();
    const b = harness();
    const first = initRenderer({ canvas: fakeCanvas(), quality: 'high', deps: a.deps });
    const second = initRenderer({ canvas: fakeCanvas(), quality: 'high', deps: b.deps });

    expect(second).not.toBe(first);
    expect(first.status).toBe('disposed');
    expect(a.three.disposed).toBe(true);
    expect(getRenderer()).toBe(second);
  });

  it('disposeRenderer clears the singleton', () => {
    const h = harness();
    initRenderer({ canvas: fakeCanvas(), quality: 'low', deps: h.deps });
    disposeRenderer();
    expect(getRenderer()).toBeNull();
    expect(h.three.disposed).toBe(true);
  });
});
