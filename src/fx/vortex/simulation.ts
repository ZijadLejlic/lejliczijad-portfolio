// The vortex particle simulation (P1.FX.08, tech.md §7.3). Positions and velocities live in two
// float textures that GPUComputationRenderer ping-pongs between render targets; one texel is one
// particle, so the texture size per tier is the particle count (tech.md §7.2).
//
// What it owns: the compute renderer, its render targets and shaders, the seed data, and one loop
// subscription that advances the simulation once per frame before anything draws. What it does
// not own: drawing (particles.ts reads `positionTexture`), the scene and camera, the state tween
// (the owner calls `state.update(delta)`; this module only copies `state.values` into uniforms) and
// input (`inputs.uMouse` / `uMouseAmount` are written by the mouse field, vortex/mouse.ts, P1.FX.10;
// `uScrollVel` by P1.FX.11).
//
// Lifecycle: building is asynchronous and split into short tasks (seed data in chunks, then shader
// compilation), so no task blocks the main thread for long (AGENTS.md §6.4: never > 50 ms).
// `ready` resolves when the first build can draw; until then `positionTexture` is `null`.
// `setQuality()` rebuilds at the new tier's size (adaptive quality), the renderer's `restored`
// event rebuilds everything that only lived on the GPU, and `dispose()` frees it all. A rebuild
// that is overtaken by another one (or by `dispose()`) is dropped before it touches the GPU.
// `static` never creates a simulation: the owner shows the poster instead (tech.md §7.6).

import {
  DataTexture,
  FloatType,
  HalfFloatType,
  RGBAFormat,
  Vector3,
  type IUniform,
  type Texture,
  type TextureDataType,
  type WebGLRenderer,
} from 'three';
import { GPUComputationRenderer, type Variable } from 'three/addons/misc/GPUComputationRenderer.js';

import type { FloatRenderTarget } from '../core/capabilities';
import type { RenderLoop } from '../core/loop';
import type { FxRenderer, RenderQuality } from '../core/renderer';
import { STATE_PRESETS, type StateController, type StateUniform } from '../core/state';
import curlNoiseGlsl from '../shaders/curl-noise.glsl?raw';
import commonGlsl from '../shaders/vortex-common.glsl?raw';
import positionGlsl from '../shaders/vortex-position.glsl?raw';
import velocityGlsl from '../shaders/vortex-velocity.glsl?raw';

// --- Sizes per tier (tech.md §7.2) -----------------------------------------------------------------

export interface SimulationSize {
  width: number;
  height: number;
}

/** Simulation texture size per tier; width × height = particles. */
export const SIMULATION_SIZE: Readonly<Record<RenderQuality, Readonly<SimulationSize>>> = {
  high: { width: 512, height: 256 },
  medium: { width: 256, height: 256 },
  low: { width: 128, height: 128 },
};

export function particleCount(quality: RenderQuality): number {
  const { width, height } = SIMULATION_SIZE[quality];
  return width * height;
}

/** Render targets per `capabilities().floatRenderTarget`: full float where it can be rendered to. */
export function textureDataType(kind: Exclude<FloatRenderTarget, 'none'>): TextureDataType {
  return kind === 'float' ? FloatType : HalfFloatType;
}

/** Loop order: before drawing (0) and after the state tween the owner runs earlier. */
export const VORTEX_SIMULATION_ORDER = -100;

// --- Shape and forces ------------------------------------------------------------------------------

/**
 * World-space shape and force constants. Seeding (below) and the shaders (as defines) both read
 * them, so the disk the particles start in is the disk they respawn into. Values are a first
 * visual pass against the Dust Vortex reference and the hero mockup C (`inner 0.8`, `outer 2.6`);
 * Zijad tunes them in review.
 */
export const VORTEX = {
  /** Seeded particles fill the disk between these radii. */
  INNER_RADIUS: 0.35,
  OUTER_RADIUS: 2.6,
  /** Respawned particles enter on the rim band [SPAWN_INNER, OUTER_RADIUS]. */
  SPAWN_INNER: 2.2,
  /** Particles are pulled towards this ring, so they drift inwards from the rim. */
  RING_RADIUS: 1.2,
  /** Disk thickness at spawn (world units, full height). */
  THICKNESS: 0.14,
  /** Beyond this distance from the centre a particle respawns (thrown out by the mouse). */
  ESCAPE_RADIUS: 8,
  /** Tangential speed = SWIRL_SPEED / r, capped at SWIRL_MAX (units/s); applied as a rotation. */
  SWIRL_SPEED: 0.9,
  SWIRL_MAX: 1.2,
  SWIRL_MIN_RADIUS: 0.3,
  /** Constant drift towards the axis (units/s): particles spiral in from the rim to the core. */
  INFLOW: 0.07,
  /** Pull strengths towards the ring (radial) and the disk plane (height), per second. */
  RING_PULL: 0.04,
  HEIGHT_PULL: 1.5,
  /** Curl noise: spatial frequency, upward drift of the field per second, speed it adds. */
  NOISE_SCALE: 0.7,
  NOISE_DRIFT: 0.04,
  NOISE_SPEED: 0.06,
  /** Pull to the centre at uAttract = 1 (page transition "swallow"). */
  ATTRACT_PULL: 1.5,
  /** How fast the drift velocity follows the desired drift (1/s); higher = stiffer. */
  RESPONSE: 2,
  /** Mouse impulse at the centre of its field (units/s²) at uMouseStrength = 1. */
  MOUSE_PUSH: 3.5,
  /** Lifespan range in seconds; each particle gets a fixed random value. */
  LIFESPAN_MIN: 6,
  LIFESPAN_MAX: 20,
} as const;

/** Octaves of curl noise (tech.md §7.3: 2–3); each costs three noise samples per particle. */
export const CURL_OCTAVES = 2;

/** Mouse field radius (world units, P1.FX.10): about a fifth of the disk's radius. */
export const DEFAULT_MOUSE_RADIUS = 0.6;

/** Where `uMouse` sits until input writes it: far outside the scene, so the field does nothing. */
export const MOUSE_PARKED = 1e3;

/** A JS number as a GLSL float literal (`2` would be an int and fail in float expressions). */
export function glslFloat(value: number): string {
  if (!Number.isFinite(value)) throw new Error(`Not a finite GLSL float: ${value}`);
  const text = String(value);
  return /[.e]/.test(text) ? text : `${text}.0`;
}

/** Defines for both passes: every VORTEX constant as a float, plus the octave count. */
export function vortexDefines(): Record<string, string> {
  const defines: Record<string, string> = { CURL_OCTAVES: String(CURL_OCTAVES) };
  for (const [name, value] of Object.entries(VORTEX)) defines[name] = glslFloat(value);
  return defines;
}

/** Swirl angular speed (rad/s) at distance `r` from the axis; same as swirlAngularSpeed() in GLSL. */
export function swirlAngularSpeed(r: number, swirl = 1): number {
  const radius = Math.max(r, VORTEX.SWIRL_MIN_RADIUS);
  return (Math.min(VORTEX.SWIRL_SPEED / radius, VORTEX.SWIRL_MAX) / radius) * swirl;
}

export interface SeedData {
  /** RGBA per particle: xyz position, w life in (0, 1]. */
  position: Float32Array;
  /** RGBA per particle: xyz drift velocity (starts at 0), w life rate (1 / lifespan in seconds). */
  velocity: Float32Array;
}

/** Particles seeded per task: ~5 ms on an M-series laptop, so slow phones stay well under 50 ms. */
export const SEED_CHUNK = 32_768;

/** Life never starts at 0, or the particle would respawn on the very first step. */
const MIN_LIFE = 0.001;

/** Fills particles [start, end) of `data`. Split out so seeding can yield between chunks. */
export function seedRange(
  data: SeedData,
  start: number,
  end: number,
  random: () => number = Math.random,
): void {
  const { position, velocity } = data;
  const { INNER_RADIUS, OUTER_RADIUS, THICKNESS, LIFESPAN_MIN, LIFESPAN_MAX } = VORTEX;

  for (let i = start; i < end; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = INNER_RADIUS + (OUTER_RADIUS - INNER_RADIUS) * random();
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const lifespan = LIFESPAN_MIN + (LIFESPAN_MAX - LIFESPAN_MIN) * random();
    const o = i * 4;
    position[o] = x;
    position[o + 1] = (random() - 0.5) * THICKNESS;
    position[o + 2] = z;
    position[o + 3] = Math.max(1 - random(), MIN_LIFE);
    velocity[o + 3] = 1 / lifespan;
  }
}

/**
 * The first state of `count` particles: spread over the whole disk, with no drift yet and random
 * remaining lives so they do not all respawn at once. Pure; `random` is injectable for tests.
 */
export function seedParticles(count: number, random: () => number = Math.random): SeedData {
  const data = { position: new Float32Array(count * 4), velocity: new Float32Array(count * 4) };
  seedRange(data, 0, count, random);
  return data;
}

/** Like `seedParticles()`, but yields to the browser after every SEED_CHUNK particles. */
export async function seedParticlesInChunks(
  count: number,
  random: () => number,
  yieldTask: () => Promise<void>,
  chunk = SEED_CHUNK,
): Promise<SeedData> {
  const data = { position: new Float32Array(count * 4), velocity: new Float32Array(count * 4) };
  for (let start = 0; start < count; start += chunk) {
    seedRange(data, start, Math.min(start + chunk, count), random);
    await yieldTask();
  }
  return data;
}

// --- Simulation ------------------------------------------------------------------------------------

/** The part of GPUComputationRenderer the simulation uses, so tests can pass a fake. */
export type ComputeLike = Pick<
  GPUComputationRenderer,
  | 'setDataType'
  | 'addVariable'
  | 'setVariableDependencies'
  | 'init'
  | 'compute'
  | 'getCurrentRenderTarget'
  | 'dispose'
>;

export interface SimulationDeps {
  createCompute: (width: number, height: number, renderer: WebGLRenderer) => ComputeLike;
  random: () => number;
  /** Resolves in a later task, so the browser can paint and handle input in between. */
  yieldTask: () => Promise<void>;
}

/** A new macrotask. MessageChannel avoids setTimeout's ≥ 4 ms clamp on nested timers. */
function yieldTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

export const browserSimulationDeps: SimulationDeps = {
  createCompute: (width, height, renderer) => new GPUComputationRenderer(width, height, renderer),
  random: Math.random,
  yieldTask,
};

/** Input-driven uniforms. The same objects are put into every rebuild, so writers keep working. */
export interface VortexInputs {
  uMouse: IUniform<Vector3>;
  uMouseRadius: IUniform<number>;
  /** 0 … 1: pointer presence × motion boost (vortex/mouse.ts). 0 = no field. */
  uMouseAmount: IUniform<number>;
  uScrollVel: IUniform<number>;
}

export interface VortexSimulationOptions {
  renderer: Pick<FxRenderer, 'three' | 'status' | 'on'>;
  loop: Pick<RenderLoop, 'subscribe'>;
  quality: RenderQuality;
  /** `capabilities().floatRenderTarget`; `none` never reaches here (it decides `static`). */
  floatRenderTarget: Exclude<FloatRenderTarget, 'none'>;
  /** FX state; without one the idle preset is used. The owner runs `state.update()` each frame. */
  state?: Pick<StateController, 'writeUniforms'>;
  deps?: SimulationDeps;
}

export interface VortexSimulation {
  readonly quality: RenderQuality;
  readonly size: Readonly<SimulationSize>;
  readonly count: number;
  /** Increases on every (re)build; drawers compare it to know when to rebuild their geometry. */
  readonly generation: number;
  /** Resolves when the first build is ready to draw; rejects if it cannot start. */
  readonly ready: Promise<void>;
  /** True while a (re)build is in progress. */
  readonly building: boolean;
  /** Latest positions (xyz, w = life), or `null` while building and after `dispose()`. */
  readonly positionTexture: Texture | null;
  readonly velocityTexture: Texture | null;
  readonly inputs: VortexInputs;
  readonly disposed: boolean;
  /** Steps taken since the last (re)build, for tests and the debug panel. */
  readonly steps: number;
  /** Rebuilds at the new tier's size. Particles restart from a fresh seed. */
  setQuality: (quality: RenderQuality) => void;
  dispose: () => void;
}

type Uniforms = Record<string, IUniform>;

interface Build {
  compute: ComputeLike;
  position: Variable;
  velocity: Variable;
}

const STATE_DEFAULTS = STATE_PRESETS.idle;

function stateUniforms(): Record<StateUniform, IUniform<number>> {
  return {
    uSpeed: { value: STATE_DEFAULTS.uSpeed },
    uSwirl: { value: STATE_DEFAULTS.uSwirl },
    uNoiseAmp: { value: STATE_DEFAULTS.uNoiseAmp },
    uDim: { value: STATE_DEFAULTS.uDim },
    uAttract: { value: STATE_DEFAULTS.uAttract },
    uMouseStrength: { value: STATE_DEFAULTS.uMouseStrength },
  };
}

function dataTexture(data: Float32Array, size: SimulationSize): DataTexture {
  // Seeds are always full float: only the render targets drop to half float on weaker GPUs, and
  // the pass-through copy in init() converts.
  const texture = new DataTexture(data, size.width, size.height, RGBAFormat, FloatType);
  texture.needsUpdate = true;
  return texture;
}

/** A rebuild after start-up has no caller to reject to; it leaves the vortex empty (dev log only). */
function reportRebuildError(error: unknown): void {
  if (import.meta.env.DEV) console.error(error);
}

/**
 * Creates the simulation and subscribes it to the loop. The particles appear once `ready`
 * resolves; `ready` rejects if the compute renderer cannot initialize (e.g. no vertex texture
 * units), and the caller keeps the poster.
 */
export function createVortexSimulation(options: VortexSimulationOptions): VortexSimulation {
  const { renderer, loop, state, floatRenderTarget } = options;
  const deps = options.deps ?? browserSimulationDeps;
  const defines = vortexDefines();

  // State values and time are shared by both passes; one object per uniform keeps them in sync.
  const shared = { ...stateUniforms(), uDelta: { value: 0 }, uTime: { value: 0 } };
  const inputs: VortexInputs = {
    uMouse: { value: new Vector3(MOUSE_PARKED, MOUSE_PARKED, MOUSE_PARKED) },
    uMouseRadius: { value: DEFAULT_MOUSE_RADIUS },
    uMouseAmount: { value: 0 },
    uScrollVel: { value: 0 },
  };

  let quality = options.quality;
  let build: Build | null = null;
  let generation = 0;
  let steps = 0;
  let disposed = false;
  // Increases when a build starts; an older build that finishes later is thrown away.
  let request = 0;
  let building = false;

  async function create(target: RenderQuality, isCurrent: () => boolean): Promise<Build | null> {
    const size = SIMULATION_SIZE[target];
    const seed = await seedParticlesInChunks(size.width * size.height, deps.random, deps.yieldTask);
    if (!isCurrent()) return null;

    // From here on everything runs in this one task: creating the passes, compiling the pass-through
    // shader and uploading the seed (init()). The two pass shaders compile on the first step.
    const compute = deps.createCompute(size.width, size.height, renderer.three);
    compute.setDataType(textureDataType(floatRenderTarget));
    // Velocity first: compute() runs passes in this order, and both read the previous step.
    const velocity = compute.addVariable(
      'textureVelocity',
      `${commonGlsl}\n${curlNoiseGlsl}\n${velocityGlsl}`,
      dataTexture(seed.velocity, size),
    );
    const position = compute.addVariable(
      'texturePosition',
      `${commonGlsl}\n${positionGlsl}`,
      dataTexture(seed.position, size),
    );
    compute.setVariableDependencies(velocity, [velocity, position]);
    compute.setVariableDependencies(position, [velocity, position]);

    for (const variable of [velocity, position]) {
      Object.assign(variable.material.defines, defines);
    }
    const velocityUniforms: Uniforms = velocity.material.uniforms;
    const positionUniforms: Uniforms = position.material.uniforms;
    Object.assign(velocityUniforms, shared, inputs);
    positionUniforms.uDelta = shared.uDelta;
    positionUniforms.uTime = shared.uTime;
    positionUniforms.uSpeed = shared.uSpeed;
    positionUniforms.uSwirl = shared.uSwirl;
    positionUniforms.uScrollVel = inputs.uScrollVel;

    const error = compute.init();
    if (error !== null) {
      compute.dispose();
      throw new Error(`Vortex simulation could not start: ${error}`);
    }
    return { compute, position, velocity };
  }

  /** Frees the current build and starts a new one; resolves when the new one is in place. */
  async function rebuild(): Promise<void> {
    request += 1;
    const mine = request;
    const isCurrent = (): boolean => !disposed && mine === request;
    // The old state is useless from here on (wrong size, or a restored context with empty targets).
    build?.compute.dispose();
    build = null;
    building = true;
    try {
      const next = await create(quality, isCurrent);
      if (!next) return;
      if (!isCurrent()) {
        next.compute.dispose();
        return;
      }
      build = next;
      generation += 1;
      steps = 0;
    } finally {
      if (mine === request) building = false;
    }
  }

  const ready = rebuild();
  // A failed start is reported through `ready`; this only keeps it from being "unhandled" twice.
  ready.catch(() => undefined);

  const unsubscribe = loop.subscribe(
    ({ delta, time }) => {
      // Delta 0 is the first frame after a start or pause: nothing to integrate.
      if (!build || !(delta > 0) || renderer.status !== 'ready') return;
      state?.writeUniforms(shared);
      shared.uDelta.value = delta;
      shared.uTime.value = time;
      build.compute.compute();
      steps += 1;
    },
    { order: VORTEX_SIMULATION_ORDER },
  );

  // A lost context takes the GPU objects with it. Drop the build now, while three's delete calls are
  // still harmless no-ops; disposing it after the restore would delete objects of the old context.
  const offLost = renderer.on('lost', () => {
    request += 1;
    building = false;
    build?.compute.dispose();
    build = null;
  });
  // A restored context has empty render targets: start again from a fresh seed.
  const offRestored = renderer.on('restored', () => {
    if (!disposed) void rebuild().catch(reportRebuildError);
  });

  return {
    ready,
    get building() {
      return building;
    },
    get quality() {
      return quality;
    },
    get size() {
      return SIMULATION_SIZE[quality];
    },
    get count() {
      return particleCount(quality);
    },
    get generation() {
      return generation;
    },
    get positionTexture() {
      return build ? build.compute.getCurrentRenderTarget(build.position).texture : null;
    },
    get velocityTexture() {
      return build ? build.compute.getCurrentRenderTarget(build.velocity).texture : null;
    },
    inputs,
    get disposed() {
      return disposed;
    },
    get steps() {
      return steps;
    },
    setQuality(next) {
      if (disposed || next === quality) return;
      quality = next;
      void rebuild().catch(reportRebuildError);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      request += 1;
      building = false;
      unsubscribe();
      offLost();
      offRestored();
      // Also frees the seed textures, the render targets and both pass materials.
      build?.compute.dispose();
      build = null;
    },
  };
}
