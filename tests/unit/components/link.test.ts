import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Link from '@/components/ui/Link.astro';
import { classifyHref, linkClasses, mergeRel } from '@/components/ui/link';

import linkCss from '@/styles/link.css?raw';

// Link (P1.DS.11): href classification, rel and the rendered attributes for each kind of link.
// Hover and keyboard behavior is covered in tests/e2e/link.spec.ts.
const SITE = 'https://lejliczijad.com';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function root(html: string): string {
  return /^<a\b[^>]*>/.exec(html.trim())?.[0] ?? '';
}

async function render(props: Record<string, unknown>) {
  return container.renderToString(Link, { props, slots: { default: 'Label' } });
}

describe('classifyHref', () => {
  it.each([
    '/work',
    '#contact',
    '?type=app',
    'work/avicena',
    './about',
    'https://lejliczijad.com/work',
    'https://www.lejliczijad.com',
    'HTTPS://LejlicZijad.com/about',
  ])('treats %s as internal', (href) => {
    expect(classifyHref(href, SITE)).toBe('internal');
  });

  it.each([
    'https://github.com/ZijadLejlic',
    'http://example.com',
    '//cal.com/lejliczijad',
    // A look-alike host is another site.
    'https://lejliczijad.com.evil.com',
    'https://evil-lejliczijad.com',
  ])('treats %s as external', (href) => {
    expect(classifyHref(href, SITE)).toBe('external');
  });

  it.each(['mailto:support@lejliczijad.com', 'tel:+38761000000'])(
    'treats %s as contact',
    (href) => {
      expect(classifyHref(href, SITE)).toBe('contact');
    },
  );

  it.each([
    // eslint-disable-next-line no-script-url -- the test proves these URLs are rejected
    'javascript:alert(1)',
    ' JavaScript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
  ])('rejects %j', (href) => {
    expect(() => classifyHref(href, SITE)).toThrow(/not allowed/);
  });

  it('rejects an href that does not parse', () => {
    expect(() => classifyHref('https://', SITE)).toThrow(/not a valid URL/);
  });
});

describe('mergeRel', () => {
  it('leaves an internal same-tab link alone', () => {
    expect(mergeRel(undefined, { external: false, newTab: false })).toBeUndefined();
    expect(mergeRel('next', { external: false, newTab: false })).toBe('next');
  });

  it('adds noopener noreferrer for external links and new tabs, keeping tokens once', () => {
    expect(mergeRel(undefined, { external: true, newTab: false })).toBe('noopener noreferrer');
    expect(mergeRel(undefined, { external: false, newTab: true })).toBe('noopener noreferrer');
    expect(mergeRel('me noopener', { external: true, newTab: true })).toBe(
      'me noopener noreferrer',
    );
  });
});

describe('linkClasses', () => {
  it('maps the variant to a modifier', () => {
    expect(linkClasses('quiet')).toEqual(['link', 'link--quiet']);
  });
});

describe('Link', () => {
  it('renders an internal link without icon, target, rel or hint', async () => {
    const html = await render({ href: '/work' });
    const tag = root(html);
    expect(tag).toContain('href="/work"');
    expect(tag).toContain('link--inline');
    expect(tag).not.toContain('target=');
    expect(tag).not.toContain('rel=');
    expect(tag).not.toContain('data-cursor');
    expect(html).not.toContain('link__icon');
    expect(html).not.toContain('link__hint');
    expect(html).toContain('<span class="link__label">Label</span>');
  });

  it('detects an external link: icon, new tab, rel, hint and the open cursor', async () => {
    const html = await render({ href: 'https://github.com/ZijadLejlic' });
    const tag = root(html);
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
    expect(tag).toContain('data-cursor="open"');
    expect(html).toMatch(/<svg class="link__icon"[^>]*aria-hidden="true"/);
    expect(html).toContain('(opens in a new tab)');
  });

  it('keeps an external link in the same tab when asked, still with rel and icon', async () => {
    const html = await render({ href: 'https://example.com', newTab: false });
    const tag = root(html);
    expect(tag).not.toContain('target=');
    expect(tag).toContain('rel="noopener noreferrer"');
    expect(html).toContain('link__icon');
    expect(html).not.toContain('link__hint');
  });

  it('treats an absolute URL on the site host as internal', async () => {
    const html = await render({ href: 'https://lejliczijad.com/about' });
    expect(root(html)).not.toContain('target=');
    expect(html).not.toContain('link__icon');
  });

  it('renders mailto as a same-tab link without the external icon', async () => {
    const html = await render({ href: 'mailto:support@lejliczijad.com', variant: 'quiet' });
    const tag = root(html);
    expect(tag).toContain('link--quiet');
    expect(tag).not.toContain('target=');
    expect(html).not.toContain('link__icon');
  });

  it('lets the caller override detection and pass attributes through', async () => {
    const html = await render({
      href: '/files/cv.pdf',
      external: true,
      newTabLabel: '(PDF, new tab)',
      class: 'extra',
      'data-cursor': 'view',
      rel: 'nofollow',
    });
    const tag = root(html);
    expect(tag).toContain('extra');
    expect(tag).toContain('data-cursor="view"');
    expect(tag).toContain('rel="nofollow noopener noreferrer"');
    expect(html).toContain('(PDF, new tab)');
  });

  it('trims a label written over several lines, so no space sits under the underline', async () => {
    const html = await container.renderToString(Link, {
      props: { href: '/work' },
      slots: { default: '\n    Selected <em>work</em>\n  ' },
    });
    expect(html).toContain('<span class="link__label">Selected <em>work</em></span>');
  });

  it('fails the render for an unsafe scheme', async () => {
    // eslint-disable-next-line no-script-url -- the test proves the URL is rejected
    await expect(render({ href: 'javascript:alert(1)' })).rejects.toThrow(/not allowed/);
  });
});

describe('link.css', () => {
  it('scopes every rule to .link', () => {
    const selectors = linkCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@media[^{]+\{/g, '')
      .match(/[^{}]+(?=\{)/g);
    expect(selectors).not.toBeNull();
    for (const selector of selectors ?? []) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        expect(part.trim()).toMatch(/^\.link/);
      }
    }
  });
});
