# ADR-013 · Clash Display i Satoshi se self-hostuju bez subsettinga

- **Status:** Accepted
- **Datum:** 2026-11-25
- **Task:** nastalo u P1.DS.01, odnosi se na P1.DS.03
- **Odobrio:** Zijad (chat, 2026-11-25, opcija A)

## Kontekst
tech.md §6.2 i P1.DS.03 predviđali su subset svih fontova na `latin` + `latin-ext`, radi manjih fajlova.

Clash Display i Satoshi su na Fontshareu označeni kao "Closed Source" i pod **ITF Free Font License (FFL) v2.0**
(17. 8. 2026), što je provjereno 2026-11-25 na fontshare.com/licenses/itf-ffl i na stranicama oba fonta. Sažetak:
- Self-hosting preko `@font-face` na vlastitom sajtu je izričito dozvoljen; Fontshare API nije obavezan.
- Izmjene fonta bez pismene dozvole ITF-a su zabranjene, a licenca izričito navodi **subsetting i konverziju formata**.
- Redistribucija samih fajlova je zabranjena (drugi font servisi, javni repozitoriji, slanje trećim licima).

JetBrains Mono je pod SIL OFL 1.1 i tu ograničenje ne važi.

Veličina originalnih WOFF2 fajlova koje servira Fontshare API (izmjereno 2026-11-25):

| Fajl | Veličina |
|---|---|
| Clash Display 600 | ~15 KB |
| Satoshi 400 | ~25 KB |
| **Ukupno (2 preloadovana fonta)** | **~41 KB** (budžet tech.md §14: ≤ 90 KB) |

## Odluka
- Clash Display i Satoshi se self-hostuju **kao originalni, nepromijenjeni WOFF2 fajlovi** preuzeti s Fontsharea. Bez subsettinga, bez konverzije formata, bez promjene imena ili metapodataka.
- JetBrains Mono (OFL) se smije subsetovati na `latin` + `latin-ext`.
- Fallback metrike (`size-adjust`, `ascent-override` …) idu u `@font-face` deklaraciju **fallback** fonta, ne u font fajl, pa nisu izmjena fonta.
- Ostalo iz tech.md §6.2 ostaje: `font-display: swap`, preload Clash Display 600 + Satoshi 400.

## Posljedice
- Budžet fontova ostaje ispunjen bez subsettinga (~41 KB od 90 KB).
- U P1.DS.03 treba provjeriti: (1) da fajlovi iz zvaničnog ZIP-a za download imaju istu veličinu kao fajlovi s API-ja; (2) da oba fonta imaju sva slova č, ć, š, ž, đ (i velika); (3) da je CLS od fontova 0.
- Repo je privatan, pa čuvanje fajlova u `src/assets/fonts/` nije "javno dostupan repozitorij". Ako repo ikad postane javan, font fajlovi se moraju izbaciti iz repoa i historije ili se mora tražiti dozvola ITF-a.
- Servirani fajlovi na lejliczijad.com su dozvoljena web upotreba, ne redistribucija.
- Ako se kasnije želi subset (npr. zbog novih jezika), potrebna je pismena dozvola ITF-a i novi ADR.
