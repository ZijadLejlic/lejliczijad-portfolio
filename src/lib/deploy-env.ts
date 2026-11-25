import { PUBLIC_DEPLOY_ENV } from 'astro:env/client';

export type DeployEnv = typeof PUBLIC_DEPLOY_ENV;

export const DEPLOY_ENV: DeployEnv = PUBLIC_DEPLOY_ENV;

export const isProduction = DEPLOY_ENV === 'production';

// tech.md §4: everything outside production is noindex, so previews never reach search results.
export const ROBOTS_META = isProduction
  ? 'index,follow,max-image-preview:large'
  : 'noindex,nofollow';
