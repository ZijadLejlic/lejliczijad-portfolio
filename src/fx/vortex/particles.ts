// Draws the vortex simulation as points (P1.FX.08). This is the baseline drawer that makes the
// simulation visible: soft white/grey dots, depth-sized, additive. The final particle look
// (accent particles, size by depth tuning, glow) is P1.FX.09 and replaces the two shaders, not this
// wiring.
//
// One vertex per particle; the vertex shader reads its position from the simulation texture, so
// nothing is copied back to the CPU. The geometry only changes when the simulation is rebuilt at a
// different size (adaptive quality).

import {
  AdditiveBlending,
  BufferAttribute,
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

/** Point size in px at view depth 1 (before DPR). At the dev camera (~6 units) that is ~1–1.5 px. */
export const POINT_SIZE = 7;
/** Peak alpha of one dot; additive blending builds density where particles overlap. */
export const POINT_OPACITY = 0.55;

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
    uPointSize: { value: POINT_SIZE },
    uPixelRatio: { value: 1 },
    uDim: { value: 0 },
    uOpacity: { value: POINT_OPACITY },
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
