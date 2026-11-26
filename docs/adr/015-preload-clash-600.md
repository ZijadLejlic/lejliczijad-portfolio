# ADR-015 · Hero H1 u Clash Display 600, preload Clash Display 600

- **Status:** Accepted
- **Datum:** 2026-11-26
- **Task:** P1.DS.03
- **Odobrio:** Zijad (chat, 2026-11-26)
- **Mijenja:** [ADR-014](014-preload-clash-500.md) (Superseded) i dnevnik odluka od 2026-11-25 (hero smjer C: "H1 u Clash Display 500")

## Kontekst
ADR-014 je prebacio preload na Clash Display 500, jer je hero smjer C predviđao H1 u težini 500.
Osnovni `h1` (tech.md §6.2, `src/styles/base.css`) je u težini 600, pa bi hero bio jedini H1 u 500, a naslovi ostalih stranica ne bi imali preload.
Zijad je uporedio 500 i 600 na lokalnoj stranici i izabrao **600 za sve H1, uključujući hero**.

## Odluka
- Svi H1, uključujući hero H1 na Homeu (LCP), koriste **Clash Display 600**.
- Preloaduju se **Clash Display 600** (16,6 KB) i **Satoshi 400** (27,2 KB), ukupno ~44 KB (budžet ≤ 90 KB). To je prvobitni plan iz tech.md §6.2.
- Clash Display 500 (h2, h3), Satoshi 500 i JetBrains Mono 500 se učitavaju na zahtjev (`font-display: swap`) i imaju fallback s metrikama, pa nema CLS-a.
- Preload ostaje u `src/components/layout/FontPreload.astro`.

## Posljedice
- Preloadovan je font koji koristi LCP naslov na svim stranicama, ne samo na Homeu.
- h2 i h3 (Clash 500) se kratko prikažu fallback fontom s istim metrikama, pa se zamijene. Layout se ne pomjera.
- Hero komponenta (P1.HOME.02) ne mijenja težinu H1, nego koristi osnovni stil.
