// Icon set for Icon.astro (P1.DS.13). Shapes are copied from Lucide (lucide-static 1.83.0,
// https://lucide.dev), ISC License, Copyright (c) 2026 Lucide Icons and Contributors; some icons
// derive from Feather (MIT). Notice and list in docs/licenses.md. Only the icons the site uses are
// here, as data rather than SVG strings, so Icon renders real elements and never needs set:html.
// To add one: copy the child elements of the icon's SVG from lucide.dev unchanged, keep the list
// sorted, and add a row to docs/licenses.md.

export type IconNode =
  | readonly ['path', { readonly d: string }]
  | readonly ['circle', { readonly cx: string; readonly cy: string; readonly r: string }]
  | readonly [
      'rect',
      {
        readonly x: string;
        readonly y: string;
        readonly width: string;
        readonly height: string;
        readonly rx?: string;
      },
    ];

export const ICONS = {
  'arrow-down': [
    ['path', { d: 'M12 5v14' }],
    ['path', { d: 'm19 12-7 7-7-7' }],
  ],
  'arrow-left': [
    ['path', { d: 'm12 19-7-7 7-7' }],
    ['path', { d: 'M19 12H5' }],
  ],
  'arrow-right': [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'm12 5 7 7-7 7' }],
  ],
  'arrow-up-right': [
    ['path', { d: 'M7 7h10v10' }],
    ['path', { d: 'M7 17 17 7' }],
  ],
  calendar: [
    ['path', { d: 'M8 2v3' }],
    ['path', { d: 'M16 2v3' }],
    ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }],
    ['path', { d: 'M3 9h18' }],
  ],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  'chevron-down': [['path', { d: 'm6 9 6 6 6-6' }]],
  'chevron-left': [['path', { d: 'm15 18-6-6 6-6' }]],
  'chevron-right': [['path', { d: 'm9 18 6-6-6-6' }]],
  clock: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 6v6l4 2' }],
  ],
  mail: [
    ['path', { d: 'm22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7' }],
    ['rect', { x: '2', y: '4', width: '20', height: '16', rx: '2' }],
  ],
  'map-pin': [
    [
      'path',
      {
        d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
      },
    ],
    ['circle', { cx: '12', cy: '10', r: '3' }],
  ],
  menu: [
    ['path', { d: 'M4 5h16' }],
    ['path', { d: 'M4 12h16' }],
    ['path', { d: 'M4 19h16' }],
  ],
  play: [
    [
      'path',
      {
        d: 'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z',
      },
    ],
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
} as const satisfies Record<string, readonly IconNode[]>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/**
 * `inherit` (default) is 1em, so the icon follows the surrounding text and a container such as
 * Button or Link can size it; the others are fixed steps from tokens.css (--icon-size-*).
 */
export type IconSize = 'inherit' | 'sm' | 'md' | 'lg';

/** Element list for an icon; throws for a name outside the set, so a typo fails the build. */
export function iconNodes(name: string): readonly IconNode[] {
  if (!Object.hasOwn(ICONS, name)) {
    throw new Error(`Icon: "${name}" is not in the icon set (src/components/ui/icons.ts).`);
  }
  return ICONS[name as IconName];
}

/**
 * Accessibility attributes: decorative by default (hidden from assistive tech); with a label the
 * icon is an image with that accessible name. A blank label counts as none.
 */
export function iconA11y(label: string | undefined): Record<string, string> {
  const name = label?.trim();
  return name ? { role: 'img', 'aria-label': name } : { 'aria-hidden': 'true' };
}
