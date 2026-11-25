// Conventional Commits as defined in AGENTS.md §5.2: `<type>(<scope>): <summary> [<TASK-ID>]`.

// Scopes listed in AGENTS.md §5.2. Adding one means updating that list too.
const SCOPES = [
  'fx',
  'face',
  'ui',
  'layout',
  'home',
  'work',
  'services',
  'blog',
  'estimate',
  'api',
  'email',
  'seo',
  'a11y',
  'sec',
  'ci',
  'content',
  'docs',
  'deps',
];

// The summary itself is capped at 72 chars (AGENTS.md §5.2); type, scope and the task ID suffix
// add up to ~28 more, so the whole header gets 100.
const HEADER_MAX = 100;
const BODY_LINE_MAX = 100;

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', SCOPES],
    'header-max-length': [2, 'always', HEADER_MAX],
    'body-max-line-length': [2, 'always', BODY_LINE_MAX],
    'footer-max-line-length': [2, 'always', BODY_LINE_MAX],
  },
};
