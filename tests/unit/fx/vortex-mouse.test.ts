import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { FrameCallback, SubscribeOptions } from '@/fx/core/loop';
import {
  MOUSE_FIELD,
  MOUSE_FIELD_ORDER,
  attachMouseField,
  createMouseFieldState,
  pointerToDisk,
  stepMouseField,
} from '@/fx/vortex/mouse';
import { MOUSE_PARKED, VORTEX_SIMULATION_ORDER } from '@/fx/vortex/simulation';

// The mouse field is pure math on three's Ray and Plane (no WebGL), so it runs in Node. The shader
// side (the repel in vortex-velocity.glsl) runs in tests/e2e/fx-mouse.spec.ts.

const FRAME = 1 / 60;

function camera(): PerspectiveCamera {
  const cam = new PerspectiveCamera(40, 16 / 10, 0.1, 50);
  cam.position.set(0, 0, 6.5);
  cam.updateProjectionMatrix();
  return cam;
}

/** The dev page's disk: tilted towards the camera and turned. */
function disk(): Object3D {
  const object = new Object3D();
  object.rotation.set(0.32, 0, -0.42);
  return object;
}

/** A disk seen face-on: local XZ plane facing the camera. */
function faceOnDisk(): Object3D {
  const object = new Object3D();
  object.rotation.set(Math.PI / 2, 0, 0);
  return object;
}

describe('pointerToDisk', () => {
  it('hits the disk centre through the screen centre', () => {
    const hit = pointerToDisk(0, 0, camera(), faceOnDisk());
    expect(hit).not.toBeNull();
    expect(hit?.length()).toBeCloseTo(0, 5);
  });

  it('returns a point on the local disk plane (y = 0)', () => {
    const hit = pointerToDisk(0.3, -0.2, camera(), disk());
    expect(hit).not.toBeNull();
    expect(hit?.y).toBeCloseTo(0, 5);
  });

  it('maps screen right to local +x on a face-on disk', () => {
    const hit = pointerToDisk(0.5, 0, camera(), faceOnDisk());
    expect(hit?.x).toBeGreaterThan(0.5);
    expect(hit?.z).toBeCloseTo(0, 5);
  });

  it('returns null when the ray runs parallel to an edge-on disk', () => {
    // Untransformed disk: local XZ is the horizontal plane through the camera's eye line.
    expect(pointerToDisk(0, 0, camera(), new Object3D())).toBeNull();
  });

  it('returns null beyond MAX_REACH (a grazing hit far behind the disk)', () => {
    // A disk just below the eye line: a ray slightly below the centre meets it ~40 units away.
    const low = new Object3D();
    low.position.set(0, -0.3, 0);
    expect(pointerToDisk(0, -0.02, camera(), low)).toBeNull();
  });
});

describe('stepMouseField', () => {
  it('stays off while nothing points at the disk', () => {
    const state = createMouseFieldState();
    for (let i = 0; i < 60; i += 1) stepMouseField(state, { target: null, speed: 0, delta: FRAME });
    expect(state.amount).toBe(0);
    expect(state.position.x).toBe(MOUSE_PARKED);
  });

  it('snaps to the pointer when it appears, then fades in', () => {
    const state = createMouseFieldState();
    const target = new Vector3(1, 0, -0.5);
    stepMouseField(state, { target, speed: 0, delta: FRAME });
    expect(state.position.toArray()).toEqual([1, 0, -0.5]);
    const first = state.amount;
    expect(first).toBeGreaterThan(0);
    for (let i = 0; i < 120; i += 1) stepMouseField(state, { target, speed: 0, delta: FRAME });
    expect(state.amount).toBeGreaterThan(first);
    expect(state.amount).toBeCloseTo(MOUSE_FIELD.IDLE_AMOUNT, 2);
  });

  it('trails a moving pointer (inertia) and catches up', () => {
    const state = createMouseFieldState();
    stepMouseField(state, { target: new Vector3(0, 0, 0), speed: 0, delta: FRAME });
    const target = new Vector3(1, 0, 0);
    stepMouseField(state, { target, speed: 0, delta: FRAME });
    expect(state.position.x).toBeGreaterThan(0);
    expect(state.position.x).toBeLessThan(0.2);
    for (let i = 0; i < 120; i += 1) stepMouseField(state, { target, speed: 0, delta: FRAME });
    expect(state.position.x).toBeCloseTo(1, 3);
  });

  it('pushes harder while the pointer moves, and the boost decays after it stops', () => {
    const state = createMouseFieldState();
    const target = new Vector3();
    for (let i = 0; i < 120; i += 1) stepMouseField(state, { target, speed: 0, delta: FRAME });
    const resting = state.amount;

    stepMouseField(state, { target, speed: MOUSE_FIELD.FULL_SPEED * 2, delta: FRAME });
    expect(state.motion).toBe(1);
    expect(state.amount).toBeCloseTo(1, 2);

    for (let i = 0; i < 180; i += 1) stepMouseField(state, { target, speed: 0, delta: FRAME });
    expect(state.amount).toBeCloseTo(resting, 2);
  });

  it('fades out and switches off after the pointer leaves', () => {
    const state = createMouseFieldState();
    const target = new Vector3();
    for (let i = 0; i < 60; i += 1) stepMouseField(state, { target, speed: 1, delta: FRAME });
    for (let i = 0; i < 10; i += 1) stepMouseField(state, { target: null, speed: 0, delta: FRAME });
    expect(state.amount).toBeGreaterThan(0);
    for (let i = 0; i < 120; i += 1)
      stepMouseField(state, { target: null, speed: 0, delta: FRAME });
    expect(state.amount).toBe(0);
  });

  it('is frame-rate independent', () => {
    const run = (delta: number): number => {
      const state = createMouseFieldState();
      stepMouseField(state, { target: new Vector3(), speed: 0, delta });
      const target = new Vector3(1, 0, 0);
      const steps = Math.round(0.25 / delta);
      for (let i = 0; i < steps; i += 1) stepMouseField(state, { target, speed: 0, delta });
      return state.position.x;
    };
    expect(run(1 / 40)).toBeCloseTo(run(1 / 120), 6);
  });
});

describe('attachMouseField', () => {
  function setup(present = true) {
    let callback: FrameCallback | null = null;
    let order: number | undefined;
    let travel = 0;
    const loop = {
      subscribe(cb: FrameCallback, options?: SubscribeOptions) {
        callback = cb;
        order = options?.order;
        return () => {
          callback = null;
        };
      },
    };
    const pointer = {
      present,
      ndcX: 0,
      ndcY: 0,
      takeTravel: () => {
        const value = travel;
        travel = 0;
        return value;
      },
    };
    const inputs = {
      uMouse: { value: new Vector3(MOUSE_PARKED, MOUSE_PARKED, MOUSE_PARKED) },
      uMouseAmount: { value: 0 },
    };
    const field = attachMouseField({
      pointer,
      loop,
      camera: camera(),
      object: faceOnDisk(),
      inputs,
      viewportHeight: () => 800,
    });
    const frame = (delta = FRAME): void => callback?.({ delta, time: 0, frame: 0 });
    return {
      field,
      inputs,
      pointer,
      frame,
      move: (px: number) => (travel += px),
      subscribed: () => callback !== null,
      order: () => order,
    };
  }

  it('runs before the simulation steps', () => {
    expect(setup().order()).toBe(MOUSE_FIELD_ORDER);
    expect(MOUSE_FIELD_ORDER).toBeLessThan(VORTEX_SIMULATION_ORDER);
  });

  it('writes the field into the simulation inputs', () => {
    const { inputs, frame } = setup();
    for (let i = 0; i < 30; i += 1) frame();
    expect(inputs.uMouse.value.length()).toBeCloseTo(0, 4);
    expect(inputs.uMouseAmount.value).toBeGreaterThan(0);
  });

  it('turns pointer travel into a motion boost', () => {
    const { inputs, frame, move } = setup();
    for (let i = 0; i < 60; i += 1) frame();
    const resting = inputs.uMouseAmount.value;
    move(40);
    frame();
    expect(inputs.uMouseAmount.value).toBeGreaterThan(resting);
  });

  it('ignores frames with delta 0 but still drops their travel', () => {
    const { inputs, frame, move } = setup();
    move(500);
    frame(0);
    expect(inputs.uMouseAmount.value).toBe(0);
    frame();
    // The travel from the paused frame is gone: no full boost on the first real frame.
    expect(inputs.uMouseAmount.value).toBeLessThan(MOUSE_FIELD.IDLE_AMOUNT);
  });

  it('keeps the field parked while the pointer is absent', () => {
    const { inputs, frame } = setup(false);
    for (let i = 0; i < 30; i += 1) frame();
    expect(inputs.uMouseAmount.value).toBe(0);
    expect(inputs.uMouse.value.x).toBe(MOUSE_PARKED);
  });

  it('unsubscribes and parks the field on dispose', () => {
    const { field, inputs, frame, subscribed } = setup();
    for (let i = 0; i < 30; i += 1) frame();
    field.dispose();
    expect(subscribed()).toBe(false);
    expect(inputs.uMouseAmount.value).toBe(0);
    expect(inputs.uMouse.value.x).toBe(MOUSE_PARKED);
  });
});
