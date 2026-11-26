// Single source of truth for site-wide facts (prd.md §6.7, tech.md §5.3). Name, URL, email,
// social links, availability, timezone and Cal.com links live only here; everything else imports
// them. Config files that cannot import TS (wrangler.jsonc, .env.example, .dev.vars.example) are
// kept in sync by tests/unit/data/site.test.ts.

export type AvailabilityStatus = 'available' | 'limited' | 'booked';

/** Month in `YYYY-MM` form, e.g. `2027-01`. */
export type YearMonth = `${number}-${number}`;

export interface Availability {
  status: AvailabilityStatus;
  /**
   * `available`: the month new projects can start (omit if right away).
   * `booked`: the month the calendar opens again. Ignored for `limited`.
   */
  from?: YearMonth;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  youtube?: string;
  clutch?: string;
  google?: string;
}

export interface Site {
  name: string;
  url: string;
  email: string;
  jobTitle: string;
  /** IANA zone for the live clock (CET/CEST) and date formatting. */
  timezone: string;
  availability: Availability;
  cal: { intro: string; consultation: string };
  /** Missing profiles are left out; components render only the links that exist. */
  social: SocialLinks;
  /** If missing, the "Meet me" button is hidden (P1.HOME.03). */
  introVideoYoutubeId?: string;
  /** True until the real face scan replaces the placeholder head (P1.FACE.02, P1.FACE.11). */
  facePlaceholder: boolean;
}

export const site: Site = {
  name: 'Zijad Lejlić',
  url: 'https://lejliczijad.com',
  email: 'support@lejliczijad.com',
  jobTitle: 'Full-Stack Developer',
  timezone: 'Europe/Sarajevo',
  // TODO(content): Zijad confirms the availability status and start month (prd.md §6.7).
  availability: { status: 'available' },
  // Event types from P0.ACC.04 and P0.ACC.05.
  cal: {
    intro: 'https://cal.com/lejliczijad/intro-15',
    consultation: 'https://cal.com/lejliczijad/consultation-45',
  },
  // TODO(content): LinkedIn, YouTube, Clutch and Google Business URLs (P0.ACC.10–13).
  social: {
    github: 'https://github.com/ZijadLejlic',
  },
  facePlaceholder: true,
};

/** `From` header for transactional email (tech.md §10); also the MAIL_FROM Worker var. */
export const MAIL_FROM = `${site.name} <${site.email}>`;

const MONTH_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function formatMonth(month: YearMonth): string {
  const [year, monthIndex] = month.split('-').map(Number);
  if (!year || !monthIndex || monthIndex < 1 || monthIndex > 12) {
    throw new Error(`Invalid availability month "${month}", expected YYYY-MM.`);
  }
  return MONTH_FORMAT.format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

/** Badge text (prd.md §6.7), e.g. "Available for new projects — January 2027". */
export function availabilityLabel(availability: Availability): string {
  switch (availability.status) {
    case 'available':
      return availability.from
        ? `Available for new projects — ${formatMonth(availability.from)}`
        : 'Available for new projects';
    case 'limited':
      return 'Limited availability';
    case 'booked':
      return availability.from
        ? `Fully booked until ${formatMonth(availability.from)}`
        : 'Fully booked';
  }
}
