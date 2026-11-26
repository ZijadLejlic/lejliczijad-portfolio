// Decides how much FX a device gets (tech.md §7.2). The decision itself is a pure function of a few
// signals, so the whole matrix is unit-tested without WebGL; the browser probes sit at the bottom
// and are injected, so the order of the checks (cheap first, GPU last) is tested too.

export const QUALITIES = ['high', 'medium', 'low', 'static'] as const;
export type Quality = (typeof QUALITIES)[number];

/** Values accepted by `?fx=` (tech.md §7.2). `off` behaves like `static`; `debug` keeps auto quality. */
export const FX_PARAM = 'fx';
const FX_OFF = 'off';
const FX_DEBUG = 'debug';

/** Precision the GPU can render into. GPGPU needs at least half floats (tech.md §7.3). */
export type FloatRenderTarget = 'float' | 'half' | 'none';

/** detect-gpu tier, or `null` when it could not tell (unknown GPU, benchmark data failed to load). */
export type GpuTier = 0 | 1 | 2 | 3 | null;

export interface CapabilitySignals {
  webgl2: boolean;
  /** WebGL2 exists, but only with a major performance caveat (software rendering, e.g. SwiftShader). */
  softwareRendering: boolean;
  floatRenderTarget: FloatRenderTarget;
  gpuTier: GpuTier;
  isMobile: boolean;
  /** `navigator.deviceMemory` in GB; `null` where the browser does not expose it (Safari, Firefox). */
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  prefersReducedMotion: boolean;
  saveData: boolean;
}

export type QualityReason =
  | 'override'
  | 'no-webgl2'
  | 'software-rendering'
  | 'no-float-render-target'
  | 'reduced-motion'
  | 'save-data'
  | 'gpu-tier-0'
  | 'auto';

export interface QualityDecision {
  quality: Quality;
  reason: QualityReason;
}

export interface FxOverride {
  /** Forced quality, or `null` for automatic detection. */
  quality: Quality | null;
  debug: boolean;
}

// Thresholds that cap the GPU-based tier. deviceMemory ≤ 4 GB is the `low` row of tech.md §7.2;
// the core counts are not in the table and are an implementation choice (see PR P1.FX.01).
const LOW_MEMORY_GB = 4;
const LOW_CORES = 2;
const MID_CORES = 4;

const TIER_TO_QUALITY: Record<1 | 2 | 3, Quality> = { 1: 'low', 2: 'medium', 3: 'high' };
// An unknown GPU (FALLBACK or failed benchmark load) starts in the middle; adaptive quality
// (P1.FX.07) moves it from there once real frame times exist.
const UNKNOWN_TIER_QUALITY: Quality = 'medium';

/** Ordered from most to least FX, so a lower index means more work for the GPU. */
function rank(quality: Quality): number {
  return QUALITIES.indexOf(quality);
}

function atMost(quality: Quality, cap: Quality): Quality {
  return rank(quality) >= rank(cap) ? quality : cap;
}

/** One step less FX, but never below `low`: a capable device keeps the vortex. */
function stepDown(quality: Quality): Quality {
  return quality === 'high' ? 'medium' : 'low';
}

/** Reads `?fx=` from a query string. Unknown values are ignored, so a typo never breaks the page. */
export function parseFxOverride(search: string): FxOverride {
  const value = new URLSearchParams(search).get(FX_PARAM)?.trim().toLowerCase();

  if (value === FX_OFF) return { quality: 'static', debug: false };
  if (value === FX_DEBUG) return { quality: null, debug: true };
  if (value && (QUALITIES as readonly string[]).includes(value)) {
    return { quality: value as Quality, debug: false };
  }
  return { quality: null, debug: false };
}

/** The table from tech.md §7.2, without any override. */
export function decideQuality(signals: CapabilitySignals): QualityDecision {
  if (!signals.webgl2) return { quality: 'static', reason: 'no-webgl2' };
  if (signals.softwareRendering) return { quality: 'static', reason: 'software-rendering' };
  if (signals.floatRenderTarget === 'none') {
    return { quality: 'static', reason: 'no-float-render-target' };
  }
  if (signals.prefersReducedMotion) return { quality: 'static', reason: 'reduced-motion' };
  if (signals.saveData) return { quality: 'static', reason: 'save-data' };
  if (signals.gpuTier === 0) return { quality: 'static', reason: 'gpu-tier-0' };

  let quality = signals.gpuTier === null ? UNKNOWN_TIER_QUALITY : TIER_TO_QUALITY[signals.gpuTier];

  // A phone with a top-tier GPU still has a small battery and thermal budget ("jak mobilni" → medium).
  if (signals.isMobile) quality = stepDown(quality);
  if (signals.deviceMemory !== null && signals.deviceMemory <= LOW_MEMORY_GB) {
    quality = atMost(quality, 'low');
  }
  if (signals.hardwareConcurrency !== null) {
    if (signals.hardwareConcurrency <= LOW_CORES) quality = atMost(quality, 'low');
    else if (signals.hardwareConcurrency <= MID_CORES) quality = atMost(quality, 'medium');
  }

  return { quality, reason: 'auto' };
}

/**
 * Applies `?fx=` on top of the automatic decision. A forced quality beats preferences and the GPU
 * tier (that is what testing needs), but never missing hardware support: forcing `high` without
 * WebGL2 would only crash the canvas.
 */
export function resolveQuality(signals: CapabilitySignals, override: FxOverride): QualityDecision {
  const auto = decideQuality(signals);
  if (override.quality === null || override.quality === 'static') {
    return override.quality === 'static' ? { quality: 'static', reason: 'override' } : auto;
  }

  const unsupported =
    auto.reason === 'no-webgl2' ||
    auto.reason === 'software-rendering' ||
    auto.reason === 'no-float-render-target';
  return unsupported ? auto : { quality: override.quality, reason: 'override' };
}

/** Maps a detect-gpu result to a tier. Kept here (not in gpu-tier.ts) so it is tested as part of the matrix. */
export function gpuTierFromResult(result: { tier: number; type: string }): GpuTier {
  switch (result.type) {
    case 'BLOCKLISTED':
    case 'WEBGL_UNSUPPORTED':
      return 0;
    case 'BENCHMARK':
      return Math.min(3, Math.max(0, Math.round(result.tier))) as 0 | 1 | 2 | 3;
    default:
      // FALLBACK, BENCHMARK_FETCH_FAILED, SSR: detect-gpu reports tier 1 as a guess. Treat it as unknown.
      return null;
  }
}

// --- Browser probes -------------------------------------------------------------------------------

export interface GpuProbe {
  webgl2: boolean;
  softwareRendering: boolean;
  floatRenderTarget: FloatRenderTarget;
  /** Releases the probe's WebGL context. Browsers cap live contexts, and the renderer needs one. */
  release: () => void;
  context: WebGL2RenderingContext | null;
}

export interface GpuTierInfo {
  tier: GpuTier;
  isMobile: boolean | undefined;
}

/** Everything the detector reads from the browser, injectable for tests. */
export interface CapabilityEnv {
  search: string;
  prefersReducedMotion: () => boolean;
  saveData: () => boolean;
  deviceMemory: () => number | null;
  hardwareConcurrency: () => number | null;
  coarsePointer: () => boolean;
  probeGpu: () => GpuProbe;
  gpuTier: (context: WebGL2RenderingContext) => Promise<GpuTierInfo>;
}

export interface FxCapabilities extends QualityDecision {
  debug: boolean;
  floatRenderTarget: FloatRenderTarget;
}

const NO_GPU: Omit<CapabilitySignals, 'prefersReducedMotion' | 'saveData'> = {
  webgl2: false,
  softwareRendering: false,
  floatRenderTarget: 'none',
  gpuTier: null,
  isMobile: false,
  deviceMemory: null,
  hardwareConcurrency: null,
};

/**
 * Collects the signals and decides. Cheap checks run first: with `?fx=off`, reduced motion or
 * save-data no WebGL context is created and the detect-gpu data is never loaded.
 */
export async function detectCapabilities(env: CapabilityEnv): Promise<FxCapabilities> {
  const override = parseFxOverride(env.search);
  const prefersReducedMotion = env.prefersReducedMotion();
  const saveData = env.saveData();

  const staticResult = (reason: QualityReason): FxCapabilities => ({
    quality: 'static',
    reason,
    debug: override.debug,
    floatRenderTarget: 'none',
  });

  if (override.quality === 'static') return staticResult('override');
  if (override.quality === null) {
    if (prefersReducedMotion) return staticResult('reduced-motion');
    if (saveData) return staticResult('save-data');
  }

  const probe = env.probeGpu();
  try {
    const base: CapabilitySignals = {
      ...NO_GPU,
      webgl2: probe.webgl2,
      softwareRendering: probe.softwareRendering,
      floatRenderTarget: probe.floatRenderTarget,
      deviceMemory: env.deviceMemory(),
      hardwareConcurrency: env.hardwareConcurrency(),
      isMobile: env.coarsePointer(),
      prefersReducedMotion,
      saveData,
    };

    const hardwareOk = base.webgl2 && !base.softwareRendering && base.floatRenderTarget !== 'none';
    // A forced quality skips the tier lookup; it would be ignored anyway.
    if (hardwareOk && probe.context && override.quality === null) {
      try {
        const info = await env.gpuTier(probe.context);
        base.gpuTier = info.tier;
        base.isMobile = info.isMobile ?? base.isMobile;
      } catch {
        // detect-gpu or its data failed: keep the tier unknown instead of losing the vortex.
      }
    }

    const decision = resolveQuality(base, override);
    return {
      ...decision,
      debug: override.debug,
      floatRenderTarget: decision.quality === 'static' ? 'none' : base.floatRenderTarget,
    };
  } finally {
    probe.release();
  }
}
