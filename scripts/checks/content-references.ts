// Fails `astro build` when a content entry references an entry that does not exist (P1.CNT.05).
//
// Astro (7.4.13) checks every `reference()` after the loaders run, but only logs
// `[ERROR] [content] Invalid content reference: …` and lets the build exit 0. There is no config
// flag to make it fatal, so this integration listens on the shared logger destination during
// content sync and throws in `astro:build:start`, which runs right after sync and before any page
// renders. Dev and `astro sync` keep the plain log, so a half-written entry never stops the server.
//
// Relies on `logger.options.destination` (public on AstroIntegrationLogger, shared with Astro's own
// logger). tests/unit/content-references.test.ts pins the event shape this expects.

import type { AstroIntegration, AstroIntegrationLogger } from 'astro';

export const INTEGRATION_NAME = 'lejliczijad:content-references';

const CONTENT_LABEL = 'content';
const INVALID_REFERENCE = 'Invalid content reference';

type LogEvent = Parameters<AstroIntegrationLogger['options']['destination']['write']>[0];

export function isInvalidReference(event: LogEvent): boolean {
  return (
    event.level === 'error' &&
    event.label === CONTENT_LABEL &&
    event.message.includes(INVALID_REFERENCE)
  );
}

export function formatFailure(messages: readonly string[]): string {
  const count = messages.length;
  const noun = count === 1 ? 'reference' : 'references';
  return [
    `Build stopped: ${count} invalid content ${noun}.`,
    ...messages.map((message) => `  - ${message}`),
    'Fix the referenced ID or add the missing entry (tech.md §5.2).',
  ].join('\n');
}

export function contentReferences(): AstroIntegration {
  const invalid: string[] = [];

  return {
    name: INTEGRATION_NAME,
    hooks: {
      'astro:config:setup': ({ logger }) => {
        const { destination } = logger.options;
        // Wrap `write` in place: the line still prints with Astro's formatting, and the
        // destination keeps its other methods (`flush`, `close`) and prototype.
        const write = destination.write.bind(destination);
        destination.write = (event) => {
          if (isInvalidReference(event)) invalid.push(event.message);
          write(event);
        };
      },
      'astro:build:start': () => {
        if (invalid.length > 0) throw new Error(formatFailure(invalid));
      },
    },
  };
}
