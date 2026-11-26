# lejliczijad.com

Portfolio of Zijad Lejlić, full-stack developer. Static-first Astro site with a WebGL particle
background, deployed to Cloudflare Workers (static assets). Site content is in US English.

| Read first | What it covers |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Rules for anyone working on the repo: workflow, git and PR conventions, Definition of Done |
| [prd.md](prd.md) | Product: goals, pages, and the task list (phases P0–P4) |
| [tech.md](tech.md) | Technical spec: stack, structure, API, security, testing, CI/CD, ADRs |

Project docs (`prd.md`, `tech.md`, `AGENTS.md`, `docs/*`) are written in Bosnian; code, commits and
site copy are in English.

## Quick start

Requirements: Git and [nvm](https://github.com/nvm-sh/nvm) (or another Node version manager that
reads `.nvmrc`).

```bash
git clone https://github.com/ZijadLejlic/lejliczijad-portfolio.git
cd lejliczijad-portfolio
nvm install          # reads .nvmrc (Node 26.13.1)
corepack enable      # provides the exact pnpm from package.json "packageManager"
pnpm install         # also installs the Husky git hooks and downloads the licensed fonts (ADR-017)
cp .env.example .env
pnpm dev             # http://localhost:4321
```

`.env.example` already holds safe local values (Cloudflare's public Turnstile test key, the public
Umami ID), so the copy works as is. Never put a secret in `.env`: every `PUBLIC_*` value ends up in
the client bundle.

`.dev.vars.example` is the template for Worker runtime variables (`cp .dev.vars.example .dev.vars`).
`pnpm dev` and `pnpm preview` run the Worker in workerd and read it; the API needs it from P1.CONT.*.

### Common setup problems

- **`pnpm: command not found` in a git hook, or `engine-strict` errors:** the shell is on the wrong
  Node. Run `nvm use` in the repo (or set `nvm alias default 26.13.1`) so the hooks see Node 26
  and its pnpm.
- **Build fails with `EnvInvalidVariables`:** `.env` is missing or `PUBLIC_SITE_URL` /
  `PUBLIC_DEPLOY_ENV` are empty or invalid. Copy `.env.example` again.
- **`pnpm test:e2e` cannot find a browser:** run `pnpm test:e2e:install` once.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on `localhost:4321` |
| `pnpm build` | Build into `dist/` (no content guard; used by CI and previews) |
| `pnpm build:prod` | Content guard, then `astro build`; fails on `TODO(content)`, `lorem` or `PLACEHOLDER` in `src/` or `public/` |
| `pnpm check:content` | Content guard on its own |
| `pnpm preview` | Serves `dist/` locally in workerd (`astro preview` through the Cloudflare adapter) |
| `pnpm check` | `lint` + `lint:css` + `typecheck` + `test:unit`; run before every PR |
| `pnpm lint` / `pnpm lint:fix` | ESLint (0 warnings allowed) |
| `pnpm lint:css` | Stylelint (tokens only, no hard-coded colors) |
| `pnpm typecheck` | `astro check` (TypeScript strict) |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm fonts` | Download and verify the ITF fonts (also runs on `pnpm install`, ADR-017) |
| `pnpm test` | All Vitest projects |
| `pnpm test:unit` | Vitest, Node (`tests/unit`) |
| `pnpm test:api` | Vitest in workerd (`tests/api`) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright; builds and serves the site on port 4322 unless `PLAYWRIGHT_BASE_URL` is set |
| `pnpm test:e2e:install` | Installs Playwright browsers (chromium, firefox, webkit) |

Planned commands from [AGENTS.md §16](AGENTS.md#16-komande-definišu-se-u-p1env-ovdje-je-ugovor)
(`test:visual`, `test:a11y`, `test:overflow`, `lhci`, `face:*`, `og`) are added by the tasks that
need them.

Playwright tests run with `?fx=off` and reduced motion, so screenshots are deterministic
([tech.md §16](tech.md#16-testiranje)).

## Working on a task

The short version of [AGENTS.md §3](AGENTS.md#3-tok-rada-za-svaki-task):

1. Pick a task in `prd.md` whose dependencies are `[x]`.
2. Branch from fresh `main`: `<type>/<task-id-lowercase>-<short>`, e.g. `feat/p1-fx-08-vortex-sim`.
3. First commit only marks the task `[~]` in `prd.md`.
4. Implement, add tests, run `pnpm check` and `pnpm build`, check the page at 375, 768, 1280 and
   1920 px.
5. Commit with Conventional Commits: `feat(fx): add vortex simulation [P1.FX.08]`. Commitlint
   rejects other formats; lint-staged formats staged files.
6. Open a PR with the template, mark the task `[x]` in the same PR. Zijad merges.

## Project layout

```
src/
  components/  ui, layout, sections, case-study, forms, media
  content/     MDX and JSON content collections
  data/        site.ts and other single-source config
  fx/          all WebGL code (public API: initFx, fx.setState, fx.dispose)
  layouts/  lib/  pages/  styles/
  server/      API-only code (never imported by client code, except schemas/)
content/intake/  raw material from Zijad; never part of the build
docs/            ADRs, design mockups, guides
scripts/         build checks, face pipeline, OG and PDF generation
tests/           unit, api, e2e, visual, a11y, fixtures
```

Import from `src` with the `@/*` alias, e.g. `@/lib/deploy-env`. Full structure:
[tech.md §3](tech.md#3-struktura-repozitorija).

## CI

GitHub Actions on every PR and push to `main`:

- [ci.yml](.github/workflows/ci.yml): ESLint, Stylelint, Prettier check, typecheck, unit, API tests,
  build, then Playwright e2e.
- [security.yml](.github/workflows/security.yml): `pnpm audit`, gitleaks (also weekly). CodeQL is
  off until P3.SEC.22.
- [Dependabot](.github/dependabot.yml): weekly npm and GitHub Actions updates.

## Deploy

[`deploy.yml`](.github/workflows/deploy.yml) deploys the Worker `lejliczijad`
([`wrangler.jsonc`](wrangler.jsonc)) to Cloudflare (tech.md §17,
[ADR-016](docs/adr/016-workers-previews.md)):

| Environment | URL | Trigger |
| --- | --- | --- |
| development | `localhost:4321` | `pnpm dev` |
| preview | `https://pr-<number>-lejliczijad.<subdomain>.workers.dev`, `noindex` | every PR (`wrangler preview`), deleted when the PR closes |
| production | workers.dev until P1.LAUNCH.01, then `https://lejliczijad.com` | push to `main` (`build:prod` → `wrangler deploy`) |

- Each PR gets one bot comment with its preview URL, updated on every push. The job checks
  `/api/health`, `X-Robots-Tag: noindex` and the robots meta before commenting.
- Previews do not inherit production settings: repeat vars under `previews` in `wrangler.jsonc`, and
  give every new binding (KV, rate limit, R2) a separate preview resource.
- Production uses `build:prod`, so while any `TODO(content)` is left the job fails and nothing is
  deployed. That is intended.
- PRs from forks and from Dependabot skip the preview (no access to repository secrets).

Locally, after a build, `pnpm exec wrangler deploy --dry-run` checks the bundle and bindings without
touching Cloudflare. Real deploys go through CI only.

### One-time setup (Zijad)

1. Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom token:
   - Permissions: **Account → Workers Scripts → Edit** and **Account → Account Settings → Read**
   - Account Resources: **Include → your account only**; no zone permissions; optionally a TTL
2. Add both values as repository secrets (the token is pasted only into the prompt):

```bash
gh secret set CLOUDFLARE_API_TOKEN
```

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
```

The account ID is on the Workers & Pages overview page.

Cloudflare only turns on workers.dev and Preview URLs after the Worker's first `wrangler deploy`.
That bootstrap was done once by hand on 2026-11-26 with a `noindex` build
(`PUBLIC_DEPLOY_ENV=preview`), so `https://lejliczijad.lejliczijad-79f.workers.dev` shows that build
until the first successful production deploy from CI. Production Worker secrets are set by Zijad
with `wrangler secret put` (preview ones with `wrangler preview secret put`); they are never
committed or shared with agents. Rollback will be documented in `docs/runbook.md` (P3.DOC.03).
