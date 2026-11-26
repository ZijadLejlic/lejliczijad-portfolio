# ADR-014 · Preload Clash Display 500 umjesto 600

- **Status:** Accepted
- **Datum:** 2026-11-26
- **Task:** P1.DS.03
- **Odobrio:** Zijad (chat, 2026-11-26)
- **Mijenja:** tech.md §6.2 ("Preload: Clash Display 600 + Satoshi 400") i ADR-013 (odjeljak Odluka, zadnja stavka)

## Kontekst
tech.md §6.2 je predvidio preload Clash Display 600 (težina za `--text-display` i `--text-h1`) i Satoshi 400.
Hero smjer C (P1.DS.01, dnevnik odluka 2026-11-25) koristi **Clash Display 500** za H1 na Homeu, a taj H1 je LCP element.
Preload težine koju LCP tekst ne koristi troši propusni opseg, a pravi font LCP-a stiže tek nakon CSS-a.

## Odluka
- Preloaduju se **Clash Display 500** (16,7 KB) i **Satoshi 400** (27,2 KB), ukupno ~44 KB (budžet ≤ 90 KB).
- Clash Display 600, Satoshi 500 i JetBrains Mono 500 se učitavaju na zahtjev (`font-display: swap`) i imaju fallback s metrikama, pa nema CLS-a.
- Preload živi u `src/components/layout/FontPreload.astro`, a BaseLayout (P1.LAY.01) ga uključuje na svim stranicama.

## Posljedice
- Na stranicama gdje je H1 u težini 600 (sve osim Homea) naslov se kratko prikaže fallback fontom s istim metrikama, pa se zamijeni. Layout se ne pomjera.
- Ako se kasnije pokaže da LCP na drugim stranicama trpi, preload se može praviti po stranici (prop na BaseLayoutu). Za to ne treba novi ADR, dok god ostaju najviše 2 preloada.
