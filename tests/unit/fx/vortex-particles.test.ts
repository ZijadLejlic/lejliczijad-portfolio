import { AdditiveBlending, type Texture } from 'three';
import { describe, expect, it } from 'vitest';

import { createVortexParticles, particleReferences } from '@/fx/vortex/particles';
import { SIMULATION_SIZE, type SimulationSize } from '@/fx/vortex/simulation';

// The drawer needs no WebGL to build: geometry and material are plain three.js objects. Drawing
// itself is covered by tests/e2e/fx-vortex.spec.ts.

describe('particleReferences', () => {
  it('points every particle at the centre of its own texel, row by row', () => {
    const refs = particleReferences({ width: 4, height: 2 });
    expect(Array.from(refs)).toEqual([
      0.125, 0.25, 0.375, 0.25, 0.625, 0.25, 0.875, 0.25, 0.125, 0.75, 0.375, 0.75, 0.625, 0.75,
      0.875, 0.75,
    ]);
  });

  it('has one reference per particle of the high tier', () => {
    expect(particleReferences(SIMULATION_SIZE.high)).toHaveLength(512 * 256 * 2);
  });
});

function fakeSimulation(size: SimulationSize) {
  return {
    size,
    generation: 1,
    positionTexture: null as Texture | null,
  };
}

describe('createVortexParticles', () => {
  it('draws one additive, depth-free point per particle', () => {
    const simulation = fakeSimulation(SIMULATION_SIZE.low);
    const { points } = createVortexParticles({ simulation });
    expect(points.geometry.getAttribute('reference').count).toBe(128 * 128);
    expect(points.geometry.getAttribute('position').count).toBe(128 * 128);
    expect(points.material.blending).toBe(AdditiveBlending);
    expect(points.material.depthWrite).toBe(false);
    expect(points.frustumCulled).toBe(false);
    expect(points.material.index0AttributeName).toBe('reference');
  });

  it('hides itself while the simulation has no positions', () => {
    const simulation = fakeSimulation(SIMULATION_SIZE.low);
    const particles = createVortexParticles({ simulation });
    particles.update(2);
    expect(particles.points.visible).toBe(false);

    const texture = { isTexture: true } as unknown as Texture;
    simulation.positionTexture = texture;
    particles.update(2);
    expect(particles.points.visible).toBe(true);
    expect(particles.points.material.uniforms.texturePosition?.value).toBe(texture);
    expect(particles.points.material.uniforms.uPixelRatio?.value).toBe(2);
  });

  it('rebuilds the geometry when the simulation changes size', () => {
    const simulation = fakeSimulation(SIMULATION_SIZE.high);
    const particles = createVortexParticles({ simulation });
    const before = particles.points.geometry;

    simulation.generation = 2; // same size: a restore, geometry stays
    particles.update(1);
    expect(particles.points.geometry).toBe(before);

    simulation.size = SIMULATION_SIZE.medium;
    simulation.generation = 3;
    particles.update(1);
    expect(particles.points.geometry).not.toBe(before);
    expect(particles.points.geometry.getAttribute('reference').count).toBe(256 * 256);
  });

  it('takes uDim from the FX state', () => {
    const simulation = fakeSimulation(SIMULATION_SIZE.low);
    const state = {
      writeUniforms: (uniforms: Partial<Record<string, { value: number }>>) => {
        const dim = uniforms.uDim;
        if (dim) dim.value = 0.35;
      },
    };
    const particles = createVortexParticles({ simulation, state });
    particles.update(1);
    expect(particles.points.material.uniforms.uDim?.value).toBe(0.35);
  });

  it('frees geometry and material on dispose', () => {
    const particles = createVortexParticles({ simulation: fakeSimulation(SIMULATION_SIZE.low) });
    let freed = 0;
    particles.points.geometry.addEventListener('dispose', () => (freed += 1));
    particles.points.material.addEventListener('dispose', () => (freed += 1));
    particles.dispose();
    expect(freed).toBe(2);
  });
});
