import { describe, expect, it } from 'vitest';

import { createPointerInput, toNdc, type PointerInputDeps } from '@/fx/core/input';

// The pointer input runs on an injected event target, so it is tested in Node without a DOM.

type Listener = (event: Partial<PointerEvent>) => void;

function fakeTarget() {
  const listeners = new Map<string, Set<Listener>>();
  const target = {
    addEventListener(type: string, listener: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener(type: string, listener: Listener) {
      listeners.get(type)?.delete(listener);
    },
  };
  const fire = (type: string, event: Partial<PointerEvent> = {}): void => {
    for (const listener of listeners.get(type) ?? []) listener(event);
  };
  const count = (): number => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  return { target: target as unknown as PointerInputDeps['target'], fire, count };
}

const VIEWPORT = { width: 1000, height: 500 };

function setup() {
  const fake = fakeTarget();
  const input = createPointerInput({ target: fake.target, viewport: () => VIEWPORT });
  return { ...fake, input };
}

const mouse = (clientX: number, clientY: number): Partial<PointerEvent> => ({
  pointerType: 'mouse',
  clientX,
  clientY,
});

describe('toNdc', () => {
  it('maps the viewport corners and centre to NDC with +y up', () => {
    expect(toNdc(0, 0, VIEWPORT)).toEqual({ x: -1, y: 1 });
    expect(toNdc(1000, 500, VIEWPORT)).toEqual({ x: 1, y: -1 });
    expect(toNdc(500, 250, VIEWPORT)).toEqual({ x: 0, y: 0 });
  });

  it('does not divide by zero on an empty viewport', () => {
    expect(Number.isFinite(toNdc(10, 10, { width: 0, height: 0 }).x)).toBe(true);
  });
});

describe('createPointerInput', () => {
  it('starts absent', () => {
    const { input } = setup();
    expect(input.present).toBe(false);
    expect(input.takeTravel()).toBe(0);
  });

  it('tracks a mouse in NDC and sums the distance it travels', () => {
    const { input, fire } = setup();
    fire('pointermove', mouse(500, 250));
    expect(input.present).toBe(true);
    expect([input.ndcX, input.ndcY]).toEqual([0, 0]);
    // The first move only places the pointer; it is not travel.
    expect(input.takeTravel()).toBe(0);

    fire('pointermove', mouse(530, 290));
    fire('pointermove', mouse(530, 300));
    expect(input.takeTravel()).toBe(60);
    expect(input.takeTravel()).toBe(0);
  });

  it('accepts a pen, ignores touch and treats a touch as the mouse leaving', () => {
    const { input, fire } = setup();
    fire('pointermove', { pointerType: 'touch', clientX: 10, clientY: 10 });
    expect(input.present).toBe(false);

    fire('pointermove', { pointerType: 'pen', clientX: 10, clientY: 10 });
    expect(input.present).toBe(true);

    fire('pointerdown', { pointerType: 'touch', clientX: 900, clientY: 10 });
    expect(input.present).toBe(false);
  });

  it('goes absent when the pointer leaves the window or the window loses focus', () => {
    const { input, fire } = setup();
    fire('pointermove', mouse(100, 100));
    // pointerout to another element is not leaving the window.
    fire('pointerout', { relatedTarget: {} as EventTarget });
    expect(input.present).toBe(true);
    fire('pointerout', { relatedTarget: null });
    expect(input.present).toBe(false);

    fire('pointermove', mouse(100, 100));
    fire('blur');
    expect(input.present).toBe(false);
  });

  it('does not count the jump back in after leaving as travel', () => {
    const { input, fire } = setup();
    fire('pointermove', mouse(0, 0));
    fire('pointerout', { relatedTarget: null });
    fire('pointermove', mouse(900, 400));
    expect(input.takeTravel()).toBe(0);
  });

  it('removes every listener on dispose', () => {
    const { input, fire, count } = setup();
    expect(count()).toBeGreaterThan(0);
    input.dispose();
    expect(count()).toBe(0);
    fire('pointermove', mouse(10, 10));
    expect(input.present).toBe(false);
  });
});
