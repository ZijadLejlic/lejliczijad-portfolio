# P1.DS.01: Hero visual direction (3 mockups)

> Status: **odlučeno 2026-11-25: Zijad je izabrao C · Off-axis.** Ovo je samo preview za odluku o smjeru; ništa odavde ne ide u `src/`.
> Glava u mockupima je **proceduralni placeholder**, ne Zijadov sken; pravo lice dolazi kroz P0.SCAN.02–04 → P1.FACE.01/03 → P1.FACE.11.
> Sav tekst u mockupima je **nacrt** (označen `DRAFT COPY`); konačan hero copy se bira u P1.HOME.01.

## Kako otvoriti

```bash
cd docs/design/p1-ds-01 && python3 -m http.server 4877
```

Zatim otvori `http://127.0.0.1:4877/variant-a.html` (i `-b`, `-c`). Fajlovi rade i direktno iz Findera (`file://`), ali je lokalni server pouzdaniji.
Traka dolje desno (`A · B · C`) prebacuje između varijanti; ona nije dio dizajna.

| Parametar | Šta radi |
|---|---|
| `?fx=static` | Jedan statičan frame nakon intra (isto kao uz `prefers-reduced-motion`); koristi se za screenshotove |
| `?fx=off` | Samo CSS poster (gradijent), bez canvasa, kao `static` tier / bez WebGL-a |
| `?measure=1` | Upisuje rezultat provjere overflowa i kontrasta u skriveni `<pre id="measure-out">` (alat za ovaj README) |

## Šta je isto u sve tri varijante

- Crna pozadina `#050507`, akcent `#4D7CFF`, tokeni iz [tech.md §6](../../../tech.md#6-dizajn-tokeni) (`assets/base.css`).
- Clash Display (H1, wordmark), Satoshi (tekst, dugmad), JetBrains Mono (labele, badge).
- Header: wordmark, linkovi (Work · Services · About · Process · Blog), CTA `Book a call`, badge dostupnosti (≥ 1280 px); ispod 1024 px dugme `Menu` otvara fullscreen meni (fokus trap, `Esc`, vraćanje fokusa).
- Hero: H1, podnaslov, `Book a call` (primarni: **tamni tekst na akcentu**, 5,47:1), `View work`, `Meet me`, badge dostupnosti.
- Isti nacrt teksta u sve tri, da se porede samo kompozicija i hijerarhija.
- Glava i vortex su **2D canvas nagovještaj** (`assets/mockup.js`), ne three.js: proceduralna glava (sken još ne postoji), praćenje miša oprugom (yaw ±25°, pitch ±12°, k = 120, c = 18 iz tech.md §7.4), raspršivanje tačaka oko kursora, intro u kojem tačke doleću iz vortexa (2,2 s), ~3 % plavih čestica.
- **Zatamnjenje iza teksta** (`data-dim` na blokovima teksta): canvas iza teksta se gasi na zadati nivo, s mekim prelazom od 48 px. To je prototip ideje iz P1.FX.12 (`uDim`) i garantuje kontrast bez obzira gdje čestice prođu.

## Varijante

### A · Split ([variant-a.html](variant-a.html))
Tekst lijevo, glava desno kao zaseban objekat; vortex kruži oko glave i nestaje ispod teksta. Na tabletu i mobilnom glava je iznad teksta.
- **Hijerarhija:** H1 na `--text-h1` (do 96 px), drugi dio H1 u akcentu; mono eyebrow; `Meet me` i badge odvojeni tankom linijom ispod CTA-ova.
- **Za:** najjasnije čitanje u 5 sekundi (ko, šta, CTA), glava je "potpis" i ima vlastiti prostor, najmanje zatamnjenja treba. Direktno odgovara P1.FACE.10 (desktop desno od teksta, mobilni iznad). Najlakše za LCP i responsive.
- **Protiv:** najkonvencionalnija kompozicija; manje "agencijski" efekat.

### B · Monument ([variant-b.html](variant-b.html))
Sve centrirano i simetrično. Glava stoji na osi iza teksta, vortex je širok, pljosnat prsten oko nje, a H1 u `--text-display` (do 160 px) prelazi preko donjeg dijela lica.
- **Hijerarhija:** H1 dominira; podnaslov i CTA-ovi su mirni i centrirani; badge iznad naslova.
- **Za:** najjači tipografski utisak i najveći "wow" na desktopu; glava djeluje kao atmosfera.
- **Protiv:** glava je djelimično skrivena tekstom (pa praćenje miša i raspršivanje manje dolaze do izražaja); H1 iznad čestica traži jače zatamnjenje; na mobilnom je H1 dug (3 reda) i gura CTA ka dnu ekrana.

### C · Off-axis ([variant-c.html](variant-c.html))
Glava je predimenzionirana i odsječena desnim rubom, vortex je nagnut disk koji je presijeca, tekst je usidren dolje lijevo na tankoj mreži od 4 kolone. Mono labele u uglovima (uloga, lokalno vrijeme CET/CEST uživo, `Scroll`).
- **Hijerarhija:** H1 lakši (Clash Display 500), mono labele nose "inženjerski" ton; CTA-ovi desno od podnaslova na desktopu.
- **Za:** najviše karaktera, editorial / instrument-panel osjećaj, dobro se veže uz Lab i tehničke case studyje.
- **Protiv:** zahtjevnija za responsive (glava se na mobilnom vidi samo djelimično); više elemenata = više održavanja; glava je odsječena, pa lice manje "gleda" posjetioca.

### Preporuka i odluka
**Odluka: C (Off-axis)**, Zijadov izbor 2026-11-25. Agentova preporuka je bila **A (Split)**, uz dvije pozajmice iz C: mono labela s lokalnim vremenom (CET/CEST) i tanka linija ispod CTA-ova. Razlog: primarni cilj Home stranice je jasna poruka i `Book a call` (prd §7.1), a glava od tačaka je najjači vizuelni potpis i u A je najbolje vidljiva i interaktivna. B je najbolji izbor ako je prioritet "wow" na prvom ekranu; C ako je prioritet tehnički, editorial karakter.

## Kontrast

Kontrast je mjeren na dva načina:
1. **Najgori mogući slučaj (računski).** Svaka čestica iza teksta je ograničena nivoom zatamnjenja, pa je najsvjetliji mogući piksel poznat. Kontrast teksta prema tom pikselu:

| Nivo zatamnjenja (gdje) | Najsvjetliji piksel | `--color-text` | `--color-text-muted` | `--color-accent` |
|---|---|---|---|---|
| 0,14 (podnaslov, CTA red, badge, eyebrow) | `rgb(37 37 37)` | 13,95 | **5,98** | 4,12 (koristi se samo u velikom H1 u A) |
| 0,20 (header) | `rgb(48 48 48)` | 12,02 | **5,15** | – |
| 0,30 (H1 u C, veliki tekst) | `rgb(80 80 80)` | **7,34** | – | – |
| 0,45 (H1 u B, veliki tekst ≥ 48 px) | `rgb(112 112 112)` | **4,51** (prag za veliki tekst je 3:1) | – | – |

`--color-text-subtle` (4,93:1 na čistoj pozadini) se **ne koristi** iznad canvasa: na nivou 0,14 pada na 3,71:1.

2. **Izmjereno u browseru** (`?fx=static&measure=1`, najsvjetliji piksel canvasa unutar okvira svakog teksta, sve 4 širine). Najslabiji izmjereni par po varijanti:

| Varijanta | Najslabiji par | Omjer | Pozadina iza teksta |
|---|---|---|---|
| A | H1 akcentni dio (`and websites.`), veliki tekst | 5,47 | `rgb(5 5 7)` (canvas iza teksta ugašen) |
| A | podnaslov, 1920 px | 7,42 | `rgb(16 16 16)` |
| B | H1 (115–160 px) | 4,51 | `rgb(112 112 112)` |
| B | badge (12 px mono) | 5,98 | `rgb(37 37 37)` |
| C | eyebrow, podnaslov, badge (375–768 px) | 5,98 – 7,42 | `rgb(16–37)` |

Statični parovi (na `--color-bg`): text 18,54 · muted 7,95 · subtle 4,93 · accent 5,47 · accent-hover 7,02 · success 8,94 · **on-accent na accent 5,47** · on-accent na accent-hover 7,02 · **on-accent na accent-pressed 4,10** (vidi nalaz ispod).

> **Nalaz za P1.DS.02:** `--color-on-accent` (`#050507`) na `--color-accent-pressed` (`#3A66E6`) ima 4,10:1. Primarno dugme ima 16 px bold tekst, što nije "veliki tekst" po WCAG-u (treba 18,66 px bold), pa `:active` stanje ne prolazi AA. Prijedlog: svjetliji pressed (npr. bliže `#4570F5`) ili pressed stanje bez promjene boje (samo `transform: scale`). Odluka ide u P1.DS.02.

## Fontovi i licence (provjereno 2026-11-25)

| Font | Izvor u ovom previewu | Licenca | Provjereno na |
|---|---|---|---|
| Clash Display 500/600 | Fontshare CSS API (`api.fontshare.com`), samo za preview | **ITF Free Font License (FFL), "Closed Source"**, verzija 2.0 od 17. 8. 2026. | fontshare.com/fonts/clash-display i fontshare.com/licenses/itf-ffl |
| Satoshi 400/500/700 | Fontshare CSS API, samo za preview | **ITF FFL** (Closed Source), v2.0 | fontshare.com/fonts/satoshi |
| JetBrains Mono 500 | Lokalno: `assets/fonts/JetBrainsMono-Medium.woff2` (nije na Fontshareu); fajl preuzet iz zvaničnog repoa `JetBrains/JetBrainsMono` (`fonts/webfonts/`) | **SIL Open Font License 1.1**; tekst licence je u `assets/fonts/JetBrainsMono-OFL.txt` | github.com/JetBrains/JetBrainsMono (`OFL.txt`) |

Šta FFL v2.0 kaže (sažetak, ne pravni savjet):
- Besplatno za ličnu i komercijalnu upotrebu, uključujući web sajtove; **self-hosting preko `@font-face` na vlastitom sajtu je izričito dozvoljen** (Fontshare API nije obavezan).
- Zabranjena je redistribucija samih font fajlova (drugi font sajtovi, javno dostupni repozitoriji, slanje trećim licima) i nuđenje fonta kao izbora trećim korisnicima u nekom servisu.
- **Zabranjene su izmjene bez pismene dozvole ITF-a, a to izričito uključuje *subsetting* i konverziju formata.**
- Atribucija nije obavezna.

> **Važno za P1.DS.03:** tech.md §6.2 i P1.DS.03 traže subset na `latin` + `latin-ext`. Po FFL v2.0 to za Clash Display i Satoshi nije dozvoljeno bez pismene dozvole. Opcije su u PR-u i izvještaju. JetBrains Mono (OFL 1.1, bez "Reserved Font Name" u copyright liniji) se smije subsetovati.

Google Fonts CDN se ne koristi.

## Provjera (šta je urađeno)

- Širine 375, 768, 1280 i 1920 px za sve tri varijante: `scrollWidth === innerWidth` i nijedan element van viewporta (`?measure=1`). 375 px je provjereno u in-app browseru (pravi viewport od 375 px); 768/1280/1920 u headless Chromeu.
- Konzola: 0 grešaka i 0 upozorenja u headless Chromeu (normalni mod, `?measure=1` i `?fx=static`), uz kontrolni test da se poruke konzole zaista hvataju.
- Mobilni meni: otvaranje tasterom, fokus ide na `Close`, `Esc` zatvara i vraća fokus na `Menu`.
- Screenshotovi su u [`screenshots/`](screenshots/) (`<varijanta>-<širina>.jpg`, `?fx=static`; 375 px kroz iframe od 375 px jer headless Chrome ne ide ispod 500 px).

## Šta nije provjereno

- Safari, Firefox i pravi telefoni (samo Chromium).
- Performanse animiranog canvasa: ovo je 2D skica, ne mjeri ništa o budućem WebGL vortexu.
- Izgled lica: glava je proceduralna; pravi sken (P0.SCAN) i shader (P1.FACE.05) izgledaće drugačije.
- Hero copy, tekst badgea dostupnosti i lista linkova su nacrt.
