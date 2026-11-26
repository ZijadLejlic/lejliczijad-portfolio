// `?fx=off` forces the FX layer into its static, deterministic mode (tech.md §7.2, §7.6), which is
// what screenshot and layout tests need. Kept free of Playwright imports so unit tests can cover it.

const FX_PARAM = 'fx';
const FX_OFF = 'off';
// Only used to parse relative URLs; it never leaves this function.
const PARSE_BASE = 'http://fx-off.invalid';

/**
 * Adds `fx=off` to a URL or path, keeping its query and hash. A test that sets `fx` on purpose
 * (for example `?fx=low`) keeps its own value.
 */
export function withFxOff(url: string): string {
  const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(url);
  const parsed = new URL(url, PARSE_BASE);

  if (!parsed.searchParams.has(FX_PARAM)) {
    parsed.searchParams.set(FX_PARAM, FX_OFF);
  }

  return isAbsolute ? parsed.href : `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
