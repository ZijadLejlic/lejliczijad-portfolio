import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Eyebrow from '@/components/ui/Eyebrow.astro';
import Heading from '@/components/ui/Heading.astro';
import Prose from '@/components/ui/Prose.astro';
import Text from '@/components/ui/Text.astro';
import { defaultHeadingSize } from '@/components/ui/typography';

import proseCss from '@/styles/prose.css?raw';

// Rendered output of the typography components (P1.DS.09).
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function root(html: string): string {
  return /^<[^>]+>/.exec(html.trim())?.[0] ?? '';
}

describe('Heading', () => {
  it.each([1, 2, 3, 4, 5, 6] as const)('renders level %i as its own element', async (level) => {
    const html = await container.renderToString(Heading, {
      props: { level },
      slots: { default: 'Title' },
    });
    expect(root(html)).toMatch(new RegExp(`^<h${level} `));
    expect(root(html)).toContain(`heading--${defaultHeadingSize(level)}`);
  });

  it('decouples the look from the level', async () => {
    const html = await container.renderToString(Heading, {
      props: { level: 2, size: 'display', id: 'hero' },
    });
    expect(root(html)).toMatch(/^<h2 /);
    expect(root(html)).toContain('heading--display');
    expect(root(html)).toContain('id="hero"');
  });

  it('maps levels 4-6 to body size', () => {
    expect(defaultHeadingSize(4)).toBe('body');
    expect(defaultHeadingSize(6)).toBe('body');
  });
});

describe('Eyebrow', () => {
  it('renders a muted paragraph by default and keeps the source text as written', async () => {
    const html = await container.renderToString(Eyebrow, { slots: { default: 'Selected work' } });
    expect(root(html)).toMatch(/^<p /);
    expect(root(html)).toContain('eyebrow--muted');
    expect(html).toContain('Selected work');
  });

  it('supports an inline element and the accent tone', async () => {
    const html = await container.renderToString(Eyebrow, { props: { as: 'span', tone: 'accent' } });
    expect(root(html)).toMatch(/^<span /);
    expect(root(html)).toContain('eyebrow--accent');
  });
});

describe('Text', () => {
  it('defaults to body size, default tone and no measure', async () => {
    const html = await container.renderToString(Text);
    expect(root(html)).toMatch(/^<p /);
    expect(root(html)).toContain('text--body');
    expect(root(html)).toContain('text--default');
    expect(root(html)).not.toContain('text--measure');
  });

  it('applies size, tone and measure', async () => {
    const html = await container.renderToString(Text, {
      props: { size: 'lead', tone: 'muted', measure: true, as: 'div' },
    });
    expect(root(html)).toMatch(/^<div /);
    expect(root(html)).toContain('text--lead');
    expect(root(html)).toContain('text--muted');
    expect(root(html)).toContain('text--measure');
  });
});

describe('Prose', () => {
  it('wraps slotted content in .prose', async () => {
    const html = await container.renderToString(Prose, {
      props: { as: 'article' },
      slots: { default: '<p>Hi</p>' },
    });
    expect(root(html)).toMatch(/^<article /);
    expect(root(html)).toContain('prose');
    expect(html).toContain('<p>Hi</p>');
  });

  it('scopes every rule under .prose, so it never styles the rest of the page', () => {
    const selectors = proseCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .map((block) => block.split('{')[0]?.trim() ?? '')
      .filter(Boolean)
      // Split selector lists on top-level commas only (not inside :is(…) or :not(…)).
      .flatMap((selector) => selector.split(/,(?![^(]*\))/).map((part) => part.trim()));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toMatch(/^\.prose\b/);
  });
});
