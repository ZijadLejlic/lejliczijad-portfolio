import type { z } from 'astro/zod';

// Loose on purpose: tests feed unknown keys and wrong types.
export type Input = Record<string, unknown>;

export function issuesOf(schema: z.ZodType, input: Input) {
  const result = schema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export const pathsOf = (schema: z.ZodType, input: Input) =>
  issuesOf(schema, input).map((issue) => issue.path);

export const without = (input: Input, field: string): Input =>
  Object.fromEntries(Object.entries(input).filter(([key]) => key !== field));
