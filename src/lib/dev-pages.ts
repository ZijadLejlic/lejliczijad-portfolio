// Dev-only pages such as the component gallery at /_dev/ui (P1.DS.08, P1.DS.26).
//
// Astro never routes files whose name starts with `_`, so `src/pages/_dev/*.astro` produce no page
// on their own. astro.config.ts injects them as routes only when `shouldServeDevPages()` says so,
// which keeps them out of the production build entirely (nothing to hide, nothing in dist/).

export interface DevPage {
  pattern: string;
  entrypoint: string;
}

export const DEV_PAGES: readonly DevPage[] = [
  { pattern: '/_dev/ui', entrypoint: './src/pages/_dev/ui.astro' },
];

type AstroCommand = 'dev' | 'build' | 'preview' | 'sync';

/**
 * Dev pages are served by `astro dev` and built into preview deploys (so PR previews show the
 * gallery), never into production. Fails closed: an unknown or missing deploy env is treated as
 * production.
 */
export function shouldServeDevPages(command: AstroCommand, deployEnv: string | undefined): boolean {
  if (command === 'dev') return true;
  return deployEnv === 'development' || deployEnv === 'preview';
}
