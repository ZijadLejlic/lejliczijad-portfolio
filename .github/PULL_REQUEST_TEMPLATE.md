<!--
Title: [<TASK-ID>] <Short summary>   e.g. [P1.FX.08] Vortex GPGPU simulation
One task = one branch = one PR (AGENTS.md §0.2). Keep it under ~400 changed lines of code.
Never mix a refactor and a feature in one PR. Delete hints that do not apply.
-->

## Task

<!-- Task ID + link to prd.md on this branch, e.g. P1.FX.08 — prd.md (Faza 1 · P1.FX) -->

P1.XXX.NN —

## What & why

<!-- What changed and why. The why matters more than the what. -->

## Screenshots / video (375 · 768 · 1280 · 1920)

<!--
Required for any UI change. FX or animation changes need a video or GIF (AGENTS.md §14.3).
Write "N/A (no UI)" for config, docs or server-only changes.
-->

## How I verified

- [ ] `pnpm check` (lint + lint:css + typecheck + unit)
- [ ] `pnpm build`
- [ ] e2e / visual / a11y / overflow locally (where relevant)
- [ ] Manual: 375, 768, 1280 and 1920 px, no horizontal scroll
- [ ] Manual: keyboard only, `prefers-reduced-motion`, `?fx=off`, no JS (where relevant)
- [ ] Console: 0 errors, 0 warnings

## Not verified / known gaps

<!-- Be honest: what you could not check, and what is still missing. "None" is a valid answer only if true. -->

## Risks & rollback

<!-- What could break, and how to undo it. -->

## Decisions made

<!-- Small decisions taken without an ADR (AGENTS.md §4). Anything that changes a logged decision needs Zijad's approval + an ADR. -->

## Checklist (Definition of Done, AGENTS.md §13)

- [ ] All "Gotovo kad" criteria in prd.md are met, and the task is `[x]` in prd.md
- [ ] Tests added or updated (unit / API / e2e / visual baseline with reason)
- [ ] No `TODO(content)`, `lorem` or `PLACEHOLDER` in content that ships
- [ ] SEO (§8), a11y (§9), performance (§10) and security (§11) checked for what this PR touches
- [ ] No secrets, `.env`, `.dev.vars` or raw client data committed
- [ ] New third party? CSP + Privacy Policy + tech.md §15 + ADR updated, with Zijad's approval
- [ ] Touches `src/server/**`, `_headers`, CSP or token logic? Security review requested (§14.3)
- [ ] Docs updated if an API, structure, command or decision changed
