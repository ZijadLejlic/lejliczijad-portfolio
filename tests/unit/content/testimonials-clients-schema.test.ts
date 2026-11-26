import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

import { clientSchema } from '@/content/schemas/clients';
import { QUOTE_MAX, testimonialSchema } from '@/content/schemas/testimonials';

import { issuesOf, pathsOf, without, type Input } from './helpers';

// Astro's image() and reference() only exist inside the content layer; plain strings stand in.
const testimonial = testimonialSchema({ image: () => z.string(), projectRef: z.string() });
const client = clientSchema({ image: () => z.string() });

const validTestimonial = (): Input => ({
  id: 'example-director',
  quote: 'Verbatim quote from the client.',
  author: 'Jane Doe',
  role: 'Director',
  company: 'Example Clinic',
  source: 'direct',
  date: '2026-11-01',
  consent: true,
});

const validClient = (): Input => ({
  id: 'example-clinic',
  name: 'Example Clinic',
  logo: './example-clinic.svg',
  consent: true,
});

describe('testimonials schema', () => {
  it('accepts a complete testimonial', () => {
    const result = testimonial.safeParse({
      ...validTestimonial(),
      photo: './jane.jpg',
      linkedin: 'https://www.linkedin.com/in/jane-doe/',
      projectRef: 'avicena',
      videoYoutubeId: 'dQw4w9WgXcQ',
      rating: 5,
    });
    expect(result.success).toBe(true);
    expect(result.data?.date).toBeInstanceOf(Date);
  });

  it.each([false, 'true', undefined])('rejects consent %s', (consent) => {
    expect(issuesOf(testimonial, { ...validTestimonial(), consent })).toEqual([
      {
        path: 'consent',
        message:
          'consent must be true: publish a testimonial only with the client’s written consent.',
      },
    ]);
  });

  it.each(['quote', 'author', 'role', 'company', 'source', 'date'])('requires %s', (field) => {
    expect(pathsOf(testimonial, without(validTestimonial(), field))).toContain(field);
  });

  it('caps the quote length', () => {
    expect(pathsOf(testimonial, { ...validTestimonial(), quote: 'x'.repeat(QUOTE_MAX) })).toEqual(
      [],
    );
    expect(
      pathsOf(testimonial, { ...validTestimonial(), quote: 'x'.repeat(QUOTE_MAX + 1) }),
    ).toEqual(['quote']);
  });

  it.each([0, 6, 4.5])('rejects rating %s', (rating) => {
    expect(pathsOf(testimonial, { ...validTestimonial(), rating })).toEqual(['rating']);
  });

  it.each([
    'http://www.linkedin.com/in/jane',
    'https://www.linkedin.com/company/example',
    'https://linkedin.com.evil.com/in/jane',
  ])('rejects LinkedIn URL %s', (linkedin) => {
    expect(new Set(pathsOf(testimonial, { ...validTestimonial(), linkedin }))).toEqual(
      new Set(['linkedin']),
    );
  });

  it('rejects unknown sources and fields', () => {
    expect(pathsOf(testimonial, { ...validTestimonial(), source: 'trustpilot' })).toEqual([
      'source',
    ]);
    expect(issuesOf(testimonial, { ...validTestimonial(), stars: 5 })[0]?.message).toContain(
      'Unknown field "stars"',
    );
  });
});

describe('clients schema', () => {
  it('accepts a client with a logo and optional https URL', () => {
    expect(pathsOf(client, { ...validClient(), url: 'https://example.com' })).toEqual([]);
  });

  it('requires consent, a logo and https links', () => {
    expect(pathsOf(client, { ...validClient(), consent: false })).toEqual(['consent']);
    expect(pathsOf(client, without(validClient(), 'logo'))).toEqual(['logo']);
    expect(pathsOf(client, { ...validClient(), url: 'http://example.com' })).toEqual(['url']);
  });

  it('requires a kebab-case id', () => {
    expect(pathsOf(client, { ...validClient(), id: 'Example Clinic' })).toEqual(['id']);
  });
});
