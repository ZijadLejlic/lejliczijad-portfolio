import { FloatType, HalfFloatType, type WebGLRenderer } from 'three';
import type { Variable } from 'three/addons/misc/GPUComputationRenderer.js';
import { describe, expect, it, vi } from 'vitest';

import type { FrameCallback, SubscribeOptions } from '@/fx/core/loop';
import type { FxRenderer, RendererEventMap } from '@/fx/core/renderer';
import curlNoiseGlsl from '@/fx/shaders/curl-noise.glsl?raw';
import commonGlsl from '@/fx/shaders/vortex-common.glsl?raw';
import positionGlsl from '@/fx/shaders/vortex-position.glsl?raw';
import velocityGlsl from '@/fx/shaders/vortex-velocity.glsl?raw';
import {
  CURL_OCTAVES,
  SEED_CHUNK,
  SIMULATION_SIZE,
  VORTEX,
  VORTEX_SIMULATION_ORDER,
  createVortexSimulation,
  glslFloat,
  particleCount,
  seedParticles,
  seedParticlesInChunks,
  swirlAngularSpeed,
  textureDataType,
  vortexDefines,
  type ComputeLike,
  type SimulationDeps,
} from '@/fx/vortex/simulation';

// The simulation runs on an injected compute renderer, so its whole lifecycle (build, step,
// rebuild on tier change and context restore, dispose) runs in Node without WebGL. The shaders run
// for real in tests/e2e/fx-vortex.spec.ts on /_dev/fx?scene=vortex.

/** A deterministic PRNG (mulberry32), so seeds are reproducible. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('tiers (tech.md §7.2)', () => {
  it.each([
    ['high', 512, 256, 131_072],
    ['medium', 256, 256, 65_536],
    ['low', 128, 128, 16_384],
  ] as const)('%s simulates %i×%i = %i particles', (quality, width, height, count) => {
    expect(SIMULATION_SIZE[quality]).toEqual({ width, height });
    expect(particleCount(quality)).toBe(count);
  });

  it('renders to full float when it can, half float otherwise', () => {
    expect(textureDataType('float')).toBe(FloatType);
    expect(textureDataType('half')).toBe(HalfFloatType);
  });
});

describe('glslFloat', () => {
  it.each([
    [2, '2.0'],
    [0, '0.0'],
    [-3, '-3.0'],
    [0.5, '0.5'],
    [1e-7, '1e-7'],
    [1e21, '1e+21'],
  ])('%d → %s', (value, text) => {
    expect(glslFloat(value)).toBe(text);
  });

  it('rejects values GLSL cannot represent', () => {
    expect(() => glslFloat(Number.NaN)).toThrow();
    expect(() => glslFloat(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe('shader defines', () => {
  /** Names listed after "Defines:" in a shader's header comment. */
  function declaredDefines(source: string): string[] {
    const header = source.split('\n').filter((line) => line.startsWith('//'));
    const start = header.findIndex((line) => line.includes('Defines:'));
    if (start === -1) return [];
    const names: string[] = [];
    for (const line of header.slice(start)) {
      if (line !== header[start] && /^\/\/ \S+:/.test(line)) break;
      // "VORTEX" is the name of the TS object the values come from, not a define.
      names.push(...(line.match(/\b[A-Z][A-Z0-9_]+\b/g) ?? []).filter((name) => name !== 'VORTEX'));
    }
    return names;
  }

  it('defines every constant the shaders declare', () => {
    const defines = vortexDefines();
    const sources = [commonGlsl, curlNoiseGlsl, velocityGlsl, positionGlsl];
    const declared = sources.flatMap(declaredDefines);
    expect(declared.length).toBeGreaterThan(10);
    for (const name of declared) expect(defines, name).toHaveProperty(name);
  });

  it('passes every VORTEX constant as a float and the octave count as an int', () => {
    const defines = vortexDefines();
    for (const name of Object.keys(VORTEX)) expect(defines[name]).toMatch(/[.e]/);
    expect(defines.CURL_OCTAVES).toBe(String(CURL_OCTAVES));
    expect(CURL_OCTAVES).toBeGreaterThanOrEqual(2);
    expect(CURL_OCTAVES).toBeLessThanOrEqual(3);
  });
});

describe('swirlAngularSpeed', () => {
  it('turns faster near the axis (∝ 1/r², tangential speed ∝ 1/r)', () => {
    const r = 2;
    expect(swirlAngularSpeed(r) * r).toBeCloseTo(VORTEX.SWIRL_SPEED / r);
    expect(swirlAngularSpeed(1)).toBeGreaterThan(swirlAngularSpeed(2));
  });

  it('caps the tangential speed and clamps tiny radii', () => {
    const r = VORTEX.SWIRL_SPEED / VORTEX.SWIRL_MAX / 2;
    expect(swirlAngularSpeed(r) * r).toBeCloseTo(VORTEX.SWIRL_MAX);
    expect(swirlAngularSpeed(0)).toBe(swirlAngularSpeed(VORTEX.SWIRL_MIN_RADIUS));
    expect(Number.isFinite(swirlAngularSpeed(0))).toBe(true);
  });

  it('scales with swirl (state uSwirl, scroll)', () => {
    expect(swirlAngularSpeed(1.5, 2)).toBeCloseTo(swirlAngularSpeed(1.5) * 2);
  });
});

describe('seedParticles', () => {
  const COUNT = 5000;
  const seed = seedParticles(COUNT, prng(1));

  it('fills RGBA for every particle', () => {
    expect(seed.position).toHaveLength(COUNT * 4);
    expect(seed.velocity).toHaveLength(COUNT * 4);
  });

  it('places particles in the disk, with live particles and lifespans in range', () => {
    for (let i = 0; i < COUNT; i += 1) {
      const o = i * 4;
      const x = seed.position[o] ?? Number.NaN;
      const y = seed.position[o + 1] ?? Number.NaN;
      const z = seed.position[o + 2] ?? Number.NaN;
      const life = seed.position[o + 3] ?? Number.NaN;
      const rate = seed.velocity[o + 3] ?? Number.NaN;
      const r = Math.hypot(x, z);
      expect(r).toBeGreaterThanOrEqual(VORTEX.INNER_RADIUS - 1e-5);
      expect(r).toBeLessThanOrEqual(VORTEX.OUTER_RADIUS + 1e-5);
      expect(Math.abs(y)).toBeLessThanOrEqual(VORTEX.THICKNESS / 2);
      expect(life).toBeGreaterThan(0);
      expect(life).toBeLessThanOrEqual(1);
      expect(rate).toBeGreaterThanOrEqual(1 / VORTEX.LIFESPAN_MAX - 1e-6);
      expect(rate).toBeLessThanOrEqual(1 / VORTEX.LIFESPAN_MIN + 1e-6);
      // No drift yet: the swirl is a rotation in the position pass.
      expect([seed.velocity[o], seed.velocity[o + 1], seed.velocity[o + 2]]).toEqual([0, 0, 0]);
    }
  });

  it('spreads remaining lives, so particles do not all respawn together', () => {
    const lives = Array.from({ length: COUNT }, (_, i) => seed.position[i * 4 + 3] ?? 0);
    const early = lives.filter((life) => life < 0.25).length / COUNT;
    expect(early).toBeGreaterThan(0.15);
    expect(early).toBeLessThan(0.35);
  });

  it('is deterministic for a given random source', () => {
    expect(seedParticles(100, prng(7))).toEqual(seedParticles(100, prng(7)));
  });

  it('gives the same data in chunks, yielding once per chunk', async () => {
    const yieldTask = vi.fn(() => Promise.resolve());
    const chunked = await seedParticlesInChunks(1000, prng(3), yieldTask, 300);
    expect(chunked).toEqual(seedParticles(1000, prng(3)));
    expect(yieldTask).toHaveBeenCalledTimes(4);
  });

  it('keeps the high tier to a handful of chunks', () => {
    expect(Math.ceil(particleCount('high') / SEED_CHUNK)).toBeLessThanOrEqual(4);
  });
});

// --- Lifecycle with a fake compute renderer ---------------------------------------------------------

interface FakeCompute extends ComputeLike {
  size: { width: number; height: number };
  variables: Variable[];
  dependencies: Map<string, string[]>;
  computeCalls: number;
  disposed: boolean;
}

function fakeCompute(width: number, height: number, initError: string | null = null): FakeCompute {
  const variables: Variable[] = [];
  const fake: FakeCompute = {
    size: { width, height },
    variables,
    dependencies: new Map(),
    computeCalls: 0,
    disposed: false,
    setDataType: vi.fn(),
    addVariable: (name, shader, texture) => {
      const variable = {
        name,
        initialValueTexture: texture,
        material: {
          defines: { resolution: 'vec2(1.0, 1.0)' },
          uniforms: {},
          fragmentShader: shader,
        },
      } as unknown as Variable;
      variables.push(variable);
      return variable;
    },
    setVariableDependencies: (variable, deps) => {
      fake.dependencies.set(
        variable.name,
        (deps ?? []).map((dep) => dep.name),
      );
    },
    init: () => initError,
    compute: () => {
      fake.computeCalls += 1;
    },
    getCurrentRenderTarget: (variable) =>
      ({ texture: { name: variable.name } }) as unknown as ReturnType<
        ComputeLike['getCurrentRenderTarget']
      >,
    dispose: () => {
      fake.disposed = true;
    },
  };
  return fake;
}

function setup(options: { initError?: string } = {}) {
  const computes: FakeCompute[] = [];
  const deps: SimulationDeps = {
    createCompute: (width, height) => {
      const compute = fakeCompute(width, height, options.initError ?? null);
      computes.push(compute);
      return compute;
    },
    random: prng(42),
    yieldTask: () => Promise.resolve(),
  };

  const subscribers: Array<{ callback: FrameCallback; options?: SubscribeOptions }> = [];
  const unsubscribed = { count: 0 };
  const loop = {
    subscribe: (callback: FrameCallback, subscribeOptions?: SubscribeOptions) => {
      const entry = { callback, options: subscribeOptions };
      subscribers.push(entry);
      return () => {
        unsubscribed.count += 1;
        subscribers.splice(subscribers.indexOf(entry), 1);
      };
    },
  };

  const listeners = new Map<keyof RendererEventMap, Set<() => void>>();
  const on = (type: keyof RendererEventMap, listener: () => void): (() => void) => {
    const set = listeners.get(type) ?? new Set();
    listeners.set(type, set);
    set.add(listener);
    return () => set.delete(listener);
  };
  const renderer = {
    three: {} as WebGLRenderer,
    status: 'ready' as FxRenderer['status'],
    // The simulation only listens to payload-free events (lost, restored).
    on: on as unknown as FxRenderer['on'],
    emit(type: keyof RendererEventMap) {
      for (const listener of listeners.get(type) ?? []) listener();
    },
  };

  const state = {
    writeUniforms: vi.fn((uniforms: Partial<Record<string, { value: number }>>) => {
      const speed = uniforms.uSpeed;
      if (speed) speed.value = 2;
    }),
  };

  const simulation = createVortexSimulation({
    renderer,
    loop,
    quality: 'high',
    floatRenderTarget: 'half',
    state,
    deps,
  });

  const frame = (delta: number, time = 1): void => {
    for (const { callback } of [...subscribers]) callback({ delta, time, frame: 0 });
  };
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

  return { simulation, computes, subscribers, unsubscribed, renderer, state, frame, settle };
}

describe('createVortexSimulation', () => {
  it('builds the high tier with two ping-pong variables that depend on each other', async () => {
    const { simulation, computes } = setup();
    expect(simulation.building).toBe(true);
    expect(simulation.positionTexture).toBeNull();
    await simulation.ready;

    expect(simulation.building).toBe(false);
    expect(simulation.count).toBe(131_072);
    expect(simulation.generation).toBe(1);
    const compute = computes[0];
    expect(compute?.size).toEqual({ width: 512, height: 256 });
    expect(compute?.setDataType).toHaveBeenCalledWith(HalfFloatType);
    expect(compute?.variables.map((v) => v.name)).toEqual(['textureVelocity', 'texturePosition']);
    expect(compute?.dependencies.get('texturePosition')).toEqual([
      'textureVelocity',
      'texturePosition',
    ]);
    expect(compute?.dependencies.get('textureVelocity')).toEqual([
      'textureVelocity',
      'texturePosition',
    ]);
    expect(simulation.positionTexture).toEqual({ name: 'texturePosition' });
    expect(simulation.velocityTexture).toEqual({ name: 'textureVelocity' });
  });

  it('adds the shared chunks and every define to both passes', async () => {
    const { simulation, computes } = setup();
    await simulation.ready;
    for (const variable of computes[0]?.variables ?? []) {
      expect(variable.material.fragmentShader).toContain('needsRespawn');
      expect(variable.material.defines).toMatchObject(vortexDefines());
    }
    const [velocity, position] = computes[0]?.variables ?? [];
    expect(velocity?.material.fragmentShader).toContain('curlNoise');
    expect(position?.material.fragmentShader).not.toContain('curlNoise');
  });

  it('runs before drawing and steps only on real frames', async () => {
    const { simulation, computes, subscribers, frame } = setup();
    expect(subscribers[0]?.options?.order).toBe(VORTEX_SIMULATION_ORDER);
    expect(VORTEX_SIMULATION_ORDER).toBeLessThan(0);

    frame(0.016); // still building
    await simulation.ready;
    frame(0); // first frame after a start or pause
    expect(computes[0]?.computeCalls).toBe(0);
    frame(0.016, 3.5);
    frame(0.016, 3.516);
    expect(computes[0]?.computeCalls).toBe(2);
    expect(simulation.steps).toBe(2);
  });

  it('writes state, delta and time into the shared uniforms of both passes', async () => {
    const { simulation, computes, state, frame } = setup();
    await simulation.ready;
    frame(0.02, 4);
    expect(state.writeUniforms).toHaveBeenCalledTimes(1);
    const [velocity, position] = computes[0]?.variables ?? [];
    for (const variable of [velocity, position]) {
      expect(variable?.material.uniforms.uSpeed?.value).toBe(2);
      expect(variable?.material.uniforms.uDelta?.value).toBe(0.02);
      expect(variable?.material.uniforms.uTime?.value).toBe(4);
      expect(variable?.material.uniforms.uSwirl).toBe(velocity?.material.uniforms.uSwirl);
    }
    expect(velocity?.material.uniforms.uMouse).toBe(simulation.inputs.uMouse);
    expect(position?.material.uniforms.uScrollVel).toBe(simulation.inputs.uScrollVel);
  });

  it('does not step while the context is not ready', async () => {
    const { simulation, computes, renderer, frame } = setup();
    await simulation.ready;
    renderer.status = 'lost';
    frame(0.016);
    expect(computes[0]?.computeCalls).toBe(0);
  });

  it('rebuilds at the new size on a tier change and frees the old build', async () => {
    const { simulation, computes, settle } = setup();
    await simulation.ready;
    simulation.inputs.uScrollVel.value = 0.4;

    simulation.setQuality('low');
    expect(computes[0]?.disposed).toBe(true);
    expect(simulation.positionTexture).toBeNull();
    await settle();

    expect(simulation.quality).toBe('low');
    expect(simulation.count).toBe(16_384);
    expect(computes[1]?.size).toEqual({ width: 128, height: 128 });
    expect(simulation.generation).toBe(2);
    // Input uniforms survive the rebuild.
    expect(computes[1]?.variables[1]?.material.uniforms.uScrollVel?.value).toBe(0.4);

    simulation.setQuality('low');
    expect(computes).toHaveLength(2);
  });

  it('keeps only the latest of overlapping rebuilds', async () => {
    const { simulation, computes, settle } = setup();
    await simulation.ready;
    simulation.setQuality('medium');
    simulation.setQuality('low');
    await settle();
    expect(computes.map((c) => c.size.width)).toEqual([512, 128]);
    expect(simulation.quality).toBe('low');
    expect(simulation.generation).toBe(2);
  });

  it('drops the build on context loss and rebuilds from a fresh seed on restore', async () => {
    const { simulation, computes, renderer, settle } = setup();
    await simulation.ready;

    renderer.emit('lost');
    expect(computes[0]?.disposed).toBe(true);
    expect(simulation.positionTexture).toBeNull();

    renderer.emit('restored');
    await settle();
    expect(computes).toHaveLength(2);
    expect(computes[1]?.size).toEqual({ width: 512, height: 256 });
    expect(simulation.positionTexture).not.toBeNull();
  });

  it('rejects `ready` and frees the compute renderer when it cannot start', async () => {
    const { simulation, computes } = setup({ initError: 'No support for vertex shader textures.' });
    await expect(simulation.ready).rejects.toThrow(/vertex shader textures/);
    expect(computes[0]?.disposed).toBe(true);
    expect(simulation.positionTexture).toBeNull();
  });

  it('frees everything on dispose and ignores later events', async () => {
    const { simulation, computes, unsubscribed, renderer, settle } = setup();
    await simulation.ready;
    simulation.dispose();
    expect(simulation.disposed).toBe(true);
    expect(unsubscribed.count).toBe(1);
    expect(computes[0]?.disposed).toBe(true);
    expect(simulation.positionTexture).toBeNull();

    renderer.emit('restored');
    simulation.setQuality('low');
    await settle();
    expect(computes).toHaveLength(1);
    simulation.dispose();
    expect(unsubscribed.count).toBe(1);
  });

  it('never touches the GPU when disposed before the first build finishes', async () => {
    const { simulation, computes, settle } = setup();
    simulation.dispose();
    await settle();
    expect(computes).toHaveLength(0);
  });
});
