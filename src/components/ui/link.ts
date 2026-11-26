// Href classification and rel handling for Link (P1.DS.11). Pure, so the rules are unit-tested
// without rendering, and Svelte islands can reuse them with src/styles/link.css.

export type LinkVariant = 'inline' | 'quiet';

/**
 * - `internal`: a page or anchor on this site (relative, root-relative or an absolute URL on the
 *   site's own host, `www.` included).
 * - `external`: an http(s) URL on another host.
 * - `contact`: `mailto:` or `tel:`; it leaves the browser, but not for another website.
 */
export type LinkKind = 'internal' | 'external' | 'contact';

const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const CONTACT_PROTOCOLS = new Set(['mailto:', 'tel:']);

function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

/**
 * Classifies `href` against the site URL. Any other scheme (`javascript:`, `data:`, `file:` …)
 * throws, so such a link fails the build instead of shipping (AGENTS.md §11). The WHATWG parser
 * strips the whitespace and tabs that hide a scheme (`java\tscript:`), so the check sees the real
 * protocol.
 */
export function classifyHref(href: string, siteUrl: string): LinkKind {
  const base = new URL(siteUrl);
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    throw new Error(`Link: "${href}" is not a valid URL.`);
  }

  if (CONTACT_PROTOCOLS.has(url.protocol)) return 'contact';
  if (!WEB_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Link: the "${url.protocol}" scheme is not allowed (href "${href}").`);
  }
  return bareHost(url.hostname) === bareHost(base.hostname) ? 'internal' : 'external';
}

/**
 * `rel` for a link. External links always get `noopener noreferrer` (tech.md §13.4), and so does
 * any link that opens a new tab; tokens the caller passes are kept once.
 */
export function mergeRel(
  rel: string | undefined,
  { external, newTab }: { external: boolean; newTab: boolean },
): string | undefined {
  const tokens = new Set((rel ?? '').split(/\s+/).filter(Boolean));
  if (external || newTab) {
    tokens.add('noopener');
    tokens.add('noreferrer');
  }
  return tokens.size > 0 ? [...tokens].join(' ') : undefined;
}

/** Class list for a link; the label element inside carries `link__label`. */
export function linkClasses(variant: LinkVariant): string[] {
  return ['link', `link--${variant}`];
}
