import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Cluster from '@/components/ui/Cluster.astro';
import Container from '@/components/ui/Container.astro';
import Grid from '@/components/ui/Grid.astro';
import Section from '@/components/ui/Section.astro';
import Stack from '@/components/ui/Stack.astro';

// Rendered output of the layout primitives (P1.DS.08): element, classes, gap attribute, list role.
let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

function root(html: string): string {
  return /^<[^>]+>/.exec(html.trim())?.[0] ?? '';
}

describe('Container', () => {
  it('renders a div with the default width and passes attributes through', async () => {
    const html = await container.renderToString(Container, {
      props: { id: 'page', class: 'extra' },
      slots: { default: 'x' },
    });
    expect(root(html)).toMatch(/^<div /);
    expect(root(html)).toContain('container--default');
    expect(root(html)).toContain('extra');
    expect(root(html)).toContain('id="page"');
  });

  it('supports the prose width and another element', async () => {
    const html = await container.renderToString(Container, {
      props: { as: 'article', width: 'prose' },
    });
    expect(root(html)).toMatch(/^<article /);
    expect(root(html)).toContain('container--prose');
  });
});

describe('Section', () => {
  it('renders a section with a Container inside by default', async () => {
    const html = await container.renderToString(Section, {
      props: { 'aria-labelledby': 'title' },
      slots: { default: '<h2 id="title">Hi</h2>' },
    });
    expect(root(html)).toMatch(/^<section /);
    expect(root(html)).toContain('section--default');
    expect(root(html)).toContain('aria-labelledby="title"');
    expect(html).toContain('container--default');
  });

  it('can drop the Container and the padding', async () => {
    const html = await container.renderToString(Section, {
      props: { contained: false, spacing: 'none' },
      slots: { default: 'x' },
    });
    expect(html).toContain('section--none');
    expect(html).not.toContain('container--');
  });
});

describe.each([
  ['Stack', Stack, '5'],
  ['Cluster', Cluster, '3'],
  ['Grid', Grid, '5'],
] as const)('%s', (_name, component, defaultGap) => {
  it('always renders a gap step, so nested primitives never inherit one', async () => {
    const html = await container.renderToString(component);
    expect(root(html)).toContain(`data-layout-gap="${defaultGap}"`);
  });

  it('uses the gap it is given', async () => {
    const html = await container.renderToString(component, { props: { gap: 8 } });
    expect(root(html)).toContain('data-layout-gap="8"');
  });

  it('keeps list semantics when rendered as a list', async () => {
    const html = await container.renderToString(component, { props: { as: 'ul' } });
    expect(root(html)).toMatch(/^<ul /);
    expect(root(html)).toContain('role="list"');
  });

  it('adds no role to a div', async () => {
    const html = await container.renderToString(component);
    expect(root(html)).not.toContain('role=');
  });
});

describe('modifiers', () => {
  it('maps Grid min and Cluster justify/align to classes', async () => {
    expect(await container.renderToString(Grid, { props: { min: 'lg' } })).toContain('grid--lg');
    const cluster = await container.renderToString(Cluster, {
      props: { justify: 'between', align: 'baseline' },
    });
    expect(cluster).toContain('cluster--justify-between');
    expect(cluster).toContain('cluster--align-baseline');
    expect(await container.renderToString(Stack, { props: { align: 'center' } })).toContain(
      'stack--center',
    );
  });
});
