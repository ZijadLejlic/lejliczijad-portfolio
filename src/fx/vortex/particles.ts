// Draws the vortex simulation as points (P1.FX.08 wiring, P1.FX.09 look): soft white/grey dots
// sized and faded by depth, ~3 % accent blue particles, a few larger dust motes, additive blending.
//
// One vertex per particle; the vertex shader reads its position from the simulation texture, so
// nothing is copied back to the CPU. The geometry only changes when the simulation is rebuilt at a
// different size (adaptive quality).

import {
  AdditiveBlending,
  BufferAttribute,
  Vector3,
  BufferGeometry,
  Points,
  ShaderMaterial,
  type IUniform,
  type Texture,
} from 'three';

import type { StateController } from '../core/state';
import fragmentShader from '../shaders/vortex-points.frag.glsl?raw';
import vertexShader from '../shaders/vortex-points.vert.glsl?raw';
import type { SimulationSize, VortexSimulation } from './simulation';

/**
 * Look of the vortex particles (P1.FX.09). Sizes are px before DPR; the dev camera sits ~6.5 units
 * from the disk, so a plain particle is ~1–1.5 CSS px.
 */
export const PARTICLE_LOOK = {
  /** Point size in px at view depth 1. */
  POINT_SIZE: 7.5,
  /** Cap for particles that come close to the camera, so none turns into a blob. */
  MAX_POINT_SIZE: 6,
  /** Peak alpha of one dot; additive blending builds density where particles overlap. */
  OPACITY: 0.6,
  /** View depth with full alpha; nearer stays full, farther fades with (ref / depth)². */
  DEPTH_REF: 6,
  /** Alpha floor of the depth fade (the far side of the disk never vanishes). */
  DEPTH_MIN_ALPHA: 0.35,
  /** Share of accent (blue) particles: ~3 % (prd.md §6.1). */
  ACCENT_RATIO: 0.03,
  /** Accent particles are a little larger and brighter, or additive white drowns them. */
  ACCENT_SCALE: 1.5,
  ACCENT_BOOST: 1.6,
  /** Share of larger, fainter dust motes that give the dust depth. */
  MOTE_RATIO: 0.04,
  MOTE_SCALE: 2.2,
  MOTE_ALPHA: 0.45,
} as const;

/**
 * Particle colours as sRGB hex, the same values as tokens in src/styles/tokens.css (a unit test
 * keeps them in sync): white = --color-text, grey = --color-text-muted, accent = --color-accent.
 */
export const PARTICLE_COLORS = {
  white: '#f4f4f6',
  grey: '#a1a1aa',
  accent: '#4d7cff',
} as const;

/** `#rrggbb` → sRGB components in 0..1, written to the shader as is (no linear conversion). */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}".`);
  const channel = (value: string | undefined): number => parseInt(value ?? '0', 16) / 255;
  return [channel(match[1]), channel(match[2]), channel(match[3])];
}

/** Texel-centre uv of every particle, row by row (matches GPUComputationRenderer's layout). */
export function particleReferences(size: SimulationSize): Float32Array {
  const { width, height } = size;
  const references = new Float32Array(width * height * 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 2;
      references[o] = (x + 0.5) / width;
      references[o + 1] = (y + 0.5) / height;
    }
  }
  return references;
}

function createGeometry(size: SimulationSize): BufferGeometry {
  const geometry = new BufferGeometry();
  const count = size.width * size.height;
  // Unused by the shader; three takes the vertex count from it.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('reference', new BufferAttribute(particleReferences(size), 2));
  return geometry;
}

export interface VortexParticlesOptions {
  simulation: Pick<VortexSimulation, 'size' | 'generation' | 'positionTexture'>;
  /** FX state, for `uDim`. Without one the vortex is not dimmed. */
  state?: Pick<StateController, 'writeUniforms'>;
}

export interface VortexParticles {
  /** Add this to the scene. It moves and rotates like any object (the disk's tilt is the owner's). */
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  /** Call once per frame before rendering: picks up the latest positions and geometry size. */
  update: (pixelRatio: number) => void;
  dispose: () => void;
}

export function createVortexParticles(options: VortexParticlesOptions): VortexParticles {
  const { simulation, state } = options;
  const uniforms = {
    texturePosition: { value: null } as IUniform<Texture | null>,
    uPointSize: { value: PARTICLE_LOOK.POINT_SIZE },
    uMaxPointSize: { value: PARTICLE_LOOK.MAX_POINT_SIZE },
    uPixelRatio: { value: 1 },
    uDim: { value: 0 },
    uDepthRef: { value: PARTICLE_LOOK.DEPTH_REF },
    uDepthMinAlpha: { value: PARTICLE_LOOK.DEPTH_MIN_ALPHA },
    uAccentRatio: { value: PARTICLE_LOOK.ACCENT_RATIO },
    uAccentScale: { value: PARTICLE_LOOK.ACCENT_SCALE },
    uAccentBoost: { value: PARTICLE_LOOK.ACCENT_BOOST },
    uMoteRatio: { value: PARTICLE_LOOK.MOTE_RATIO },
    uMoteScale: { value: PARTICLE_LOOK.MOTE_SCALE },
    uMoteAlpha: { value: PARTICLE_LOOK.MOTE_ALPHA },
    uOpacity: { value: PARTICLE_LOOK.OPACITY },
    // Vector3, not three's Color: Color converts hex to linear, but this material writes sRGB.
    uColorWhite: { value: new Vector3(...hexToRgb(PARTICLE_COLORS.white)) },
    uColorGrey: { value: new Vector3(...hexToRgb(PARTICLE_COLORS.grey)) },
    uColorAccent: { value: new Vector3(...hexToRgb(PARTICLE_COLORS.accent)) },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
  // three binds `position` to attribute 0 by default; the shader never reads it, and Firefox warns
  // about binding an attribute that does not exist. `reference` is the one every vertex uses.
  material.index0AttributeName = 'reference';

  let generation = simulation.generation;
  let size = simulation.size;
  const points = new Points(createGeometry(size), material);
  // Positions come from a texture, so three's bounding sphere (all zeros) means nothing.
  points.frustumCulled = false;

  return {
    points,
    update(pixelRatio) {
      if (simulation.generation !== generation) {
        generation = simulation.generation;
        if (simulation.size !== size) {
          size = simulation.size;
          points.geometry.dispose();
          points.geometry = createGeometry(size);
        }
      }
      state?.writeUniforms(uniforms);
      // Nothing to draw while the simulation is (re)building.
      points.visible = simulation.positionTexture !== null;
      uniforms.texturePosition.value = simulation.positionTexture;
      uniforms.uPixelRatio.value = pixelRatio;
    },
    dispose() {
      points.geometry.dispose();
      material.dispose();
      points.removeFromParent();
    },
  };
}
