# ADR-016 · PR preview preko Workers Previews (`wrangler preview`)

- **Status:** Accepted
- **Datum:** 2026-11-26
- **Task:** P1.ENV.14
- **Odobrio:** Zijad (chat, 2026-11-26)
- **Mijenja:** tech.md §17 ("svaki PR (`wrangler versions upload`)")

## Kontekst
tech.md §17 je predviđao preview za svaki PR preko `wrangler versions upload` (Version URL, po želji s `--preview-alias`).
Cloudflare dokumentacija ([Compare workflows](https://developers.cloudflare.com/workers/previews/compare-workflows/), provjereno 2026-11-26) sada kaže da se Version URL-ovi ne koriste za PR-ove, jer verzija radi s **produkcijskim** vars, secretima i bindinzima.
Za PR-ove preporučuje **Workers Previews** (`wrangler preview`, Wrangler ≥ 4.135.0; repo ima 4.168.0).
Kad stignu forme (KV dnevni limit, rate limit, R2 vodič, Resend), preview s produkcijskim resursima bi mogao pisati u produkcijske brojače i slati prave emailove.

## Odluka
- Svaki PR iz ovog repoa dobija Preview `pr-<broj>` na Workeru `lejliczijad`: `https://pr-<broj>-lejliczijad.<subdomain>.workers.dev`. URL se objavljuje kao jedan PR komentar koji se ažurira na svaki push (`.github/workflows/deploy.yml`).
- Preview se briše kad se PR zatvori ili mergeuje (`wrangler preview delete`).
- Previews ne nasljeđuju produkcijska podešavanja, pa `wrangler.jsonc` ima blok `previews`. Svaki budući binding (KV, rate limit, R2) se tamo ponavlja s **odvojenim** resursom (drugi KV namespace, drugi `namespace_id`, drugi bucket). Preview secreti se postavljaju s `wrangler preview secret put` (Turnstile test ključevi, a Resend samo uz test domenu ili mock).
- `noindex`: Cloudflare sam dodaje `X-Robots-Tag: noindex` na workers.dev Preview URL-ove, a build s `PUBLIC_DEPLOY_ENV=preview` dodaje i `<meta name="robots" content="noindex,nofollow">`. Workflow provjerava oboje nakon uploada.
- Produkcija ostaje `wrangler deploy` na push u `main`, uz `build:prod` (content guard).

## Posljedice
- PR nikad ne dira produkcijske podatke, ako se pravilo o `previews` bindinzima poštuje.
- `wrangler preview` je u **open beta** (Wrangler 4.168.0). Ako se API promijeni, mijenja se samo `deploy.yml`. Rezervna opcija je `versions upload` uz poseban Worker za preview (Wrangler environment).
- Na Free planu je limit 100 Previewa po Workeru (najstariji se automatski briše), što je više nego dovoljno.
- PR-ovi iz forkova i od Dependabota ne dobijaju preview, jer nemaju pristup repo secretima.
