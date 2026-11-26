import { describe, expect, it, vi } from 'vitest';

import {
  decideQuality,
  detectCapabilities,
  gpuTierFromResult,
  parseFxOverride,
  resolveQuality,
  type CapabilityEnv,
  type CapabilitySignals,
  type GpuProbe,
  type Quality,
  type QualityReason,
} from '@/fx/core/capabilities';

// A strong desktop: every row below changes one or two signals from this baseline.
const DESKTOP: CapabilitySignals = {
  webgl2: true,
  softwareRendering: false,
  floatRenderTarget: 'float',
  gpuTier: 3,
  isMobile: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  prefersReducedMotion: false,
  saveData: false,
};

const AUTO = { quality: null, debug: false } as const;

type Row = [
  name: string,
  signals: Partial<CapabilitySignals>,
  quality: Quality,
  reason: QualityReason,
];

describe('decideQuality: tech.md §7.2 matrix', () => {
  const rows: Row[] = [
    // GPU tier on desktop
    ['desktop tier 3', {}, 'high', 'auto'],
    ['desktop tier 2', { gpuTier: 2 }, 'medium', 'auto'],
    ['desktop tier 1', { gpuTier: 1 }, 'low', 'auto'],
    ['desktop tier 0', { gpuTier: 0 }, 'static', 'gpu-tier-0'],
    ['desktop, unknown GPU', { gpuTier: null }, 'medium', 'auto'],
    // Mobile drops one step but keeps the vortex
    ['strong phone (tier 3)', { isMobile: true }, 'medium', 'auto'],
    ['phone tier 2', { isMobile: true, gpuTier: 2 }, 'low', 'auto'],
    ['phone tier 1', { isMobile: true, gpuTier: 1 }, 'low', 'auto'],
    ['phone, unknown GPU', { isMobile: true, gpuTier: null }, 'low', 'auto'],
    ['phone tier 0', { isMobile: true, gpuTier: 0 }, 'static', 'gpu-tier-0'],
    // deviceMemory
    ['4 GB memory caps at low', { deviceMemory: 4 }, 'low', 'auto'],
    ['2 GB memory caps at low', { deviceMemory: 2, gpuTier: 2 }, 'low', 'auto'],
    ['8 GB memory does not cap', { deviceMemory: 8 }, 'high', 'auto'],
    ['unknown memory (Safari) does not cap', { deviceMemory: null }, 'high', 'auto'],
    // hardwareConcurrency
    ['2 cores caps at low', { hardwareConcurrency: 2 }, 'low', 'auto'],
    ['4 cores caps at medium', { hardwareConcurrency: 4 }, 'medium', 'auto'],
    ['4 cores keeps low as low', { hardwareConcurrency: 4, gpuTier: 1 }, 'low', 'auto'],
    ['6 cores does not cap', { hardwareConcurrency: 6 }, 'high', 'auto'],
    ['unknown cores does not cap', { hardwareConcurrency: null }, 'high', 'auto'],
    // Hardware support
    ['no WebGL2', { webgl2: false }, 'static', 'no-webgl2'],
    ['software rendering', { softwareRendering: true }, 'static', 'software-rendering'],
    ['no float render target', { floatRenderTarget: 'none' }, 'static', 'no-float-render-target'],
    ['half float is enough', { floatRenderTarget: 'half' }, 'high', 'auto'],
    // Preferences
    ['reduced motion', { prefersReducedMotion: true }, 'static', 'reduced-motion'],
    ['save-data', { saveData: true }, 'static', 'save-data'],
    // Precedence: support first, then preferences, then the GPU
    [
      'no WebGL2 wins over reduced motion',
      { webgl2: false, prefersReducedMotion: true },
      'static',
      'no-webgl2',
    ],
    [
      'reduced motion wins over save-data',
      { prefersReducedMotion: true, saveData: true },
      'static',
      'reduced-motion',
    ],
    ['save-data wins over tier 0', { saveData: true, gpuTier: 0 }, 'static', 'save-data'],
    [
      'phone with 4 GB and 2 cores',
      { isMobile: true, deviceMemory: 4, hardwareConcurrency: 2 },
      'low',
      'auto',
    ],
  ];

  it.each(rows)('%s → %s', (_name, signals, quality, reason) => {
    expect(decideQuality({ ...DESKTOP, ...signals })).toEqual({ quality, reason });
  });
});

describe('parseFxOverride', () => {
  it.each([
    ['', { quality: null, debug: false }],
    ['?fx=off', { quality: 'static', debug: false }],
    ['?fx=static', { quality: 'static', debug: false }],
    ['?fx=low', { quality: 'low', debug: false }],
    ['?fx=medium', { quality: 'medium', debug: false }],
    ['?fx=high', { quality: 'high', debug: false }],
    ['?fx=debug', { quality: null, debug: true }],
    ['?fx=HIGH', { quality: 'high', debug: false }],
    ['?type=app&fx=off', { quality: 'static', debug: false }],
    ['?fx=ultra', { quality: null, debug: false }],
    ['?fx=', { quality: null, debug: false }],
  ])('%j', (search, expected) => {
    expect(parseFxOverride(search)).toEqual(expected);
  });
});

describe('resolveQuality', () => {
  it('without an override returns the automatic decision', () => {
    expect(resolveQuality({ ...DESKTOP, gpuTier: 2 }, AUTO)).toEqual({
      quality: 'medium',
      reason: 'auto',
    });
  });

  it('a forced quality beats reduced motion, save-data and the GPU tier', () => {
    const weak = { ...DESKTOP, prefersReducedMotion: true, saveData: true, gpuTier: 0 as const };
    expect(resolveQuality(weak, { quality: 'high', debug: false })).toEqual({
      quality: 'high',
      reason: 'override',
    });
  });

  it('a forced quality can lower a strong device', () => {
    expect(resolveQuality(DESKTOP, { quality: 'low', debug: false })).toEqual({
      quality: 'low',
      reason: 'override',
    });
  });

  it.each([
    [{ webgl2: false }, 'no-webgl2'],
    [{ softwareRendering: true }, 'software-rendering'],
    [{ floatRenderTarget: 'none' }, 'no-float-render-target'],
  ] as const)('a forced quality never beats missing hardware (%j)', (signals, reason) => {
    expect(resolveQuality({ ...DESKTOP, ...signals }, { quality: 'high', debug: false })).toEqual({
      quality: 'static',
      reason,
    });
  });

  it('static/off always wins', () => {
    expect(resolveQuality(DESKTOP, { quality: 'static', debug: false })).toEqual({
      quality: 'static',
      reason: 'override',
    });
  });
});

describe('gpuTierFromResult', () => {
  it.each([
    [{ tier: 3, type: 'BENCHMARK' }, 3],
    [{ tier: 2, type: 'BENCHMARK' }, 2],
    [{ tier: 1, type: 'BENCHMARK' }, 1],
    [{ tier: 0, type: 'BENCHMARK' }, 0],
    [{ tier: 0, type: 'BLOCKLISTED' }, 0],
    [{ tier: 0, type: 'WEBGL_UNSUPPORTED' }, 0],
    [{ tier: 1, type: 'FALLBACK' }, null],
    [{ tier: 1, type: 'BENCHMARK_FETCH_FAILED' }, null],
    [{ tier: 0, type: 'SSR' }, null],
  ])('%j → %s', (result, tier) => {
    expect(gpuTierFromResult(result)).toBe(tier);
  });
});

describe('detectCapabilities', () => {
  function makeEnv(overrides: Partial<CapabilityEnv> = {}, probe: Partial<GpuProbe> = {}) {
    const release = vi.fn();
    const context = {} as WebGL2RenderingContext;
    const probeGpu = vi.fn((): GpuProbe => ({
      webgl2: true,
      softwareRendering: false,
      floatRenderTarget: 'float',
      context,
      release,
      ...probe,
    }));
    const gpuTier = vi.fn(async () => ({ tier: 3 as const, isMobile: false }));
    const env: CapabilityEnv = {
      search: '',
      prefersReducedMotion: () => false,
      saveData: () => false,
      deviceMemory: () => 8,
      hardwareConcurrency: () => 8,
      coarsePointer: () => false,
      probeGpu,
      gpuTier,
      ...overrides,
    };
    return {
      env,
      probeGpu,
      gpuTier: (overrides.gpuTier as typeof gpuTier | undefined) ?? gpuTier,
      release,
      context,
    };
  }

  it('detects high on a strong desktop and releases the probe context', async () => {
    const { env, gpuTier, release, context } = makeEnv();
    await expect(detectCapabilities(env)).resolves.toEqual({
      quality: 'high',
      reason: 'auto',
      debug: false,
      floatRenderTarget: 'float',
    });
    expect(gpuTier).toHaveBeenCalledWith(context);
    expect(release).toHaveBeenCalledOnce();
  });

  it.each([
    ['?fx=off', {}, 'override'],
    ['', { prefersReducedMotion: () => true }, 'reduced-motion'],
    ['', { saveData: () => true }, 'save-data'],
  ] as const)('%s %j never touches the GPU', async (search, overrides, reason) => {
    const { env, probeGpu } = makeEnv({ search, ...overrides });
    await expect(detectCapabilities(env)).resolves.toMatchObject({ quality: 'static', reason });
    expect(probeGpu).not.toHaveBeenCalled();
  });

  it('a forced quality skips detect-gpu but still checks WebGL2', async () => {
    const { env, probeGpu, gpuTier } = makeEnv({
      search: '?fx=low',
      prefersReducedMotion: () => true,
    });
    await expect(detectCapabilities(env)).resolves.toMatchObject({
      quality: 'low',
      reason: 'override',
    });
    expect(probeGpu).toHaveBeenCalledOnce();
    expect(gpuTier).not.toHaveBeenCalled();
  });

  it('a forced quality without WebGL2 stays static', async () => {
    const { env } = makeEnv({ search: '?fx=high' }, { webgl2: false, context: null });
    await expect(detectCapabilities(env)).resolves.toMatchObject({
      quality: 'static',
      reason: 'no-webgl2',
    });
  });

  it('skips detect-gpu when the hardware cannot run the simulation', async () => {
    const { env, gpuTier, release } = makeEnv({}, { floatRenderTarget: 'none' });
    await expect(detectCapabilities(env)).resolves.toEqual({
      quality: 'static',
      reason: 'no-float-render-target',
      debug: false,
      floatRenderTarget: 'none',
    });
    expect(gpuTier).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledOnce();
  });

  it('reports the float precision the simulation should use', async () => {
    const { env } = makeEnv({}, { floatRenderTarget: 'half' });
    await expect(detectCapabilities(env)).resolves.toMatchObject({ floatRenderTarget: 'half' });
  });

  it('uses detect-gpu mobile detection over the pointer media query', async () => {
    const { env } = makeEnv({
      coarsePointer: () => false,
      gpuTier: vi.fn(async () => ({ tier: 3 as const, isMobile: true })),
    });
    await expect(detectCapabilities(env)).resolves.toMatchObject({ quality: 'medium' });
  });

  it('falls back to the pointer media query when detect-gpu does not say', async () => {
    const { env } = makeEnv({
      coarsePointer: () => true,
      gpuTier: vi.fn(async () => ({ tier: 3 as const, isMobile: undefined })),
    });
    await expect(detectCapabilities(env)).resolves.toMatchObject({ quality: 'medium' });
  });

  it('a failing detect-gpu leaves the tier unknown instead of throwing', async () => {
    const { env, release } = makeEnv({
      gpuTier: vi.fn(async () => {
        throw new Error('chunk failed');
      }),
    });
    await expect(detectCapabilities(env)).resolves.toMatchObject({
      quality: 'medium',
      reason: 'auto',
    });
    expect(release).toHaveBeenCalledOnce();
  });

  it('?fx=debug keeps automatic quality and sets the debug flag', async () => {
    const { env } = makeEnv({ search: '?fx=debug' });
    await expect(detectCapabilities(env)).resolves.toMatchObject({ quality: 'high', debug: true });
  });

  it('applies memory and core caps from the environment', async () => {
    const { env } = makeEnv({ deviceMemory: () => 4 });
    await expect(detectCapabilities(env)).resolves.toMatchObject({ quality: 'low' });
  });
});
