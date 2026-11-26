import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Button from '@/components/ui/Button.astro';
import { buttonClasses, linkRel } from '@/components/ui/button';

import buttonCss from '@/styles/button.css?raw';

// Rendered output of Button (P1.DS.10): element, classes and the attributes behind each state.
// Keyboard behavior (focus order, inert loading button) is covered in tests/e2e/button.spec.ts.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function root(html: string): string {
  return /^<(button|a)\b[^>]*>/.exec(html.trim())?.[0] ?? '';
}

async function render(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return container.renderToString(Button, { props, slots: { default: 'Label', ...slots } });
}

describe('buttonClasses', () => {
  it('maps variant, size and block to classes', () => {
    expect(buttonClasses({ variant: 'ghost', size: 'lg' })).toEqual([
      'button',
      'button--ghost',
      'button--lg',
    ]);
    expect(buttonClasses({ variant: 'primary', size: 'md', block: true })).toContain(
      'button--block',
    );
  });
});

describe('linkRel', () => {
  it('leaves same-tab links alone', () => {
    expect(linkRel(undefined, undefined)).toBeUndefined();
    expect(linkRel('_self', 'me')).toBe('me');
  });

  it('always adds noopener noreferrer for a new tab, keeping other tokens once', () => {
    expect(linkRel('_blank', undefined)).toBe('noopener noreferrer');
    expect(linkRel('_blank', 'me noopener')).toBe('me noopener noreferrer');
  });
});

describe('Button as <button>', () => {
  it('defaults to a primary md button of type="button"', async () => {
    const tag = root(await render({}));
    expect(tag).toMatch(/^<button /);
    expect(tag).toContain('type="button"');
    expect(tag).toContain('button--primary');
    expect(tag).toContain('button--md');
    expect(tag).not.toContain('disabled');
    expect(tag).not.toContain('aria-disabled');
  });

  it('lets a form button be a submit button and passes attributes through', async () => {
    const tag = root(await render({ type: 'submit', id: 'send', class: 'extra' }));
    expect(tag).toContain('type="submit"');
    expect(tag).toContain('id="send"');
    expect(tag).toContain('extra');
  });

  it('uses native disabled when disabled', async () => {
    const tag = root(await render({ disabled: true }));
    expect(tag).toMatch(/\sdisabled(\s|>|=)/);
    expect(tag).not.toContain('data-loading');
  });

  it('stays focusable while loading: aria-disabled, spinner and a spoken status', async () => {
    const html = await render({ loading: true, loadingLabel: 'Sending' });
    const tag = root(html);
    expect(tag).not.toMatch(/\sdisabled(\s|>|=)/);
    expect(tag).toContain('aria-disabled="true"');
    expect(tag).toContain('data-loading');
    expect(html).toContain('button__spinner');
    expect(html).toMatch(/<span class="button__status"[^>]*>Sending<\/span>/);
    expect(html).toContain('Label');
  });

  it('lets disabled win over loading', async () => {
    const html = await render({ disabled: true, loading: true });
    expect(root(html)).not.toContain('data-loading');
    expect(html).not.toContain('button__spinner');
  });
});

describe('Button as <a>', () => {
  it('renders a link when href is set', async () => {
    const tag = root(await render({ href: '/contact', variant: 'secondary' }));
    expect(tag).toMatch(/^<a /);
    expect(tag).toContain('href="/contact"');
    expect(tag).toContain('button--secondary');
    expect(tag).not.toContain('type=');
    expect(tag).not.toContain('role=');
  });

  it('adds rel for a new tab', async () => {
    const tag = root(await render({ href: 'https://example.com', target: '_blank' }));
    expect(tag).toContain('rel="noopener noreferrer"');
  });

  it('drops the href when disabled but stays a link for assistive tech', async () => {
    const tag = root(await render({ href: '/contact', disabled: true }));
    expect(tag).not.toContain('href=');
    expect(tag).toContain('role="link"');
    expect(tag).toContain('aria-disabled="true"');
  });
});

describe('icons', () => {
  it('wraps icon slots in aria-hidden boxes around the label', async () => {
    const html = await render({}, { 'icon-start': '<svg></svg>', 'icon-end': '<svg></svg>' });
    const boxes = html.match(/<span class="button__icon"[^>]*aria-hidden="true"/g) ?? [];
    expect(boxes).toHaveLength(2);
    expect(html.indexOf('button__label')).toBeGreaterThan(html.indexOf('button__icon'));
  });

  it('renders no icon box without icons', async () => {
    expect(await render({})).not.toContain('button__icon');
  });
});

describe('button.css', () => {
  it('scopes every rule under .button, so the global sheet cannot leak', () => {
    const selectors = buttonCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '')
      .match(/(^|\})\s*([^{}@]+)\{/g)
      ?.map((match) =>
        match
          .replace(/^\}?\s*/, '')
          .replace(/\{$/, '')
          .trim(),
      );
    expect(selectors?.length).toBeGreaterThan(0);
    for (const selector of selectors ?? []) {
      // Split on top-level commas only, not the ones inside :is() / :not().
      for (const part of selector.split(/,(?![^(]*\))/)) expect(part.trim()).toMatch(/^\.button/);
    }
  });

  it('takes control heights from tokens, so the touch target is set in one place', () => {
    const heights = buttonCss.match(/min-block-size:[^;]+;/g) ?? [];
    expect(heights.length).toBeGreaterThan(0);
    for (const height of heights) expect(height).toMatch(/var\(--control-height-(sm|md|lg)\)/);
  });
});
