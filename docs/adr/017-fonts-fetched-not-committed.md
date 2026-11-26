# ADR-017 · ITF fontovi se ne commituju, nego preuzimaju pri `pnpm install`

- **Status:** Accepted
- **Datum:** 2026-11-26
- **Task:** P1.ENV.19 (preduslov za P1.ENV.20 i P1.ENV.15)
- **Odobrio:** Zijad (chat, 2026-11-26)
- **Dopunjuje:** ADR-013 (fajlovi i dalje bajt-za-bajt iz ZIP-a), tech.md §3 (`src/assets/fonts/`)

## Kontekst
Branch protection i rulesets na privatnom repou besplatnog ličnog GitHub naloga nisu dostupni (API vraća 403). Zijad je izabrao da repo postane javan (P1.ENV.15).
ITF FFL v2.0 (Clash Display, Satoshi) zabranjuje redistribuciju fontova kroz **javno dostupne repozitorije** ([docs/licenses.md](../licenses.md)). Fajlovi zato ne smiju biti ni u repou ni u njegovoj historiji.
Self-hosting na vlastitom sajtu preko `@font-face` je izričito dozvoljen, pa fajlovi i dalje idu u `dist/` i na sajt.

## Odluka
- Četiri ITF fajla (`ClashDisplay-Medium|Semibold.woff2`, `Satoshi-Regular|Medium.woff2`) su u `.gitignore`.
- `scripts/fonts/fetch.ts` ih preuzima iz zvaničnih Fontshare ZIP-ova (`api.fontshare.com/v2/fonts/download/<font>`), vadi tačne fajlove sistemskim `unzip` i provjerava **puni SHA-256** prije upisa u `src/assets/fonts/`. Pogrešan hash ruši skriptu s jasnom porukom.
- Skripta se pokreće kao `postinstall` (lokalno i u svakom CI jobu), a ručno kao `pnpm fonts`. Ako su fajlovi na disku i hash odgovara, ne radi ništa (radi i offline).
- JetBrains Mono (OFL) ostaje commitovan, jer OFL dozvoljava redistribuciju.
- Bez nove npm zavisnosti: `fetch` i `crypto` su iz Nodea, a `unzip` postoji na macOS-u i Ubuntu runnerima.

## Posljedice
- Svjež clone traži mrežu pri prvom `pnpm install`. Ako Fontshare ne radi, install pada; CI se ponovi kasnije.
- Ako Fontshare objavi novu verziju fonta, hash više ne odgovara i install pada. Tada se ponovo čita licenca, a nova verzija se provjerava (glifovi č/ć/š/ž/đ, fallback metrike) i hash u skripti i `docs/licenses.md` se mijenja u istom PR-u.
- Ovo samo uklanja fajlove iz budućih commitova. Stara historija ih i dalje sadrži; zato javni repo dobija prepisanu historiju u novom repou (P1.ENV.20), a stari repo ostaje privatan.
