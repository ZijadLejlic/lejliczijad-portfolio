// ESLint flat config. Rules mirror AGENTS.md §6 (code standards) and §11 / tech.md §13.4 (security).
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// DOM sinks and dynamic code execution are banned outright (tech.md §13.4).
const BANNED_SYNTAX = [
  {
    selector: 'AssignmentExpression > MemberExpression[property.name=/^(innerHTML|outerHTML)$/]',
    message: 'Do not assign innerHTML/outerHTML. Build DOM nodes or use textContent.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Do not use insertAdjacentHTML. Build DOM nodes or use textContent.',
  },
  {
    selector:
      "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
    message: 'Do not use document.write.',
  },
];

// Client code must never pull in server modules; only the shared zod schemas are allowed (tech.md §3).
const SERVER_IMPORT_PATTERNS = [
  {
    group: ['@/server/*', '!@/server/schemas', '!@/server/schemas/*'],
    message: 'Server modules are server-only. Import shared schemas from @/server/schemas instead.',
  },
];

export default defineConfig([
  globalIgnores([
    // Agent worktrees are full repo copies; linting them double-counts and confuses tsconfig lookup.
    '.claude/',
    'dist/',
    '.astro/',
    'node_modules/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'content/intake/',
    // Approved static design mockups, kept verbatim as a record (P1.DS.01).
    'docs/design/',
  ]),

  js.configs.recommended,
  tseslint.configs.strict,
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  svelte.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-restricted-syntax': ['error', ...BANNED_SYNTAX],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      'astro/no-set-html-directive': 'error',
      'astro/no-unused-css-selector': 'error',
      'svelte/no-at-html-tags': 'error',
    },
  },

  // Svelte components and runes modules use TypeScript inside <script lang="ts">.
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      // Surfaces the Svelte compiler's a11y warnings (alt text, keyboard handlers, roles) as lint errors.
      'svelte/valid-compile': 'error',
    },
  },

  // Named exports only in app code (AGENTS.md §6.1). Astro and Svelte components are exempt by file type.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...BANNED_SYNTAX,
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports (AGENTS.md §6.1).',
        },
      ],
    },
  },

  {
    files: ['src/**/*.{ts,astro,svelte}'],
    ignores: ['src/server/**', 'src/pages/api/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: SERVER_IMPORT_PATTERNS }],
    },
  },

  // Node-side code: configs, build scripts and tests.
  {
    files: ['*.{js,mjs,cjs,ts}', 'scripts/**/*.{js,mjs,ts}', 'tests/**/*.{js,ts}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Must stay last: turns off stylistic rules that Prettier owns.
  eslintConfigPrettier,
]);
