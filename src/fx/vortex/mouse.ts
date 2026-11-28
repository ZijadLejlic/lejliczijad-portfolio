// The vortex mouse field (P1.FX.10, tech.md §7.3). Once per frame, before the simulation steps, it
// turns the pointer (src/fx/core/input.ts) into the simulation's mouse uniforms:
//
//   1. world position: a ray from the camera through the pointer, intersected with the disk plane
//      in the particles' local space (the disk is tilted, and the simulation works in local space);
//   2. inertia: the field follows that point with an exponential lag, so it trails the cursor;
//   3. amount: presence (fades in and out as the pointer enters or leaves) × a motion boost, so a
//      resting cursor only parts the dust softly and a moving one pushes it harder.
//
// The vortex-velocity pass repels particles inside `uMouseRadius` with strength
// MOUSE_PUSH × uMouseStrength (FX state) × uMouseAmount (this module). The values are tuned to be
// visible without pulling the eye away from text (prd.md §6.1).

import {
  Matrix4,
  Plane,
  Ray,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
} from 'three';

import type { PointerSnapshot } from '../core/input';
import type { RenderLoop } from '../core/loop';
import { MOUSE_PARKED, VORTEX_SIMULATION_ORDER, type VortexInputs } from './simulation';

export const MOUSE_FIELD = {
  /** How fast the field catches up with the pointer (1/s). Lower = more inertia. */
  FOLLOW_RATE: 7,
  /** How fast presence fades in and out (1/s). */
  PRESENCE_RATE: 5,
  /** Amount while the pointer rests: a soft, steady hole in the dust. */
  IDLE_AMOUNT: 0.25,
  /** Pointer speed (viewport heights per second) that gives the full motion boost. */
  FULL_SPEED: 1.5,
  /** How fast the motion boost decays once the pointer slows down (1/s); it rises at once. */
  MOTION_DECAY: 3,
  /** Hits farther than this from the disk centre (world units) count as "not over the vortex". */
  MAX_REACH: 6,
  /** Below this amount the field is parked, so the shader skips the work. */
  EPSILON: 1e-3,
} as const;

/** Loop order: after the FX state tween (−200), before the simulation (−100). */
export const MOUSE_FIELD_ORDER = VORTEX_SIMULATION_ORDER - 50;

export interface MouseFieldState {
  /** Smoothed world position in the particles' local space. */
  position: Vector3;
  presence: number;
  motion: number;
  /** presence × (IDLE_AMOUNT + (1 − IDLE_AMOUNT) × motion). */
  amount: number;
}

export function createMouseFieldState(): MouseFieldState {
  return {
    position: new Vector3(MOUSE_PARKED, MOUSE_PARKED, MOUSE_PARKED),
    presence: 0,
    motion: 0,
    amount: 0,
  };
}

export interface MouseFieldFrame {
  /** Pointer hit on the disk plane (local space), or `null` when there is none. */
  target: Vector3 | null;
  /** Pointer speed this frame in viewport heights per second. */
  speed: number;
  /** Seconds; > 0. */
  delta: number;
}

/** Frame-rate independent blend factor for a rate in 1/s. */
function follow(rate: number, delta: number): number {
  return 1 - Math.exp(-rate * delta);
}

/** Advances the field by one frame. Pure apart from mutating `state`, for tests. */
export function stepMouseField(state: MouseFieldState, frame: MouseFieldFrame): MouseFieldState {
  const { target, speed, delta } = frame;
  const { FOLLOW_RATE, PRESENCE_RATE, IDLE_AMOUNT, FULL_SPEED, MOTION_DECAY, EPSILON } =
    MOUSE_FIELD;

  if (target) {
    // Entering from nothing: start at the pointer, not swept in from where it last was.
    if (state.presence < EPSILON) state.position.copy(target);
    else state.position.lerp(target, follow(FOLLOW_RATE, delta));
  }
  state.presence += ((target ? 1 : 0) - state.presence) * follow(PRESENCE_RATE, delta);

  const boost = Math.min(Math.max(speed / FULL_SPEED, 0), 1);
  state.motion =
    boost >= state.motion
      ? boost
      : state.motion + (boost - state.motion) * follow(MOTION_DECAY, delta);

  const amount = state.presence * (IDLE_AMOUNT + (1 - IDLE_AMOUNT) * state.motion);
  state.amount = amount < EPSILON ? 0 : amount;
  return state;
}

const raycaster = new Raycaster();
const ndc = new Vector2();
const inverse = new Matrix4();
const localRay = new Ray();
// The disk lies in the particles' local XZ plane (y = 0).
const DISK_PLANE = new Plane(new Vector3(0, 1, 0), 0);

/**
 * Where the pointer at (`x`, `y`) in NDC meets the disk plane, in `object`'s local space; `null`
 * if the ray misses the plane (looks away from it) or the hit is beyond MAX_REACH.
 */
export function pointerToDisk(
  x: number,
  y: number,
  camera: Camera,
  object: Object3D,
  out = new Vector3(),
): Vector3 | null {
  camera.updateMatrixWorld();
  object.updateMatrixWorld();
  raycaster.setFromCamera(ndc.set(x, y), camera);
  localRay.copy(raycaster.ray).applyMatrix4(inverse.copy(object.matrixWorld).invert());
  const hit = localRay.intersectPlane(DISK_PLANE, out);
  if (!hit || hit.length() > MOUSE_FIELD.MAX_REACH) return null;
  return hit;
}

export interface MouseFieldOptions {
  pointer: PointerSnapshot & { takeTravel: () => number };
  loop: Pick<RenderLoop, 'subscribe'>;
  camera: Camera;
  /** The drawn particles (their local space is the simulation's space). */
  object: Object3D;
  inputs: Pick<VortexInputs, 'uMouse' | 'uMouseAmount'>;
  /** Viewport height in CSS px, to turn pointer travel into a speed. */
  viewportHeight: () => number;
}

export interface MouseField {
  readonly state: Readonly<MouseFieldState>;
  dispose: () => void;
}

/** Subscribes the field to the loop; the owner disposes it with the simulation. */
export function attachMouseField(options: MouseFieldOptions): MouseField {
  const { pointer, loop, camera, object, inputs, viewportHeight } = options;
  const state = createMouseFieldState();
  const hit = new Vector3();

  const park = (): void => {
    inputs.uMouse.value.set(MOUSE_PARKED, MOUSE_PARKED, MOUSE_PARKED);
    inputs.uMouseAmount.value = 0;
  };

  const unsubscribe = loop.subscribe(
    ({ delta }) => {
      // Travel is read every frame, so a pause does not turn into one huge jump afterwards.
      const travel = pointer.takeTravel();
      if (!(delta > 0)) return;
      const target = pointer.present
        ? pointerToDisk(pointer.ndcX, pointer.ndcY, camera, object, hit)
        : null;
      const speed = travel / Math.max(viewportHeight(), 1) / delta;
      stepMouseField(state, { target, speed, delta });
      if (state.amount === 0) {
        park();
        return;
      }
      inputs.uMouse.value.copy(state.position);
      inputs.uMouseAmount.value = state.amount;
    },
    { order: MOUSE_FIELD_ORDER },
  );

  return {
    state,
    dispose() {
      unsubscribe();
      park();
    },
  };
}
