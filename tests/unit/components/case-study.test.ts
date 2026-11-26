import { getContainerRenderer as mdxRenderer } from '@astrojs/mdx/container-renderer';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { beforeAll, describe, expect, it } from 'vitest';

import ArchitectureDiagram from '@/components/case-study/ArchitectureDiagram.astro';
import BeforeAfter from '@/components/case-study/BeforeAfter.astro';
import Feature from '@/components/case-study/Feature.astro';
import Gallery from '@/components/case-study/Gallery.astro';
import Metric from '@/components/case-study/Metric.astro';
import Quote from '@/components/case-study/Quote.astro';
import Summary from '@/components/case-study/Summary.astro';
import VideoWalkthrough from '@/components/case-study/VideoWalkthrough.astro';
import {
  assertYoutubeId,
  linkHost,
  metricValue,
  youtubeWatchUrl,
} from '@/components/case-study/case-study';

import Example from '../../fixtures/case-study/example.mdx';
import after from '../../fixtures/case-study/images/after.png';
import before from '../../fixtures/case-study/images/before.png';
import dashboard from '../../fixtures/case-study/images/screen-dashboard.png';

// Case-study MDX components (P1.CNT.04): helpers, each component's markup, and the example MDX
// that uses all of them.
let astro: AstroContainer;

beforeAll(async () => {
  astro = await AstroContainer.create({ renderers: await loadRenderers([mdxRenderer()]) });
});

// Scoped-style attributes (data-astro-cid-*) are noise for markup assertions.
const container = {
  async renderToString(...args: Parameters<AstroContainer['renderToString']>): Promise<string> {
    const html = await astro.renderToString(...args);
    return html.replaceAll(/ data-astro-cid-[\w-]+/g, '');
  },
};

const SUMMARY = {
  client: 'Demo Clinic',
  industry: 'Healthcare',
  services: ['Web app development', 'SEO'],
  timeline: '4 months',
  stack: ['Astro', 'TypeScript'],
  role: 'Solo full-stack developer',
  result: 'Demo result.',
};

describe('helpers', () => {
  it('strips any approximate marker from a metric value', () => {
    expect(metricValue('40%')).toBe('40%');
    expect(metricValue('~40%')).toBe('40%');
    expect(metricValue(' about 40% ')).toBe('40%');
    expect(metricValue('About 3x')).toBe('3x');
    expect(() => metricValue(' ~ ')).toThrow(/must not be empty/);
  });

  it('accepts only 11-character YouTube IDs', () => {
    expect(assertYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(() => assertYoutubeId('short')).toThrow(/not a YouTube video ID/);
    expect(() => assertYoutubeId('dQw4w9WgXcQ&list=x')).toThrow();
    expect(youtubeWatchUrl('a-b_c-d_e-f')).toBe('https://www.youtube.com/watch?v=a-b_c-d_e-f');
  });

  it('shows the host of an https live link and rejects other protocols', () => {
    expect(linkHost('https://www.aps-aluminium.ba/')).toBe('aps-aluminium.ba');
    expect(linkHost('https://app.example.com/login')).toBe('app.example.com');
    expect(() => linkHost('http://example.com')).toThrow(/must be https/);
    expect(() => linkHost('data:text/html,x')).toThrow();
  });
});

describe('Summary', () => {
  it('renders a labelled description list with every field', async () => {
    const html = await container.renderToString(Summary, {
      props: { ...SUMMARY, liveUrl: 'https://www.example.com' },
    });
    expect(html).toContain('aria-label="Project summary"');
    for (const label of ['Client', 'Industry', 'Services', 'Timeline', 'Stack', 'Role', 'Live']) {
      expect(html).toContain(`<dt>${label}</dt>`);
    }
    expect(html).toMatch(/<a href="https:\/\/www\.example\.com" rel="noopener noreferrer"/);
    expect(html).toContain('>example.com</a>');
    expect(html).toContain('<li>SEO</li>');
  });

  it('leaves out the live row without a link', async () => {
    const html = await container.renderToString(Summary, { props: SUMMARY });
    expect(html).not.toContain('<dt>Live</dt>');
  });

  it('escapes text props', async () => {
    const html = await container.renderToString(Summary, {
      props: { ...SUMMARY, client: '<script>alert(1)</script>' },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Feature', () => {
  it('renders an h3 and a responsive AVIF/WebP picture with alt', async () => {
    const html = await container.renderToString(Feature, {
      props: { title: 'Online booking', image: { src: dashboard, alt: 'Booking screen' } },
      slots: { default: '<p>Text</p>' },
    });
    expect(html).toMatch(/<h3[^>]*>Online booking<\/h3>/);
    expect(html).toContain('type="image/avif"');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain('alt="Booking screen"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('feature--media');
  });

  it('supports h4, reverse order and no image', async () => {
    const html = await container.renderToString(Feature, {
      props: { title: 'Reports', level: 4, reverse: true },
    });
    expect(html).toMatch(/<h4[^>]*>Reports<\/h4>/);
    expect(html).toContain('feature--reverse');
    expect(html).not.toContain('<picture');
    expect(html).not.toContain('feature--media');
  });
});

describe('ArchitectureDiagram', () => {
  it('wraps the SVG in a figure with a caption', async () => {
    const html = await container.renderToString(ArchitectureDiagram, {
      props: { caption: 'How it fits together' },
      slots: { default: '<svg role="img"><title>Diagram</title></svg>' },
    });
    expect(html).toMatch(/^<figure/);
    expect(html).toContain('<svg role="img"><title>Diagram</title></svg>');
    expect(html).toMatch(/<figcaption[^>]*>How it fits together<\/figcaption>/);
  });
});

describe('Gallery', () => {
  it('renders a labelled list of figures, captions only where given', async () => {
    const html = await container.renderToString(Gallery, {
      props: {
        label: 'Screens',
        images: [
          { src: before, alt: 'First', caption: 'Caption one' },
          { src: after, alt: 'Second' },
        ],
      },
    });
    expect(html).toMatch(/<ul role="list"[^>]*aria-label="Screens"/);
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html.match(/<figcaption/g)).toHaveLength(1);
    expect(html).toContain('alt="Second"');
  });

  it('fails the build on an empty gallery', async () => {
    await expect(
      container.renderToString(Gallery, { props: { label: 'Empty', images: [] } }),
    ).rejects.toThrow(/must not be empty/);
  });
});

describe('Metric', () => {
  it('marks approximate numbers with "~" and says "about" to screen readers', async () => {
    const html = await container.renderToString(Metric, {
      props: { value: 'about 40%', label: 'less paperwork', approximate: true, source: 'intake' },
    });
    expect(html).toContain('<span aria-hidden="true">~</span>');
    expect(html).toMatch(/class="metric__sr[^"]*">about <\/span>40%/);
    expect(html).toContain('less paperwork');
    expect(html).not.toContain('intake');
  });

  it('shows exact numbers as given', async () => {
    const html = await container.renderToString(Metric, {
      props: { value: '120', label: 'clinics', approximate: false, source: 'intake' },
    });
    expect(html).not.toContain('~');
    expect(html).toContain('120');
  });

  it('fails the build without a source', async () => {
    await expect(
      container.renderToString(Metric, {
        props: { value: '1', label: 'x', approximate: false, source: ' ' },
      }),
    ).rejects.toThrow(/source must not be empty/);
  });
});

describe('Quote', () => {
  it('renders a blockquote with the author in the caption', async () => {
    const html = await container.renderToString(Quote, {
      props: { quote: 'It works.', author: 'Ana', role: 'Director', company: 'Demo' },
    });
    expect(html).toMatch(/<blockquote[^>]*>\s*<p>It works\.<\/p>/);
    expect(html).toContain('Ana');
    expect(html).toContain('Director, Demo');
    expect(html).not.toContain('<picture');
  });
});

describe('BeforeAfter', () => {
  it('renders both labelled sides and the caption', async () => {
    const html = await container.renderToString(BeforeAfter, {
      props: {
        caption: 'Old vs new',
        before: { src: before, alt: 'Old screen' },
        after: { src: after, alt: 'New screen' },
      },
    });
    expect(html).toContain('>Before</span>');
    expect(html).toContain('>After</span>');
    expect(html).toContain('alt="Old screen"');
    expect(html).toContain('alt="New screen"');
    expect(html).toMatch(/<figcaption[^>]*>Old vs new<\/figcaption>/);
  });
});

describe('VideoWalkthrough', () => {
  it('links to YouTube and loads nothing from YouTube before the click', async () => {
    const html = await container.renderToString(VideoWalkthrough, {
      props: { youtubeId: 'dQw4w9WgXcQ', title: 'Walkthrough', duration: '2:40' },
      slots: { default: '<p>Transcript text</p>' },
    });
    expect(html).toContain('href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
    expect(html).not.toMatch(/<iframe|ytimg|<script/);
    expect(html).toContain('Watch on YouTube · 2:40');
    expect(html).toMatch(/<details[^>]*>\s*<summary>Transcript<\/summary>/);
  });

  it('has no transcript block without one, and rejects a bad ID', async () => {
    const html = await container.renderToString(VideoWalkthrough, {
      props: { youtubeId: 'dQw4w9WgXcQ', title: 'Walkthrough' },
    });
    expect(html).not.toContain('<details');
    await expect(
      container.renderToString(VideoWalkthrough, { props: { youtubeId: 'x', title: 'Bad' } }),
    ).rejects.toThrow(/not a YouTube video ID/);
  });
});

describe('example MDX', () => {
  it('renders with every case-study component', async () => {
    const html = await container.renderToString(Example);
    for (const marker of [
      'aria-label="Project summary"', // Summary
      'class="feature', // Feature
      'class="diagram', // ArchitectureDiagram
      'aria-label="Demo screens"', // Gallery
      'class="metric', // Metric
      'class="quote', // Quote
      'class="before-after', // BeforeAfter
      'class="video', // VideoWalkthrough
    ]) {
      expect(html).toContain(marker);
    }
    expect(html).not.toContain('<h1');
  });
});
