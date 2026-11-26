# Tipografska skala (P1.DS.04)

> Tokeni su u [`src/styles/tokens.css`](../../src/styles/tokens.css): `--text-*` (veličina), `--leading-*` (line-height), `--tracking-*` (letter-spacing), `--weight-*`, `--measure-prose`.
> Matematiku skale (dobro formiran `clamp`, hijerarhija na svakoj širini, body ≥ 16 px) čuva test [`tests/unit/styles/type-scale.test.ts`](../../tests/unit/styles/type-scale.test.ts).

## Skala

| Korak | Token | Font | 320 px | 768 px | 1280 px | 1920 px | 2560 px | Line-height | Tracking |
|---|---|---|---|---|---|---|---|---|---|
| Display | `clamp(2.5rem, 0.6rem + 8.4vw, 10rem)` | Clash Display 600 | 40 | 74 | 117 | 160 | 160 | 0.92 | −0.03em |
| H1 | `clamp(2.5rem, 1.4rem + 4.6vw, 6rem)` | Clash Display 600 (hero: 500) | 40 | 58 | 81 | 96 | 96 | 0.98 | −0.025em |
| H2 | `clamp(2rem, 1.3rem + 2.8vw, 4rem)` | Clash Display 500 | 32 | 43 | 57 | 64 | 64 | 1.05 | −0.02em |
| H3 | `clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)` | Clash Display 500 | 24 | 28 | 35 | 36 | 36 | 1.15 | −0.01em |
| Lead | `clamp(1.125rem, 1rem + 0.5vw, 1.5rem)` | Satoshi 400 | 18 | 20 | 22 | 24 | 24 | 1.5 | 0 |
| Body | `clamp(1rem, 0.96rem + 0.2vw, 1.125rem)` | Satoshi 400 | 16 | 17 | 18 | 18 | 18 | 1.65 | 0 |
| Small | `0.875rem` | Satoshi 500 | 14 | 14 | 14 | 14 | 14 | 1.5 | 0 |
| Mono | `clamp(0.75rem, 0.71rem + 0.2vw, 0.875rem)` | JetBrains Mono 500, uppercase | 12 | 13 | 14 | 14 | 14 | 1.4 | 0.08em |

- Svaka fluidna veličina ima `rem` dio, pa raste sa zoomom browsera (WCAG 1.4.4); `vw` dio daje fluidnost.
- Mono (12–14 px) je samo za kratke labele velikim slovima. Tekst koji se čita je uvijek ≥ 16 px.
- Proza: `max-width: var(--measure-prose)` (68ch, oko 60–75 znakova).

## Promjena u odnosu na tech.md (2026-11-26, Zijadova odluka)
- Display je bio `clamp(3rem, 1.2rem + 7.5vw, 10rem)`: 48 px na 320 px.
- Na 320–360 px najduže riječi u Clash Display 600 nisu stajale u kolonu: "Infrastructure" 329 px u 288 px, "Development" 306 px, "management" 305 px.
- Nova krivulja daje 40 px na malim telefonima. Od ~600 px je skoro ista kao stara (768 px: 74 vs 77; 1280 px: 117 vs 115), a max 160 px dostiže od ~1790 px.
- Na 320–360 px su display i H1 iste veličine. Hijerarhiju tamo nose težina i razmak, a test traži display > H1 od 768 px nadalje.

## Provjera: najduža riječ staje (320–2560 px)
Mjereno u Chromiumu sa pravim fontovima (Clash Display 500/600 iz `src/assets/fonts`).
- Kolona: `min(viewport, 1440 px) − 2 × gutter`, gdje je gutter `clamp(1rem, 0.5rem + 2.5vw, 3rem)` (tech.md §6.3).
- Širine: 320, 360, 375, 414, 480, 768, 1024, 1280, 1536, 1920 i 2560 px.
- Riječi: Infrastructure, Development, management, Digitalization, Rezervacija, Karamujić.

| Korak | Najtijesniji slučaj | Zauzeto |
|---|---|---|
| Display 600 | 320 px, "Infrastructure" 274 / 288 px | 95 % |
| H1 600 | 320 px, "Infrastructure" 277 / 288 px | 96 % |
| H1 500 (hero) | 320 px, "Infrastructure" 268 / 288 px | 93 % |
| H2 500 | 320 px, "Infrastructure" 216 / 288 px | 75 % |
| H3 500 | 320 px, "Infrastructure" 166 / 288 px | 58 % |

Nijedna riječ ne prelazi kolonu ni na jednoj širini.

Riječ duža od 14 slova u display ili H1 naslovu na 320 px nije garantovana. Za takav copy treba ili kraći naslov, ili `hyphens: auto` na tom naslovu.
