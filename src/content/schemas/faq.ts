// Contract for `src/content/faq/<group>.json` (tech.md §5.2, groups in prd.md §7.12). The file
// name is the group's ID; `group` is the heading shown on /faq.

import { z } from 'astro/zod';

import { kebabCase, strictObject, text } from './shared';

const FILE = 'faq.ts';

export function faqSchema() {
  return strictObject(FILE, {
    group: text('group'),
    items: z
      .array(
        strictObject(FILE, {
          // Anchor on /faq (#id), so it stays stable once published.
          id: kebabCase('items.id', 'payment-methods'),
          q: text('items.q'),
          a: text('items.a'),
        }),
      )
      .min(1, { error: 'items needs at least 1 question.' })
      .superRefine((items, ctx) => {
        const seen = new Set<string>();
        items.forEach((item, index) => {
          if (seen.has(item.id)) {
            ctx.addIssue({
              code: 'custom',
              path: [index, 'id'],
              message: `items.id "${item.id}" is used more than once.`,
            });
          }
          seen.add(item.id);
        });
      }),
  });
}
