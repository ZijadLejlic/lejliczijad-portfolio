// Shared prop types and mappings for Tag, Badge and AvailabilityBadge (P1.DS.12).

import type { AvailabilityStatus } from '@/data/site';

/** Tag color: `default` for stack and topic tags, `accent` to single one out (e.g. "Full case study"). */
export type TagTone = 'default' | 'accent';

/**
 * Color of a badge's status dot. The text always stays `--color-text`, so the meaning never
 * rides on color alone (WCAG 1.4.1); the dot is decoration.
 */
export type BadgeTone = 'neutral' | 'accent' | 'success';

export interface AvailabilityBadgeLook {
  tone: BadgeTone;
  /** Only open availability pulses (prd.md §6.7: "green pulsing dot"). */
  pulse: boolean;
}

/** How each availability status looks: green and pulsing when open, quieter otherwise. */
export function availabilityBadgeLook(status: AvailabilityStatus): AvailabilityBadgeLook {
  switch (status) {
    case 'available':
      return { tone: 'success', pulse: true };
    case 'limited':
      return { tone: 'accent', pulse: false };
    case 'booked':
      return { tone: 'neutral', pulse: false };
  }
}
