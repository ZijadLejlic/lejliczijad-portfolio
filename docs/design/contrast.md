# Kontrast boja (P1.DS.02)

> Izvor vrijednosti: [`src/styles/tokens.css`](../../src/styles/tokens.css). Omjeri su izračunati po WCAG 2.2 formuli
> (`src/lib/contrast.ts`) i **provjeravaju se u testu** [`tests/unit/styles/tokens-contrast.test.ts`](../../tests/unit/styles/tokens-contrast.test.ts):
> ako promjena tokena obori dozvoljeni par ispod praga, `pnpm check` pada.
>
> Pragovi: normalan tekst ≥ 4,5:1 · veliki tekst (≥ 24 px, ili ≥ 18,66 px bold) ≥ 3:1 · UI elementi i grafika ≥ 3:1.
> Ova tabela važi za **čiste površine**. Iznad FX canvasa važe brojke iz P1.FX.12 (`uDim`), vidi i [p1-ds-01/README.md](p1-ds-01/README.md#kontrast).

## Tekst na površinama

| Token (tekst) | `--color-bg` `#050507` | `--color-surface-1` `#0B0B0F` | `--color-surface-2` `#13131A` | Upotreba |
|---|---|---|---|---|
| `--color-text` `#F4F4F6` | 18,54 | 17,88 | 16,83 | Primarni tekst |
| `--color-text-muted` `#A1A1AA` | 7,95 | 7,66 | 7,21 | Sekundarni tekst |
| `--color-text-subtle` `#7C7C86` | 4,93 | 4,76 | **4,48 ✗** | Meta, labele; **ne na surface-2 i ne iznad canvasa** |
| `--color-accent` `#4D7CFF` | 5,47 | 5,28 | 4,97 | Linkovi, akcenti |
| `--color-accent-hover` `#6B93FF` | 7,02 | 6,78 | 6,38 | Hover linka |
| `--color-danger` `#F87171` | 7,36 | 7,10 | 6,68 | Greške u formi (uvijek uz tekst, ne samo boja) |

## Tekst na akcentnoj pozadini (primarno dugme)

| Par | Omjer | Status |
|---|---|---|
| `--color-on-accent` `#050507` na `--color-accent` `#4D7CFF` | 5,47 | ✓ |
| `--color-on-accent` na `--color-accent-hover` `#6B93FF` | 7,02 | ✓ |
| `--color-on-accent` na `--color-accent-pressed` `#4570F5` | 4,74 | ✓ (bio `#3A66E6` = 4,10 ✗; Zijadova odluka 2026-11-26) |
| bijela `#FFFFFF` na `--color-accent` | 3,72 | ✗, zato tekst na akcentu nikad nije bijel |

## UI i grafika (≥ 3:1)

| Par | Omjer | Status |
|---|---|---|
| `--color-focus` `#4D7CFF` na bg / surface-1 / surface-2 | 5,47 / 5,28 / 4,97 | ✓ (prsten 2 px + 2 px offset leži na pozadini) |
| `--color-success` `#22C55E` (tačka dostupnosti) na bg / surface-1 / surface-2 | 8,94 / 8,62 / 8,11 | ✓ |
| `--color-border` `rgb(255 255 255 / 8%)` na bg | 1,16 | dekorativno, nije za granice kontrola |
| `--color-border-strong` `rgb(255 255 255 / 16%)` na bg | 1,48 | **ne prolazi 3:1 za granicu inputa** (WCAG 1.4.11) |

## Pravila koja iz ovoga slijede

1. `--color-text-subtle` samo na `bg` i `surface-1`, i nikad iznad FX canvasa (na zatamnjenju 0,14 pada na 3,71:1).
2. Tekst na akcentnoj pozadini je uvijek `--color-on-accent`.
3. Granice (`--color-border*`) su dekorativne. Input ne smije zavisiti samo od granice da bi bio prepoznat:
   P1.DS.21 mora dati inputu jaču granicu ili pozadinu koja s okolinom ima ≥ 3:1 (otvoreno pitanje za P1.DS.21, vidi PR).
4. Greške se nikad ne pokazuju samo bojom (`--color-danger` ide uz tekst poruke i ikonu).
