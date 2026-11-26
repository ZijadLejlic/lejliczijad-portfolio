import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import AvailabilityBadge from '@/components/ui/AvailabilityBadge.astro';
import Badge from '@/components/ui/Badge.astro';
import Tag from '@/components/ui/Tag.astro';
import { availabilityBadgeLook } from '@/components/ui/badge';
import { availabilityLabel, site, type AvailabilityStatus } from '@/data/site';

import badgeSource from '@/components/ui/Badge.astro?raw';

// Rendered output of Tag, Badge and AvailabilityBadge (P1.DS.12).
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function root(html: string): string {
  return /^<[^>]+>/.exec(html.trim())?.[0] ?? '';
}

describe('Tag', () => {
  it('renders a default span', async () => {
    const html = await container.renderToString(Tag, { slots: { default: 'Astro' } });
    expect(root(html)).toMatch(/^<span /);
    expect(root(html)).toContain('tag--default');
    expect(html).toContain('Astro');
  });

  it('renders as a list item with the accent tone and passes attributes through', async () => {
    const html = await container.renderToString(Tag, {
      props: { as: 'li', tone: 'accent', 'data-x': 'y' },
    });
    expect(root(html)).toMatch(/^<li /);
    expect(root(html)).toContain('tag--accent');
    expect(root(html)).toContain('data-x="y"');
  });
});

describe('Badge', () => {
  it('shows a hidden dot by default and never pulses unless asked', async () => {
    const html = await container.renderToString(Badge, { slots: { default: 'Live' } });
    expect(root(html)).toContain('badge--neutral');
    expect(html).toMatch(/class="badge__dot[^"]*"[^>]*aria-hidden="true"/);
    expect(html).not.toContain('badge__dot--pulse');
    expect(html).toContain('Live');
  });

  it('can drop the dot', async () => {
    const html = await container.renderToString(Badge, { props: { dot: false } });
    expect(html).not.toContain('badge__dot');
  });

  it('pulses only when pulse is set', async () => {
    const html = await container.renderToString(Badge, { props: { tone: 'success', pulse: true } });
    expect(root(html)).toContain('badge--success');
    expect(html).toContain('badge__dot--pulse');
  });

  it('stops the pulse under reduced motion', () => {
    expect(badgeSource).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.badge__dot--pulse::after\s*\{\s*animation: none;/,
    );
  });
});

describe('availabilityBadgeLook', () => {
  it.each<[AvailabilityStatus, string, boolean]>([
    ['available', 'success', true],
    ['limited', 'accent', false],
    ['booked', 'neutral', false],
  ])('%s → %s, pulse %s', (status, tone, pulse) => {
    expect(availabilityBadgeLook(status)).toEqual({ tone, pulse });
  });
});

describe('AvailabilityBadge', () => {
  it('reads site.availability when no props are given', async () => {
    const html = await container.renderToString(AvailabilityBadge);
    const { tone } = availabilityBadgeLook(site.availability.status);
    expect(root(html)).toContain(`badge--${tone}`);
    expect(root(html)).toContain(`data-availability="${site.availability.status}"`);
    expect(html).toContain(availabilityLabel(site.availability));
  });

  it.each([
    [
      { status: 'available', from: '2027-01' } as const,
      'Available for new projects — January 2027',
    ],
    [{ status: 'limited' } as const, 'Limited availability'],
    [{ status: 'booked', from: '2027-03' } as const, 'Fully booked until March 2027'],
  ])('renders %o as "%s"', async (availability, label) => {
    const html = await container.renderToString(AvailabilityBadge, { props: { availability } });
    expect(html).toContain(label);
    expect(html.includes('badge__dot--pulse')).toBe(availability.status === 'available');
  });
});
