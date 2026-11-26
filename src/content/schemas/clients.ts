// Contract for `src/content/clients/<id>.json` (tech.md §5.2). Client names and logos appear only
// with permission (AGENTS.md §7), so `consent` must be literally `true`.

import { z } from 'astro/zod';

import { httpsUrl, kebabCase, strictObject, text } from './shared';

const FILE = 'clients.ts';

export interface ClientSchemaDeps<Image extends z.ZodType> {
  /** `image()`: SVG, PNG or other raster logo next to the JSON file. */
  image: () => Image;
}

export function clientSchema<Image extends z.ZodType>({ image }: ClientSchemaDeps<Image>) {
  return strictObject(FILE, {
    id: kebabCase('id', 'karamujic-petrol'),
    name: text('name'),
    logo: image(),
    url: httpsUrl('url').optional(),
    consent: z.literal(true, {
      error: 'consent must be true: show a client name or logo only with their permission.',
    }),
  });
}
