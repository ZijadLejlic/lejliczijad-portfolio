import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Modal from '@/components/ui/Modal.astro';
import {
  modalClasses,
  modalIds,
  modalTriggerAttributes,
  scrollLockValue,
  trapFocusIndex,
} from '@/components/ui/modal';

import modalCss from '@/styles/modal.css?raw';

// Pure helpers and rendered markup of Modal (P1.DS.19). Keyboard behavior (focus trap, Esc,
// focus return, scroll lock) runs in real browsers in tests/e2e/modal.spec.ts.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return container.renderToString(Modal, { props, slots: { default: '<p>Body</p>', ...slots } });
}

function dialogTag(html: string): string {
  return /<dialog\b[^>]*>/.exec(html)?.[0] ?? '';
}

describe('trapFocusIndex', () => {
  it('wraps forward from the last element and backward from the first', () => {
    expect(trapFocusIndex(2, 3, false)).toBe(0);
    expect(trapFocusIndex(0, 3, true)).toBe(2);
  });

  it('lets the browser move focus between inner elements', () => {
    expect(trapFocusIndex(0, 3, false)).toBeNull();
    expect(trapFocusIndex(1, 3, true)).toBeNull();
  });

  it('pulls focus back in when it is on none of the elements', () => {
    expect(trapFocusIndex(-1, 3, false)).toBe(0);
    expect(trapFocusIndex(-1, 3, true)).toBe(2);
  });

  it('keeps a single element focused and does nothing without elements', () => {
    expect(trapFocusIndex(0, 1, false)).toBe(0);
    expect(trapFocusIndex(0, 1, true)).toBe(0);
    expect(trapFocusIndex(-1, 0, false)).toBeNull();
  });
});

describe('scrollLockValue', () => {
  it('reserves the gutter only when there was a scrollbar', () => {
    expect(scrollLockValue(15)).toBe('gutter');
    expect(scrollLockValue(0)).toBe('plain');
  });
});

describe('modal helpers', () => {
  it('maps size to classes and id to title and description ids', () => {
    expect(modalClasses('lg')).toEqual(['modal', 'modal--lg']);
    expect(modalIds('meet-me')).toEqual({
      title: 'meet-me-title',
      description: 'meet-me-description',
    });
  });

  it('gives a trigger its target and popup semantics', () => {
    expect(modalTriggerAttributes('meet-me')).toEqual({
      'data-modal-open': 'meet-me',
      'aria-haspopup': 'dialog',
      'aria-controls': 'meet-me',
    });
  });
});

describe('Modal', () => {
  it('renders a closed native dialog named by its title', async () => {
    const html = await render({ id: 'demo', title: 'Meet Zijad' });
    const tag = dialogTag(html);
    expect(tag).toContain('id="demo"');
    expect(tag).toContain('aria-labelledby="demo-title"');
    expect(tag).not.toContain('aria-describedby');
    expect(tag).not.toMatch(/\sopen\b/);
    expect(tag).toMatch(/class="modal modal--md/);
    expect(tag).toContain('data-motion="fade"');
    expect(html).toMatch(/<h2 id="demo-title" class="modal__title"[^>]*>Meet Zijad<\/h2>/);
    expect(html).toContain('<p>Body</p>');
  });

  it('has a named close button that closes the dialog', async () => {
    const html = await render({ id: 'demo', title: 'T' });
    expect(html).toMatch(
      /<button type="button" class="modal__close"[^>]*aria-label="Close dialog"[^>]*data-modal-close/,
    );
    const custom = await render({ id: 'demo', title: 'T', closeLabel: 'Close video' });
    expect(custom).toContain('aria-label="Close video"');
  });

  it('links the description and supports a level-3 title', async () => {
    const html = await render({ id: 'x', title: 'T', description: 'More', titleLevel: 3 });
    expect(dialogTag(html)).toContain('aria-describedby="x-description"');
    expect(html).toContain('<p id="x-description" class="modal__description"');
    expect(html).toMatch(/<h3 id="x-title"/);
  });

  it('closes on the backdrop by default, not when turned off', async () => {
    expect(dialogTag(await render({ id: 'a', title: 'T' }))).toContain('data-backdrop-close');
    expect(dialogTag(await render({ id: 'a', title: 'T', closeOnBackdrop: false }))).not.toContain(
      'data-backdrop-close',
    );
  });

  it('renders the footer only when the slot is filled', async () => {
    expect(await render({ id: 'a', title: 'T' })).not.toContain('modal__footer');
    expect(await render({ id: 'a', title: 'T' }, { footer: '<button>OK</button>' })).toContain(
      'class="modal__footer"',
    );
  });
});

describe('modal.css', () => {
  it('scopes every rule under .modal (or the html scroll lock)', () => {
    const selectors = modalCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@(media|starting-style)[^{]*\{/g, '')
      .match(/(^|\})\s*([^{}@]+)\{/g)
      ?.map((match) =>
        match
          .replace(/^\}?\s*/, '')
          .replace(/\{$/, '')
          .trim(),
      )
      .filter(Boolean);
    expect(selectors?.length).toBeGreaterThan(0);
    for (const selector of selectors ?? []) {
      for (const part of selector.split(/,(?![^(]*\))/)) {
        expect(part.trim()).toMatch(/^(\.modal|html\[data-scroll-lock)/);
      }
    }
  });
});
