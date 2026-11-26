# Licence trećih strana

> Svaki font, slika, model ili biblioteka koja nije naša ima ovdje red: izvor, licenca, datum provjere i šta smijemo.
> npm zavisnosti se ne navode pojedinačno (licence provjerava `pnpm audit` / P3.SEC.13); ovdje su samo asseti koji se isporučuju posjetiocu.

## Fontovi (P1.DS.03)

| Fajl u `src/assets/fonts/` | Font | Izvor | Licenca | Izmijenjen? | SHA-256 (prvih 16) |
|---|---|---|---|---|---|
| `ClashDisplay-Medium.woff2` (16,7 KB) | Clash Display 500 | Fontshare ZIP `api.fontshare.com/v2/fonts/download/clash-display` → `ClashDisplay_Complete/Fonts/WEB/fonts/` | ITF FFL v2.0 | Ne | `ef1dc0dbd18fcbf8` |
| `ClashDisplay-Semibold.woff2` (16,6 KB) | Clash Display 600 | isto | ITF FFL v2.0 | Ne | `5271b81f6d403a5a` |
| `Satoshi-Regular.woff2` (27,2 KB) | Satoshi 400 | Fontshare ZIP `api.fontshare.com/v2/fonts/download/satoshi` → `Satoshi_Complete/Fonts/WEB/fonts/` | ITF FFL v2.0 | Ne | `5aa97d938f523dd8` |
| `Satoshi-Medium.woff2` (27,3 KB) | Satoshi 500 | isto | ITF FFL v2.0 | Ne | `d492ce178ab9042b` |
| `JetBrainsMono-Medium.latin-ext.woff2` (43,7 KB) | JetBrains Mono 500 | `JetBrains/JetBrainsMono` (`fonts/webfonts/JetBrainsMono-Medium.woff2`, 94 KB) | SIL OFL 1.1 (`JetBrainsMono-OFL.txt`) | Da: subset `latin` + `latin-ext` (fonttools `pyftsubset`, sve OpenType osobine zadržane) | `36910a23db5696ac` |

Preuzeto i provjereno: **2026-11-26** (licenca u ZIP-u: `License/FFL.txt`, "ITF Free Font License (FFL) Version 2.0 - 17 Aug 2026").

### ITF FFL v2.0 (Clash Display, Satoshi): sažetak, nije pravni savjet
- **Dozvoljeno:** komercijalna upotreba; self-hosting na vlastitom sajtu preko `@font-face` (izričito, §01); atribucija nije obavezna.
- **Zabranjeno bez pismene dozvole ITF-a:** bilo kakva izmjena, uključujući **subsetting, konverziju formata i promjenu imena ili metapodataka** (§02). Zato su fajlovi bajt-za-bajt kopije iz ZIP-a ([ADR-013](adr/013-fonts-no-subset.md)).
- **Zabranjena redistribucija:** drugi font servisi, **javno dostupni repozitoriji**, slanje fajlova trećim licima (dizajnerima, agencijama), nuđenje fonta kao izbora korisnicima nekog servisa.
- **Posljedica za repo:** ITF fajlovi se ne commituju ([ADR-017](adr/017-fonts-fetched-not-committed.md)). `pnpm install` ih preuzima iz Fontshare ZIP-ova i provjerava puni SHA-256 (`scripts/fonts/fetch.ts`, gdje su i puni hashevi). Javni repo dobija historiju bez njih (P1.ENV.20).

### SIL OFL 1.1 (JetBrains Mono)
- Dozvoljeno korištenje, izmjena (uključujući subset) i redistribucija, uz tekst licence uz fajl (`src/assets/fonts/JetBrainsMono-OFL.txt`).
- Copyright linija nema "Reserved Font Name", pa izmijenjena verzija smije zadržati ime.

### Glifovi
Svih pet fajlova ima `č ć š ž đ Č Ć Š Ž Đ` (provjereno fonttools `getBestCmap()`, 2026-11-26).

### Fallback metrike
Fallback lica u `src/styles/fonts.css` su `@font-face` deklaracije nad lokalnim fontovima (`local()`), pa nisu izmjena fonta.

| Web font | Lokalni font | `size-adjust` | `ascent` / `descent` / `line-gap` override |
|---|---|---|---|
| Clash Display 500 | Arial | 105,93 % | 84,02 / 23,6 / 8,5 % |
| Clash Display 600 | Arial Bold | 101,21 % | 87,94 / 24,7 / 8,89 % |
| Satoshi 400 | Arial | 97,72 % | 103,36 / 24,56 / 10,23 % |
| Satoshi 500 | Arial | 100,63 % | 100,37 / 23,85 / 9,94 % |
| JetBrains Mono 500 | Courier New | 99,98 % | 102,02 / 30 / 0 % |

**Metoda:**
- `size-adjust` je izmjereni omjer širine (web font / lokalni font) nad uzorkom teksta sa sajta, u Chromiumu.
- Prvi pokušaj (prosječna širina malih slova iz tabela fonta) je za Clash Display promašio za ~9 %, pa je zamijenjen mjerenjem.
- Override vrijednosti su OS/2 typo metrike fonta (Clash 890/−250/90, Satoshi 1010/−240/100, JetBrains Mono 1020/−300/0, UPM 1000) podijeljene sa `size-adjust`.

**Rezultat** (Chromium, 48 px, 4 uzorka): razlika u širini fallback ↔ web font je od −4,3 % do +2,8 %. Broj redova u bloku širine 600 px je isti za sve fontove i uzorke. CLS na `/` je 0.
Lokalni fontovi postoje na macOS-u i Windowsu; na Androidu i Linuxu fallback ide na generički `sans-serif`/`monospace` bez korekcije.
