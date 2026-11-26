// Browser side of the capability check (capabilities.ts holds the decision). Only runs in the
// browser, inside the lazily loaded FX bundle (P1.FX.04).

import type { ModelEntry } from '@pmndrs/detect-gpu';

import {
  gpuTierFromResult,
  type CapabilityEnv,
  type FloatRenderTarget,
  type GpuProbe,
  type GpuTierInfo,
} from './capabilities';

// detect-gpu loads its benchmark tables from unpkg by default. That is a third-party request the
// CSP does not allow (tech.md §13.3, §15), so the tables are bundled from node_modules instead:
// Vite emits each file as its own same-origin chunk, and only the one matching the GPU vendor loads.
const BENCHMARKS = import.meta.glob<ModelEntry[] | [string, ...ModelEntry[]]>(
  '/node_modules/@pmndrs/detect-gpu/dist/benchmarks/*.json',
  { import: 'default' },
);
const BENCHMARK_DIR = '/node_modules/@pmndrs/detect-gpu/dist/benchmarks/';

/** Same contract as detect-gpu's own loader: the file's first entry is its data version, not a GPU. */
export async function loadBenchmarks(file: string): Promise<ModelEntry[]> {
  const load = BENCHMARKS[`${BENCHMARK_DIR}${file}`];
  if (!load) throw new Error(`No detect-gpu benchmark file "${file}"`);
  const [, ...entries] = await load();
  return entries as ModelEntry[];
}

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

function hints(): NavigatorHints {
  // Chromium-only fields that lib.dom does not type; both may be missing.
  return navigator as Navigator & NavigatorHints;
}

function floatRenderTarget(gl: WebGL2RenderingContext): FloatRenderTarget {
  if (gl.getExtension('EXT_color_buffer_float')) return 'float';
  if (gl.getExtension('EXT_color_buffer_half_float')) return 'half';
  return 'none';
}

/** Creates one throwaway WebGL2 context, reads what the simulation needs, and hands it to detect-gpu. */
export function probeGpu(): GpuProbe {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });

  if (!gl) {
    // Tell "no WebGL2" apart from "WebGL2 on a software rasterizer"; both end as static.
    const fallback = document.createElement('canvas').getContext('webgl2');
    fallback?.getExtension('WEBGL_lose_context')?.loseContext();
    return {
      webgl2: fallback !== null,
      softwareRendering: fallback !== null,
      floatRenderTarget: 'none',
      context: null,
      release: () => undefined,
    };
  }

  return {
    webgl2: true,
    softwareRendering: false,
    floatRenderTarget: floatRenderTarget(gl),
    context: gl,
    release: () => gl.getExtension('WEBGL_lose_context')?.loseContext(),
  };
}

export async function gpuTier(context: WebGL2RenderingContext): Promise<GpuTierInfo> {
  const { getGPUTier } = await import('@pmndrs/detect-gpu');
  const result = await getGPUTier({ glContext: context, override: { loadBenchmarks } });
  return { tier: gpuTierFromResult(result), isMobile: result.isMobile };
}

function media(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

export function browserEnv(): CapabilityEnv {
  return {
    search: location.search,
    prefersReducedMotion: () => media('(prefers-reduced-motion: reduce)'),
    saveData: () => hints().connection?.saveData === true,
    deviceMemory: () => hints().deviceMemory ?? null,
    hardwareConcurrency: () => navigator.hardwareConcurrency || null,
    coarsePointer: () => media('(pointer: coarse)'),
    probeGpu,
    gpuTier,
  };
}
