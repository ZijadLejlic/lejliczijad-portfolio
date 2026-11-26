// Building blocks shared by the content collection schemas (tech.md §5.2). Messages are written
// for whoever edits the content file: Astro prints them next to the field path when the build fails.

import { z } from 'astro/zod';

import { SEO_DESCRIPTION_MAX, SEO_DESCRIPTION_MIN, SEO_TITLE_MAX } from './projects';

export const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// YouTube video IDs are 11 URL-safe base64 characters.
export const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export const text = (field: string) =>
  z
    .string({ error: `${field} is required.` })
    .trim()
    .min(1, { error: `${field} must not be empty.` });

export const kebabCase = (field: string, example: string) =>
  z.string({ error: `${field} is required.` }).regex(KEBAB_CASE, {
    error: `${field} must be lowercase kebab-case, e.g. "${example}".`,
  });

export const youtubeId = (field: string) =>
  z.string().regex(YOUTUBE_ID, { error: `${field} must be the 11-character YouTube video ID.` });

export const httpsUrl = (field: string) =>
  z.url({ protocol: /^https$/, error: `${field} must be an https:// URL.` });

export const date = (field: string) =>
  z.coerce.date({ error: `${field} must be a date (YYYY-MM-DD).` });

/**
 * Strict object whose unknown-key error names the key and the files to update. Astro prints the
 * issue path in front of the message, and that path is empty for top-level keys.
 */
export const strictObject = <Shape extends z.ZodRawShape>(schemaFile: string, shape: Shape) =>
  z.strictObject(shape, {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? `Unknown field ${issue.keys.map((key) => `"${key}"`).join(', ')}. Remove it, or add it to src/content/schemas/${schemaFile} and tech.md §5.2.`
        : undefined,
  });

/** Non-empty list without duplicates; `size` narrows the allowed length further. */
export const uniqueList = <T extends z.ZodType>(
  item: T,
  field: string,
  size: { min?: number; max?: number } = {},
) => {
  const min = size.min ?? 1;
  const max = size.max ?? Number.POSITIVE_INFINITY;
  const range = Number.isFinite(max) ? `${min}–${max}` : `at least ${min}`;
  return (
    z
      .array(item)
      .refine((list) => list.length >= min && list.length <= max, {
        error: `${field} needs ${range} item${min === 1 && !Number.isFinite(max) ? '' : 's'}.`,
      })
      // JSON keys so references (`{ collection, id }` after Astro's transform) compare by value.
      .refine((list) => new Set(list.map((value) => JSON.stringify(value))).size === list.length, {
        error: `${field} has duplicate items.`,
      })
  );
};

/** Page SEO block, same limits as projects (AGENTS.md §8, tech.md §12.1). */
export const seoSchema = (schemaFile: string) =>
  strictObject(schemaFile, {
    title: text('seo.title').max(SEO_TITLE_MAX, {
      error: `seo.title must be ${SEO_TITLE_MAX} characters or fewer.`,
    }),
    description: text('seo.description')
      .min(SEO_DESCRIPTION_MIN, {
        error: `seo.description must be ${SEO_DESCRIPTION_MIN}–${SEO_DESCRIPTION_MAX} characters.`,
      })
      .max(SEO_DESCRIPTION_MAX, {
        error: `seo.description must be ${SEO_DESCRIPTION_MIN}–${SEO_DESCRIPTION_MAX} characters.`,
      }),
    keywords: uniqueList(text('seo keyword'), 'seo.keywords'),
  });

/** Adds an issue on `updatedAt` when it is earlier than `publishedAt`. */
export function checkDateOrder(
  entry: { publishedAt: Date; updatedAt?: Date | undefined },
  ctx: z.RefinementCtx,
) {
  if (entry.updatedAt && entry.updatedAt < entry.publishedAt) {
    ctx.addIssue({
      code: 'custom',
      path: ['updatedAt'],
      message: 'updatedAt must not be before publishedAt.',
    });
  }
}

/** File name without extension, or the folder name for `<name>/index.<ext>` entries. */
export function entryName(entry: string): string {
  const parts = entry.split('/');
  const file = parts.at(-1) ?? '';
  const base = file.replace(/\.[^.]+$/, '');
  return base === 'index' && parts.length > 1 ? (parts.at(-2) ?? '') : base;
}

/**
 * `generateId` for a glob loader: the entry ID is the file (or folder) name, and the frontmatter
 * field `key` must repeat it, because it becomes a URL or a reference target that never changes
 * after launch (prd.md §5). Runs before schema validation, so it only checks what it needs.
 */
export function idFromEntry(collection: string, key: string) {
  return ({ entry, data }: { entry: string; data: Record<string, unknown> }): string => {
    const name = entryName(entry);
    if (data[key] !== name) {
      throw new Error(
        `${collection}/${entry}: ${key} "${String(data[key])}" must match the file name "${name}".`,
      );
    }
    return name;
  };
}
