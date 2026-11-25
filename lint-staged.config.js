// Runs on staged files only (pre-commit hook). Fixers run first so the commit gets the fixed file;
// anything they cannot fix fails the commit. The hook runs with --concurrent false because the
// globs overlap (.astro hits all three) and parallel fixers would race on the same file.
// Full-repo checks stay in `pnpm check` and CI.

/** @type {import('lint-staged').Configuration} */
export default {
  // --no-warn-ignored: files ignored by eslint.config.js would otherwise warn and trip --max-warnings.
  '*.{js,mjs,cjs,ts,mts,cts,astro,svelte}': 'eslint --fix --max-warnings=0 --no-warn-ignored',
  '*.{css,astro,svelte}': 'stylelint --fix --allow-empty-input',
  // --ignore-unknown skips files Prettier has no parser for; .prettierignore still applies.
  '*': 'prettier --write --ignore-unknown',
};
