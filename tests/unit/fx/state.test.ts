import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import {
  BASE_STATES,
  DEFAULT_SECTION,
  DEFAULT_TWEEN,
  EASINGS,
  STATE_PRESETS,
  STATE_UNIFORMS,
  TRANSITION_TWEENS,
  createStateController,
  cubicBezier,
  ease,
  isSectionState,
  parseFxState,
  resolveValues,
  type StateUniform,
} from '@/fx/core/state';

// The controller has no WebGL and no clock: tests drive it with update(delta) like the render
// loop does, so every state and tween is checked without a browser (P1.FX.13).

const FRAME = 1 / 60;

/** Runs `seconds` of frames at 60 FPS. */
function run(controller: ReturnType<typeof createStateController>, seconds: number): void {
  const frames = Math.ceil(seconds / FRAME);
  for (let i = 0; i < frames; i += 1) controller.update(FRAME);
}

describe('parseFxState', () => {
  it.each(BASE_STATES)('accepts %s', (state) => {
    expect(parseFxState(state)).toBe(state);
  });

  it('accepts kebab-case sections and trims whitespace', () => {
    expect(parseFxState('section:selected-work')).toBe('section:selected-work');
    expect(parseFxState('  section:stats ')).toBe('section:stats');
  });

  it.each([
    null,
    undefined,
    '',
    'Hero',
    'section:',
    'section:Selected',
    'section:a--b',
    'section:-a',
    'section:a b',
    'section:<script>',
    'transition',
  ])('rejects %j', (value) => {
    expect(parseFxState(value)).toBeNull();
  });

  it('isSectionState only matches well-formed sections', () => {
    expect(isSectionState('section:faq')).toBe(true);
    expect(isSectionState('section:')).toBe(false);
    expect(isSectionState('idle')).toBe(false);
  });
});

describe('presets', () => {
  it('every state defines every state uniform with a finite value', () => {
    for (const state of BASE_STATES) {
      for (const key of STATE_UNIFORMS) {
        expect(Number.isFinite(STATE_PRESETS[state][key]), `${state}.${key}`).toBe(true);
      }
    }
  });

  it('idle is the neutral vortex', () => {
    expect(STATE_PRESETS.idle).toEqual({
      uSpeed: 1,
      uSwirl: 1,
      uNoiseAmp: 1,
      uDim: 0,
      uAttract: 0,
      uMouseStrength: 1,
    });
  });

  it('transition-out speeds up and pulls in, without the mouse field', () => {
    const out = STATE_PRESETS['transition-out'];
    expect(out.uSpeed).toBeGreaterThan(STATE_PRESETS.idle.uSpeed);
    expect(out.uSwirl).toBeGreaterThan(STATE_PRESETS.idle.uSwirl);
    expect(out.uAttract).toBeGreaterThan(STATE_PRESETS['transition-in'].uAttract);
    expect(out.uMouseStrength).toBe(0);
  });

  it('dims stay within [0, 1]', () => {
    for (const state of BASE_STATES) {
      expect(STATE_PRESETS[state].uDim).toBeGreaterThanOrEqual(0);
      expect(STATE_PRESETS[state].uDim).toBeLessThanOrEqual(1);
    }
  });

  it('a page transition fits in 700 ms and the out half in 350 ms (prd.md §6.4, P1.FX.14)', () => {
    const out = TRANSITION_TWEENS['transition-out'].duration;
    const inn = TRANSITION_TWEENS['transition-in'].duration;
    expect(out).toBeLessThanOrEqual(0.35);
    expect(out + inn).toBeLessThanOrEqual(0.7);
  });
});

describe('resolveValues', () => {
  it('returns a copy of the preset for base states', () => {
    const values = resolveValues('hero');
    expect(values).toEqual(STATE_PRESETS.hero);
    values.uSpeed = 99;
    expect(STATE_PRESETS.hero.uSpeed).not.toBe(99);
  });

  it('gives an unknown section the idle vortex with the default dim', () => {
    expect(resolveValues('section:stats')).toEqual({ ...STATE_PRESETS.idle, ...DEFAULT_SECTION });
  });

  it('applies per-section overrides on top of the default', () => {
    const values = resolveValues('section:stats', { stats: { uDim: 0.6, uSpeed: 0.5 } });
    expect(values).toEqual({ ...STATE_PRESETS.idle, uDim: 0.6, uSpeed: 0.5 });
  });
});

describe('easing', () => {
  it('matches the motion tokens in tokens.css', () => {
    const css = readFileSync(new URL('../../../src/styles/tokens.css', import.meta.url), 'utf8');
    const token = (name: string): number[] => {
      const match = new RegExp(`--ease-${name}:\\s*cubic-bezier\\(([^)]+)\\)`).exec(css);
      expect(match, `--ease-${name}`).not.toBeNull();
      return (match?.[1] ?? '').split(',').map(Number);
    };
    expect(token('out')).toEqual([...EASINGS.out]);
    expect(token('in-out')).toEqual([...EASINGS['in-out']]);
  });

  it.each(['linear', 'out', 'in-out'] as const)('%s starts at 0, ends at 1 and clamps', (name) => {
    expect(ease(name, 0)).toBe(0);
    expect(ease(name, 1)).toBe(1);
    expect(ease(name, -1)).toBe(0);
    expect(ease(name, 2)).toBe(1);
  });

  it.each(['linear', 'out', 'in-out'] as const)('%s is monotonic', (name) => {
    let previous = 0;
    for (let i = 1; i <= 100; i += 1) {
      const value = ease(name, i / 100);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
  });

  it('in-out is symmetric around the middle and out leads early', () => {
    expect(ease('in-out', 0.5)).toBeCloseTo(0.5, 5);
    expect(ease('in-out', 0.25) + ease('in-out', 0.75)).toBeCloseTo(1, 5);
    expect(ease('out', 0.25)).toBeGreaterThan(0.5);
  });

  it('solves known CSS curves (ease = 0.25, 0.1, 0.25, 1)', () => {
    const cssEase = cubicBezier(0.25, 0.1, 0.25, 1);
    // Reference values of the CSS `ease` keyword.
    expect(cssEase(0.5)).toBeCloseTo(0.8024, 3);
    expect(cssEase(0.25)).toBeCloseTo(0.4085, 3);
  });
});

describe('createStateController', () => {
  it('starts in idle with idle values and nothing animating', () => {
    const fx = createStateController();
    expect(fx.state).toBe('idle');
    expect(fx.values).toEqual(STATE_PRESETS.idle);
    expect(fx.animating).toBe(false);
  });

  it('can start in any state', () => {
    const fx = createStateController({ initial: 'hero' });
    expect(fx.values).toEqual(STATE_PRESETS.hero);
  });

  it('rejects unknown states', () => {
    expect(() => createStateController({ initial: 'nope' as 'idle' })).toThrow(TypeError);
    const fx = createStateController();
    expect(() => void fx.setState('section:Bad' as 'idle')).toThrow(TypeError);
  });

  it('values is a copy: callers cannot change the controller', () => {
    const fx = createStateController();
    const values = fx.values as Record<StateUniform, number>;
    values.uSpeed = 42;
    expect(fx.values.uSpeed).toBe(1);
  });

  it.each([...BASE_STATES.filter((s) => s !== 'idle'), 'section:stats' as const])(
    'idle → %s reaches the target values and resolves completed',
    async (target) => {
      const fx = createStateController();
      const done = fx.setState(target);
      expect(fx.state).toBe(target);
      expect(fx.animating).toBe(true);
      run(fx, 1);
      expect(fx.animating).toBe(false);
      expect(fx.values).toEqual(resolveValues(target));
      await expect(done).resolves.toBe('completed');
    },
  );

  it('tweens smoothly: halfway through in-out is halfway between the values', () => {
    const fx = createStateController();
    void fx.setState('hero', { tween: { duration: 1, ease: 'in-out' } });
    fx.update(0.5);
    const { uSpeed } = fx.values;
    expect(uSpeed).toBeCloseTo((STATE_PRESETS.idle.uSpeed + STATE_PRESETS.hero.uSpeed) / 2, 5);
  });

  it('uses the default tween for page states and the transition tweens for transitions', () => {
    const fx = createStateController();
    void fx.setState('hero');
    fx.update(DEFAULT_TWEEN.duration - 0.01);
    expect(fx.animating).toBe(true);
    fx.update(0.02);
    expect(fx.animating).toBe(false);

    void fx.setState('transition-out');
    fx.update(TRANSITION_TWEENS['transition-out'].duration);
    expect(fx.animating).toBe(false);
    expect(fx.values).toEqual(STATE_PRESETS['transition-out']);

    void fx.setState('transition-in');
    fx.update(TRANSITION_TWEENS['transition-in'].duration);
    expect(fx.values).toEqual(STATE_PRESETS['transition-in']);
  });

  it('the whole navigation (out → in → page) ends in the page state within budget', async () => {
    const fx = createStateController({ initial: 'section:stats' });
    const out = fx.setState('transition-out');
    run(fx, 0.35);
    await expect(out).resolves.toBe('completed');
    const inn = fx.setState('transition-in');
    run(fx, 0.35);
    await expect(inn).resolves.toBe('completed');
    const page = fx.setState('hero');
    run(fx, 0.7);
    await expect(page).resolves.toBe('completed');
    expect(fx.values).toEqual(STATE_PRESETS.hero);
  });

  it('an interrupted tween continues from the current values, without a jump', async () => {
    const fx = createStateController();
    const first = fx.setState('transition-out', { tween: { duration: 1, ease: 'linear' } });
    fx.update(0.5);
    const midway = fx.values;
    const second = fx.setState('hero', { tween: { duration: 1, ease: 'linear' } });
    await expect(first).resolves.toBe('interrupted');
    expect(fx.values).toEqual(midway);
    fx.update(FRAME);
    const step = Math.abs(fx.values.uSpeed - midway.uSpeed);
    expect(step).toBeLessThan(0.05);
    run(fx, 1);
    expect(fx.values).toEqual(STATE_PRESETS.hero);
    await expect(second).resolves.toBe('completed');
  });

  it('asking for the current state does nothing', async () => {
    const fx = createStateController({ initial: 'hero' });
    const listener = vi.fn();
    fx.onChange(listener);
    await expect(fx.setState('hero')).resolves.toBe('completed');
    expect(fx.animating).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('asking again for the state it is heading to waits for the running tween', async () => {
    const fx = createStateController();
    const first = fx.setState('hero');
    fx.update(0.2);
    const repeat = fx.setState('hero');
    const settled = vi.fn();
    void repeat.then(settled);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    fx.update(0.2);
    expect(fx.animating).toBe(true);
    run(fx, 1);
    await expect(first).resolves.toBe('completed');
    await expect(repeat).resolves.toBe('completed');
  });

  it('immediate and zero-duration changes jump to the target', async () => {
    const fx = createStateController();
    await expect(fx.setState('hero', { immediate: true })).resolves.toBe('completed');
    expect(fx.values).toEqual(STATE_PRESETS.hero);
    await expect(fx.setState('transition-out', { tween: { duration: 0 } })).resolves.toBe(
      'completed',
    );
    expect(fx.values).toEqual(STATE_PRESETS['transition-out']);
    expect(fx.animating).toBe(false);
  });

  it('ignores zero, negative and non-finite deltas', () => {
    const fx = createStateController();
    void fx.setState('hero');
    const before = fx.values;
    for (const delta of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) fx.update(delta);
    expect(fx.values).toEqual(before);
    expect(fx.animating).toBe(true);
  });

  it('a long frame ends the tween exactly on the target, never past it', () => {
    const fx = createStateController();
    void fx.setState('transition-out');
    fx.update(10);
    expect(fx.values).toEqual(STATE_PRESETS['transition-out']);
  });

  it('section overrides apply when entering that section', () => {
    const fx = createStateController({ sections: { testimonials: { uDim: 0.5 } } });
    void fx.setState('section:testimonials', { immediate: true });
    expect(fx.values.uDim).toBe(0.5);
    void fx.setState('section:stats', { immediate: true });
    expect(fx.values.uDim).toBe(DEFAULT_SECTION.uDim);
  });

  it('notifies listeners once per change with the previous state', () => {
    const fx = createStateController();
    const listener = vi.fn();
    const stop = fx.onChange(listener);
    void fx.setState('transition-out');
    void fx.setState('transition-in');
    run(fx, 1);
    expect(listener.mock.calls).toEqual([
      [{ state: 'transition-out', previous: 'idle' }],
      [{ state: 'transition-in', previous: 'transition-out' }],
    ]);
    stop();
    void fx.setState('hero');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('writeUniforms copies current values into present uniforms only', () => {
    const fx = createStateController();
    void fx.setState('hero', { immediate: true });
    const uniforms = { uSpeed: { value: 0 }, uDim: { value: 0 } };
    fx.writeUniforms(uniforms);
    expect(uniforms).toEqual({
      uSpeed: { value: STATE_PRESETS.hero.uSpeed },
      uDim: { value: STATE_PRESETS.hero.uDim },
    });
  });

  it('dispose interrupts the running tween and makes later calls no-ops', async () => {
    const fx = createStateController();
    const listener = vi.fn();
    fx.onChange(listener);
    const running = fx.setState('hero');
    fx.dispose();
    await expect(running).resolves.toBe('interrupted');
    expect(fx.disposed).toBe(true);
    expect(fx.animating).toBe(false);
    await expect(fx.setState('transition-out')).resolves.toBe('interrupted');
    expect(fx.state).toBe('hero');
    expect(listener).toHaveBeenCalledTimes(1);
    fx.dispose();
  });
});
