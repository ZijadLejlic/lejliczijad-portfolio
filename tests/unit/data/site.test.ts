import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { availabilityLabel, MAIL_FROM, site } from '@/data/site';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

// Exact line match: values are compared as plain strings, never built into a RegExp.
const lines = (path: string) => read(path).split(/\r?\n/);

const httpsUrl = (value: string) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.pathname.endsWith('/');
};

describe('site data', () => {
  it('uses an https origin without a trailing slash', () => {
    expect(site.url).toMatch(/^https:\/\/[a-z0-9.-]+$/);
  });

  it('has a valid contact email on the site domain', () => {
    expect(site.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]+$/);
    expect(site.email.split('@')[1]).toBe(new URL(site.url).hostname);
  });

  it('uses a timezone the runtime knows', () => {
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: site.timezone })).not.toThrow();
  });

  it('links both call types to Cal.com', () => {
    for (const link of Object.values(site.cal)) {
      expect(httpsUrl(link)).toBe(true);
      expect(new URL(link).hostname).toBe('cal.com');
    }
  });

  it('only lists https social links', () => {
    for (const link of Object.values(site.social)) {
      if (link !== undefined) expect(httpsUrl(link)).toBe(true);
    }
  });

  it('builds the MAIL_FROM header from name and email', () => {
    expect(MAIL_FROM).toBe(`${site.name} <${site.email}>`);
  });

  it('produces a label for the configured availability', () => {
    expect(availabilityLabel(site.availability)).not.toBe('');
  });
});

describe('availabilityLabel', () => {
  it.each([
    [{ status: 'available' } as const, 'Available for new projects'],
    [
      { status: 'available', from: '2027-01' } as const,
      'Available for new projects — January 2027',
    ],
    [{ status: 'limited', from: '2027-01' } as const, 'Limited availability'],
    [{ status: 'booked' } as const, 'Fully booked'],
    [{ status: 'booked', from: '2027-12' } as const, 'Fully booked until December 2027'],
  ])('%o → %s', (availability, label) => {
    expect(availabilityLabel(availability)).toBe(label);
  });

  it.each(['2027-13', '2027-00'] as const)('rejects month %s', (from) => {
    expect(() => availabilityLabel({ status: 'available', from })).toThrow(/YYYY-MM/);
  });
});

// Files that cannot import site.ts must repeat its values; these tests stop them drifting apart.
describe('config files stay in sync with site.ts', () => {
  it('wrangler.jsonc vars (production and previews)', () => {
    const wrangler = read('../../../wrangler.jsonc');
    const contactTo = [...wrangler.matchAll(/"CONTACT_TO":\s*"([^"]*)"/g)].map((m) => m[1]);
    const mailFrom = [...wrangler.matchAll(/"MAIL_FROM":\s*"([^"]*)"/g)].map((m) => m[1]);
    expect(contactTo).toEqual([site.email, site.email]);
    expect(mailFrom).toEqual([MAIL_FROM, MAIL_FROM]);
  });

  it('.dev.vars.example', () => {
    const devVars = read('../../../.dev.vars.example');
    expect(lines('../../../.dev.vars.example')).toContain(`CONTACT_TO=${site.email}`);
    expect(devVars).toContain(`MAIL_FROM="${MAIL_FROM}"`);
  });

  it('.env.example', () => {
    expect(lines('../../../.env.example')).toContain(`PUBLIC_SITE_URL=${site.url}`);
  });
});
