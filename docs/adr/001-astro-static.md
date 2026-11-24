# ADR-001 · Astro (static) s tačno pinovanim verzijama

- **Status:** Accepted
- **Datum:** 2026-11-24
- **Task:** P1.ENV.01

## Kontekst
tech.md §2 i §4 traže Astro sa statičnim outputom i tačno pinovane verzije (bez `^` i `~`),
izabrane kao najnovije stabilne u trenutku scaffolda. Verzije su provjerene u npm registryju
i na nodejs.org/dist/index.json na dan 2026-11-24.

## Odluka

| Alat | Verzija | Gdje je pinovano | Napomena |
|---|---|---|---|
| Node.js | **26.13.1** (LTS "Lithium") | `.nvmrc`, `engines.node` (`>=26.13.1 <27`) | Najnoviji LTS na dan scaffolda |
| pnpm | **12.23.0** | `packageManager`, `engines.pnpm` | Aktivira se preko Corepacka |
| Corepack | 0.36.0 (globalno, van repoa) | – | Node ≥ 25 više ne isporučuje Corepack; instalira se `npm i -g corepack` |
| Astro | **7.4.13** | `dependencies` | `latest` dist-tag |
| @astrojs/check | **0.9.12** | `devDependencies` | Za `pnpm typecheck` (`astro check`) |
| TypeScript | **6.0.3** | `devDependencies` | Vidi "Posljedice" |

- `astro.config.ts`: `site: 'https://lejliczijad.com'`, `trailingSlash: 'never'`, `output: 'static'`,
  `build.format: 'file'`, `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`.
- `@astrojs/cloudflare` adapter se **ne** dodaje ovdje; dolazi u P1.ENV.13 (ostatak ADR-001 i ADR-002).
- `tsconfig.json` nasljeđuje `astro/tsconfigs/strict` i dodaje `noUncheckedIndexedAccess: true`.
- `.npmrc`: `save-exact=true` (nove zavisnosti se automatski pinuju tačno) i `engine-strict=true`
  (instalacija pada na pogrešnoj verziji Node-a ili pnpm-a).

## Posljedice
- **TypeScript 6, ne 7:** TypeScript 7.0.2 je `latest` na npm-u, ali `@astrojs/check@0.9.12` ima peer
  `typescript: ^5.0.0 || ^6.0.0`. Zato je izabrana zadnja 6.x (6.0.3). Prelazak na 7 ide kad
  `@astrojs/check` proširi peer raspon (Dependabot/Renovate, P1.ENV.12).
- Lokalno i u CI-u mora se koristiti Node 26.13.x; `engine-strict` ruši instalaciju na Node 20/24.
- Developer treba jednom instalirati Corepack (`npm i -g corepack && corepack enable`), jer ga Node 26 ne nosi.
- Nadogradnja bilo koje verzije ide kroz PR koji ažurira ovu tabelu.
