import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Icon from '@/components/ui/Icon.astro';
import { ICON_NAMES, ICONS, iconA11y, iconNodes } from '@/components/ui/icons';

import iconSource from '@/components/ui/Icon.astro?raw';

// Icon (P1.DS.13): typed set, decorative by default, inline SVG only.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function svgTag(html: string): string {
  return /<svg[^>]*>/.exec(html)?.[0] ?? '';
}

describe('icon set', () => {
  it('is sorted and every icon has at least one shape', () => {
    expect(ICON_NAMES).toEqual([...ICON_NAMES].sort());
    for (const name of ICON_NAMES) expect(ICONS[name].length).toBeGreaterThan(0);
  });

  it('rejects a name outside the set, including inherited object keys', () => {
    expect(() => iconNodes('rocket')).toThrow(/not in the icon set/);
    expect(() => iconNodes('toString')).toThrow(/not in the icon set/);
    expect(iconNodes('x')).toBe(ICONS.x);
  });

  it('is decorative without a label and an image with one', () => {
    expect(iconA11y(undefined)).toEqual({ 'aria-hidden': 'true' });
    expect(iconA11y('   ')).toEqual({ 'aria-hidden': 'true' });
    expect(iconA11y(' Done ')).toEqual({ role: 'img', 'aria-label': 'Done' });
  });
});

describe('Icon', () => {
  it('renders a decorative inline SVG that follows the text color', async () => {
    const html = await container.renderToString(Icon, { props: { name: 'arrow-right' } });
    const tag = svgTag(html);
    expect(tag).toContain('aria-hidden="true"');
    expect(tag).toContain('focusable="false"');
    expect(tag).toContain('stroke="currentColor"');
    expect(tag).toContain('viewBox="0 0 24 24"');
    expect(tag).toContain('data-icon="arrow-right"');
    expect(tag).not.toContain('role=');
    expect(tag).not.toMatch(/icon--/);
    expect(html).toContain('<path d="M5 12h14"');
    expect(html).toContain('<path d="m12 5 7 7-7 7"');
  });

  it('renders every shape type of an icon', async () => {
    const html = await container.renderToString(Icon, { props: { name: 'mail' } });
    expect(html).toContain('<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"');
    expect(html).toMatch(/<rect x="2" y="4" width="20" height="16" rx="2"/);
    const clock = await container.renderToString(Icon, { props: { name: 'clock' } });
    expect(clock).toMatch(/<circle cx="12" cy="12" r="10"/);
  });

  it('becomes role="img" with an accessible name when labelled', async () => {
    const html = await container.renderToString(Icon, { props: { name: 'check', label: 'Done' } });
    const tag = svgTag(html);
    expect(tag).toContain('role="img"');
    expect(tag).toContain('aria-label="Done"');
    expect(tag).not.toContain('aria-hidden');
  });

  it('adds the size class and keeps extra classes and attributes', async () => {
    const html = await container.renderToString(Icon, {
      props: { name: 'x', size: 'lg', class: 'extra', 'data-x': 'y' },
    });
    const tag = svgTag(html);
    expect(tag).toMatch(/class="[^"]*\bicon\b[^"]*icon--lg[^"]*extra/);
    expect(tag).toContain('data-x="y"');
  });

  it('cannot be made visible to assistive tech by a stray aria-hidden="false"', async () => {
    // aria-hidden is not in Props; a caller who forces it still gets the decorative default.
    const html = await container.renderToString(Icon, {
      props: { name: 'x', 'aria-hidden': 'false' } as never,
    });
    expect(svgTag(html)).toContain('aria-hidden="true"');
  });

  it('never injects markup as a string', () => {
    expect(iconSource).not.toMatch(/set:html=|innerHTML/);
  });
});
