# Uputstvo: 3D sken glave za hero (iPhone 17 Pro Max)

> Task: **P0.SCAN.01** · Koristi se za P0.SCAN.02 (snimanje), P0.SCAN.03 (izvoz) i P0.SCAN.04 (provjera kvaliteta).
> Povezano: [prd.md §6.2](../prd.md#62-hero-glava-od-tačaka) · [tech.md §7.4](../tech.md#74-lice) · P1.FACE.01–03, P1.FACE.11
> Podaci o aplikacijama provjereni **2026-11-24** (izvori i status provjere su u [§11](#11-izvori-i-status-provjere)).

---

## Ukratko (za dan snimanja)

1. Oblačan dan ili veliki prozor bez direktnog sunca. Bez tvrdih sjenki.
2. Mat koža (puder ili papirne maramice), bez naočala i nakita, kosa sklonjena s čela i ušiju, jednobojna majica.
3. Sjediš na stolici **bez naslona** (ne na stolici koja se okreće), ramena u kadru, pogled u jednu tačku, neutralan izraz.
4. **Druga osoba** skenira: Polycam → Photo/Object mode → 3 kruga oko glave (visina očiju, iznad, ispod) + vrh glave + ispod brade. Ukupno **80–150 fotografija**, polako, ≥ 1 minut po krugu.
5. Obrada: **Photogrammetry** (ne Gaussian Splat), kvalitet **Full**, **Object Masking** uključen.
6. Pregled na telefonu po checklisti iz [§8](#8-checklista-kvaliteta-pregled-odmah-na-telefonu). Ako ne prolazi, snimi ponovo **odmah**, dok su svjetlo i šminka isti.
7. Izvoz `.glb` (s teksturom) + 3 referentne fotografije. Fajlovi idu u `content/intake/`, **nikad u git**.

---

## 1. Cilj: šta pipeline treba od skena

Hero prikazuje Zijadovu glavu kao oblak tačaka. Sken se ne prikazuje direktno. Prolazi kroz pipeline iz tech.md §7.4:

```
scan.glb ──► scripts/face/prepare.py ──► face.clean.glb ──► scripts/face/sample.ts ──► face.bin ──► WebGL
            (Blender headless)                              (MeshSurfaceSampler)       (≤ 35k tačaka)
            · ukloni podlogu i šum                          · gustina po luminanci
            · odsijeci ispod ramena                           teksture (0.6) i
            · centriraj na nos                                zakrivljenosti (0.4)
            · visina glave = 1.0                            · više tačaka na očima,
            · decimacija na ~200k trokuta                     obrvama, nosu, usnama
```

Iz toga slijede zahtjevi prema skenu:

| Zahtjev | Zašto (koji korak ga traži) |
|---|---|
| **Lice bez rupa** (čelo, obrazi, nos, usne, brada) | `MeshSurfaceSampler` uzorkuje samo postojeću površinu. Rupa je prazna mrlja u oblaku tačaka i nema je kako popuniti. |
| **Čista geometrija oko očiju, nosa i usana** | Te zone dobijaju najviše tačaka (zakrivljenost). Šum ili "otopljen" nos tu se najviše vidi i lice prestaje biti prepoznatljivo. |
| **Tekstura u modelu, ravnomjerno osvijetljena** | Gustina tačaka zavisi od luminance teksture: **tamnija mjesta dobijaju više tačaka**. Tvrda sjenka ispod nosa ili na jednoj strani lica bi se "upekla" u teksturu i dobila tačke koje nisu dio lica. Zato je raspršeno svjetlo važnije od bilo koje postavke u aplikaciji. |
| **Ramena i vrat u kadru** | `prepare.py` siječe ispod ramena. Mora postojati nešto ispod brade da bi rez bio čist, a ne da se siluete brade i vrata pojedu. |
| **Proporcije tačne** (bez razvučene glave) | Skript normalizuje visinu glave na 1.0. Ako je glava deformisana, normalizacija to ne popravlja. |
| **Stražnja strana glave nije kritična** | Kamera nikad ne ide iza glave, pa se tačke na stražnjoj strani mogu odbaciti (tech.md §7.4). Kosa pozadi može biti grublja, ali ne smije imati velike "šiljke" šuma koji smetaju centriranju i skaliranju. |

---

## 2. Izbor aplikacije

### 2.1 Preporuka

| | **Polycam** (preporuka) | **Scaniverse** (rezerva) |
|---|---|---|
| Mod | **Photo mode** (u novijim verzijama se možda zove **Object mode**) | Snimanje kamerom; u novijoj verziji postoji opcija "Ignore Lidar" |
| Obrada | Odabrati **Photogrammetry** (ne Gaussian Splat), kvalitet **Full**, uključiti **Use Object Masking** (preporuka iz Polycamovog vodiča za snimanje osobe) | Fokus aplikacije je pomjeren na **Gaussian splatove**; meshevi se prave kroz cloud obradu |
| Izvoz mesha | GLB/glTF (prema Polycamovim stranicama dostupno besplatno) | GLB, FBX (mesh) · SPZ, PLY (splat) |
| PLY | Prema izvorima samo na plaćenim planovima | PLY je **splat ili point cloud, ne mesh** |
| Besplatno | Ograničen broj Photo mode skenova (**tačan limit nije potvrđen**, aplikacija ga pokaže prije obrade) | Aplikacija je besplatna, uz ograničenu cloud obradu na besplatnom nivou |

**Zašto Polycam:** ima eksplicitan izbor *Photogrammetry* + *Object Masking* i zvanični vodič za snimanje osobe. Pipeline treba **mesh s teksturom**, a Polycam ga daje direktno kao GLB.

**Zašto Scaniverse samo kao rezerva:** trenutna verzija je usmjerena na Gaussian splatove. Splat nije mesh i `MeshSurfaceSampler` ga ne može uzorkovati. Ako se ide preko Scaniversea, izvozi se **mesh u GLB**, nikako splat PLY ili SPZ.

> ⚠️ **Prije dana snimanja** otvori Polycam i provjeri: (1) kako se mod trenutno zove (Photo ili Object), (2) koliko besplatnih skenova piše da imaš, (3) da li se u izvozu nudi GLB. Ako se nešto razlikuje od ovog uputstva, javi agentu da ažurira fajl.

### 2.2 LiDAR / TrueDepth vs. photogrammetry

| Metoda | Kako radi | Za lice |
|---|---|---|
| **LiDAR** (stražnja kamera, Polycam LiDAR mode, Scaniverse s LiDAR-om) | Senzor mjeri dubinu u stvarnom vremenu, a fotografije se lijepe kao tekstura | Brz i radi u realnom vremenu, ali je mreža dubine gruba: dobar je za prostorije i namještaj. Lice ispadne zaglađeno, a nos, usne i oči gube oblik. **Ne koristiti.** |
| **TrueDepth** (prednja kamera, Face ID senzor) | Dubina iz projektora tačaka na maloj udaljenosti | Precizan na licu, ali je napravljen za selfie: snimaš sam sebe, teško se obuhvati profil, vrh glave i ramena, a tekstura je slabija. **Ne koristiti za ovaj sken.** |
| **Photogrammetry** (Polycam Photo/Object mode) | Iz 80–150 oštrih fotografija glavne kamere računa geometriju i teksturu | Najviše detalja na licu i najbolja tekstura (bitno za luminancu). Traži mirnu osobu, dobro svjetlo i nekoga ko skenira. **Ovo koristimo.** |

> Napomena: opis LiDAR-a i TrueDepth-a je opšte poznato ponašanje tih senzora, a ne tvrdnja iz dokumentacije aplikacija. Zaključak (photogrammetry za lice) se poklapa s Polycamovim vodičem, koji za osobe preporučuje Photogrammetry obradu.

---

## 3. Priprema

### 3.1 Svjetlo (najvažnije)
- **Raspršeno svjetlo sa svih strana.** Najbolje: oblačan dan napolju ili u hladu zgrade. U zatvorenom: veliki prozor bez direktnog sunca, uz bijeli zid ili bijeli čaršaf na suprotnoj strani kao odbljesak.
- **Bez tvrdih sjenki:** bez direktnog sunca, bez jedne jake lampe, bez plafonske rasvjete direktno iznad glave (pravi sjenke ispod obrva i nosa).
- Ne miješati dnevno svjetlo i toplu sijalicu (lice dobija dvije boje).
- **Ne koristiti blic** na telefonu.
- Test: pogledaj lice u ogledalu. Ako vidiš oštru ivicu sjenke ispod nosa ili brade, svjetlo nije dobro.

### 3.2 Koža i lice
- **Mat koža.** Sjajna mjesta (čelo, nos) photogrammetry vidi kao "rupe" ili mrlje. Upotrijebi **providni mat puder** ili prije snimanja upij sjaj **papirnim maramicama za lice** (ponovi između pokušaja).
- Obrijano ili uredno podšišana brada. Pramenovi brade koji štrče stvaraju šum oko vilice.
- Bez naočala, bez nakita (naušnice, lančići, pirsing). Metal i staklo se ne mogu rekonstruisati.

### 3.3 Kosa
- Kosa sklonjena s čela i ušiju, uredna i suha. Bez gela ni sprejeva koji sjaje.
- Ako je kosa duga: veži je pozadi. Pramenovi koji lebde postaju šum.
- Bez kape i trake za kosu.

### 3.4 Odjeća i okolina
- **Jednobojna, mat majica** (bez uzoraka, logotipa i natpisa), boja koja se razlikuje od pozadine i kože (npr. tamno siva ili tamno plava). Okrugli izrez da se vide vrat i ramena.
- **Pozadina:** neutralna i mirna, bez ljudi u pokretu, ekrana ni ogledala iza tebe. Nije potreban zeleni ekran jer Object Masking izdvaja osobu. Važno je samo da se u pozadini ništa ne mijenja.
- **Stolica bez naslona** (tabure) ili s niskim naslonom ispod lopatica. Naslon ne smije biti u kadru oko ramena.
- **Nikad stolica koja se okreće.** Ti miruješ, a osoba sa telefonom ide oko tebe. Ako se okrećeš ti, pozadina "putuje" i rekonstrukcija se raspada.
- Oko stolice ostavi ≥ 1 m slobodnog prostora da se može obići u punom krugu.

---

## 4. Poza

- **Uspravno sjedenje**, leđa ravna, ramena opuštena i spuštena, ruke na krilu (ne u kadru).
- **Neutralan izraz:** opuštena usta, zatvorene usne, bez osmijeha (osmijeh se teško drži i mijenja oblik lica između fotografija).
- **Oči otvorene**, pogled u **jednu fiksnu tačku** u visini očiju (zalijepi traku ili papirić na zid ispred sebe). Ne prati telefon očima.
- **Glava miruje**: ne prati telefon glavom. Brada paralelna s podom.
- **Treptanje:** treptaj je u redu, ali ne smije trajati dugo niti se ponavljati u nizu. Dogovor sa osobom koja skenira:
  - prije zone oko očiju (krug u visini očiju, ispred lica) ona kaže **"oči"**, ti trepneš jednom i zatim držiš oči otvorene 5–10 s;
  - pauzu za treptanje i opuštanje pravite između krugova, dok se osoba premješta, a ne usred kruga.
- **Disanje:** mirno, kroz nos. Ne razgovarati tokom kruga.
- Ukupno trajanje: ~4–6 minuta. Ako osjećaš da se ukočeno ljuljaš, reci "stop" i krug se ponavlja od početka. Bolje je ponoviti krug nego imati pomjeren sken.

---

## 5. Snimanje (skenira druga osoba)

### 5.1 Postavke
- Polycam → **Photo mode** (ili **Object mode**). Ako aplikacija nudi automatsko okidanje, može se koristiti; inače ručno okidati prateći razmake iz §5.3.
- Glavna kamera (1×). **Bez zuma** (0,5× ultra-wide izobličava, a tele mijenja perspektivu).
- Fokus i ekspozicija na lice (tap na lice). Ako aplikacija nudi zaključavanje ekspozicije, zaključaj je da sve fotografije budu iste svjetline.
- Telefon u **portretnoj orijentaciji**; glava i ramena zauzimaju ~60–70 % kadra.
- Udaljenost ~60–80 cm od lica i **ista kroz cijeli krug**.

### 5.2 Putanja: 3 kruga + vrh + ispod brade

```
Pogled sa strane                          Pogled odozgo (svaki krug)

        (2) krug iznad                            ·  ·  ·  ·
       telefon ~30–40° gore                    ·              ·
          \  \  \  \                         ·    pozadi        ·
           \  ___  /                        ·   (rjeđe, ok)      ·
   (1) ───► ( o o )  ◄─── krug u visini     ·       ___          ·
            (  >  )       očiju               ·    (   )  ◄──── glava
            ( ‿ )                           ·      ‾‾‾         ·
           /|   |\                            ·  lice ▼        ·
   (3) ──► / ramena\  krug ispod                ·  (gusto)   ·
          telefon ~20–30° dole                     ·  ·  ·  ·
                                                ◄── smjer kretanja,
                                                    korak po korak
```

Redoslijed:

| # | Krug | Visina telefona | Ugao | Fotografija (orijentaciono) |
|---|---|---|---|---|
| 1 | **Visina očiju** | U visini očiju | Ravno | 36–48 (1 fotografija svakih ~8–10°; ispred lica i na profilima gušće) |
| 2 | **Iznad** | ~30–40 cm iznad glave | Gleda koso dole na lice (~30–40°) | 24–36 |
| 3 | **Ispod** | U visini ramena / grudi | Gleda koso gore (~20–30°), da se vide donja strana brade, nosnice i vrat | 20–30 |
| 4 | **Vrh glave** | Iznad glave | Skoro okomito dole | 5–10 (u par položaja oko tjemena) |
| 5 | **Ispod brade** | Ispred grudi | Gore prema bradi | 5–8 (samo ispred i sa strana, ne treba iza) |
| | | | **Ukupno** | **~90–130** (cilj 80–150) |

### 5.3 Preklapanje, razmak, brzina
- **Preklapanje:** svaka fotografija treba dijeliti ~70 % sadržaja s prethodnom. Praktično: **jedan mali korak u stranu = jedna fotografija**.
- **Brzina:** polako, ravnomjerno, ≥ 1 minut po krugu (Polycamov vodič za osobe preporučuje najmanje minut po obilasku: više fotografija znači oštriji sken).
- **Stani prije okidanja.** Telefon mora biti miran u trenutku slikanja; mutna fotografija je gora od nedostajuće.
- **Telefon uvijek usmjeren na nos**, a ne na pozadinu.
- **Lice dobija najviše pažnje:** prednjih ~180° (od uha do uha preko lica) snima se gušće; stražnja strana glave može rjeđe.
- Ne preskakati dijelove kruga. Ako se nešto propusti, vrati se par koraka unazad i nastavi.
- Pazi na svoju sjenku: osoba koja skenira ne smije bacati sjenku na lice (zato je bitno raspršeno svjetlo i ne stajati između lica i prozora duže nego treba).

### 5.4 Obrada u aplikaciji
- **Photogrammetry** (ne Gaussian Splat).
- Kvalitet **Full** (ili najviši ponuđeni).
- **Use Object Masking: ON.**
- Obrada traje nekoliko minuta (cloud). Ne razilazite se i ne skidajte puder dok model ne bude gotov i pregledan (§8).

---

## 6. Izvoz

### 6.1 Šta se izvozi

| Fajl | Obavezno | Napomena |
|---|---|---|
| `scan.glb` | **Da** | Mesh **s teksturom** (tekstura mora biti ugrađena u GLB). Ovo je ulaz za `prepare.py`. |
| `scan.ply` (point cloud) | Ne | Samo ako je dostupno bez plaćanja. Pipeline radi iz GLB-a; PLY je samo za uporednu provjeru. Iz Scaniversea **ne** izvoziti splat PLY kao zamjenu za mesh. |
| `ref-front.jpg`, `ref-left.jpg`, `ref-right.jpg` | **Da** | Tri obične fotografije u istom svjetlu i pozi, glavna kamera 1×, ~1,5 m udaljenosti, u visini očiju: **front**, **lijevi profil (90°)**, **desni profil (90°)**. Služe za provjeru proporcija i fino podešavanje u P1.FACE.11. |
| Originalne fotografije skena | Poželjno | Ako aplikacija dozvoljava izvoz ulaznih fotografija, sačuvaj ih: omogućavaju ponovnu obradu bez novog snimanja. |

### 6.2 Gdje se spašava

Preporučena struktura (folderi se prave lokalno, ručno):

```
content/intake/
├─ scan/                 ← prema P0.SCAN.03: kompletan set izvoza
│  ├─ scan.glb
│  ├─ scan.ply           (ako postoji)
│  ├─ ref-front.jpg
│  ├─ ref-left.jpg
│  └─ ref-right.jpg
└─ _raw/                 ← tech.md §3 i §7.4: ulaz za pipeline i sirovi materijal
   ├─ scan.glb           (kopija; ovu putanju čita prepare.py)
   └─ scan-photos/       (originalne fotografije skena, ako postoje)
```

> ⚠️ **Ništa od ovoga se ne commituje.** Sken i referentne fotografije su biometrijski podaci (§10). Repo trenutno **nema `.gitignore`** (dolazi u P1.ENV.06), pa do tada prije svakog commita provjeri `git status` i nikad ne radi `git add .` ni `git add content/`.
>
> **Veličina:** GLB s teksturom iz photogrammetry obrade je tipično reda desetina MB, a fotografije skena stotine MB. GitHub odbija fajlove veće od 100 MB, ali to nije razlog: ovi fajlovi ne idu u git ni kad su mali.
>
> **Backup:** drži kopiju na svom disku i u privatnom cloudu (tech.md §19). Ako se fajlovi izgube, sken se mora ponoviti.

---

## 7. Redoslijed na dan snimanja

1. Postavi stolicu, provjeri svjetlo u ogledalu, zalijepi tačku za pogled.
2. Puder ili maramice, kosa, majica, skini naočale i nakit.
3. Osoba koja skenira provjeri postavke (§5.1) i napravi probni krug bez snimanja, da vidi putanju.
4. Snimanje: krug 1 → pauza → krug 2 → pauza → krug 3 → vrh → ispod brade.
5. Obrada (§5.4), pa **odmah** pregled po checklisti (§8).
6. Ako ne prolazi: popravi uzrok (tabela u §9) i ponovi.
7. Kad prolazi: 3 referentne fotografije u istom svjetlu i pozi, pa izvoz (§6).

---

## 8. Checklista kvaliteta (pregled odmah na telefonu)

Otvori model u aplikaciji, rotiraj ga i zumiraj lice. Ovo je osnova i za agentov pregled u **P0.SCAN.04**.

| # | Provjera | Prolazi kad | Ponovi sken ako |
|---|---|---|---|
| 1 | **Rupe na licu** | Čelo, obrazi, nos, usne i brada su zatvorena površina | Bilo koja rupa na licu (i mala). Rupe pozadi na kosi su prihvatljive. |
| 2 | **Oči** | Kapci i oblik oka su jasni; tekstura oka nije razmazana | Oči su mutne mrlje, zatvorene, ili se vidi "dvostruki" kapak (pomjeren pogled ili treptaj) |
| 3 | **Nos** | Vrh nosa i nosnice imaju oštar oblik | Nos je "otopljen", zaobljen ili spojen s usnom |
| 4 | **Usne i brada** | Linija usana je jasna; ispod brade postoji površina | Usne su razmazane; ispod brade je rupa |
| 5 | **Uši** | Oblik uha je prepoznatljiv (detalji unutar uha nisu bitni) | Uši su "otopljene" grude ili fale |
| 6 | **Kosa** | Obris kose je čist, bez šiljaka | Veliki šiljci ili oblak šuma oko glave (sitan šum je ok, čisti ga `prepare.py`) |
| 7 | **Tekstura i svjetlo** | Lice je ujednačeno osvijetljeno; boja kože je ista s obje strane | Vidi se tvrda sjenka (ispod nosa, na jednoj strani lica) ili sjajne bijele mrlje |
| 8 | **Proporcije** | Glava izgleda kao ti iz profila i sprijeda | Glava je razvučena, iskrivljena ili ima "dupli" obris (pomjeranje tokom snimanja) |
| 9 | **Vrat i ramena** | Vrat i početak ramena su u modelu | Model je odsječen na bradi ili vratu |

**Pravilo:** tačke 1–4 i 7–9 moraju proći. Tačke 5–6 mogu imati manje greške. Kad nisi siguran, ponovi sken odmah: svjetlo, puder i poza su tada isti, a novi termin znači novu pripremu.

---

## 9. Česte greške i rješenja

| Simptom | Uzrok | Rješenje |
|---|---|---|
| Rupe na čelu ili nosu | Sjaj kože | Više pudera ili maramica; izbjegavati direktno svjetlo |
| "Dupli" ili razvučen obris glave | Pomjeranje tokom snimanja | Fiksna tačka za pogled, ruke na krilu, pauze između krugova; ponoviti krug ako se pomjeriš |
| Mutne ili zatvorene oči | Treptanje ili praćenje telefona pogledom | Dogovor "oči" (§4), pogled u tačku na zidu |
| "Otopljen" nos, uši | Premalo fotografija ili mutne fotografije | Sporije, stati prije okidanja, gušće ispred lica i na profilima |
| Tvrda sjenka u teksturi | Sunce, jedna lampa, svjetlo s plafona | Oblačan dan ili prozor bez sunca + bijeli odbljesak |
| Rupa ispod brade, nema vrata | Preskočen krug ispod i snimci ispod brade | Krug 3 + 5–8 snimaka ispod brade (§5.2) |
| Rupa ili šum na tjemenu | Preskočen vrh glave | 5–10 snimaka odozgo |
| Šum i šiljci oko kose | Raspuštena ili sjajna kosa | Vezati kosu, bez gela; Object Masking ON |
| Dio pozadine ili stolice u modelu | Masking nije uključen ili je naslon u kadru | Object Masking ON; stolica bez naslona |
| Model zaglađen, bez detalja | Snimljeno u LiDAR modu ili obrađeno kao splat | Photo/Object mode + Photogrammetry, kvalitet Full |
| Izvezen fajl nema teksturu | Pogrešan format ili opcija izvoza | Izvoz u GLB s teksturom; provjeriti otvaranjem fajla na računaru |
| Aplikacija ne dozvoljava obradu | Potrošeni besplatni skenovi | Provjeriti broj skenova prije dana snimanja (§2.1); alternativa je Scaniverse mesh u GLB |

---

## 10. Privatnost

- **Sken lica je biometrijski podatak** (GDPR čl. 9 ga tretira posebno kad se koristi za identifikaciju). Postupamo s njim kao s najosjetljivijim materijalom u projektu.
- **Sirovi fajlovi** (`scan.glb`, `scan.ply`, fotografije skena, referentne fotografije) **nikad ne idu u git, u `dist/`, na preview ni na produkciju.** Provjera `scripts/checks/dist-leaks.ts` (tech.md §3) treba to i automatski potvrditi kad bude napravljena.
- Na sajtu se prikazuje **samo uzorkovani i kvantizovani oblak tačaka** (`src/assets/fx/face.bin`, ≤ 35k tačaka, bez teksture i bez fotografija).
- Fajlovi se ne šalju trećim stranama osim aplikacije u kojoj se obrađuju. Nakon izvoza možeš obrisati sken iz clouda aplikacije ako to želiš (u tom slučaju sačuvaj originalne fotografije za ponovnu obradu).
- Agent smije **čitati** sken samo lokalno, za P0.SCAN.04 i P1.FACE.*; ne kopira ga van `content/intake/` niti ga uploaduje.

---

## 11. Izvori i status provjere

Provjereno **2026-11-24**. ✅ potvrđeno u izvoru · ⚠️ djelimično (izvori se ne slažu ili stranica nije bila dostupna) · ❌ nije potvrđeno (provjeriti u aplikaciji).

| Tvrdnja | Status | Izvor |
|---|---|---|
| Polycam vodič za osobu: Photogrammetry (ne Gaussian Splat), kvalitet Full, Use Object Masking; ravnomjerno svjetlo bez tvrdih sjenki; osoba ne smije da se pomjera; ≥ 1 min obilaska | ✅ (sažetak pretrage; sama stranica je vraćala 403 pri direktnom čitanju) | [Polycam: How to Capture a Person](https://learn.poly.cam/hc/en-us/articles/28271869062420-How-to-Capture-a-Person) |
| Photo mode je u novijoj verziji preimenovan u Object mode | ⚠️ (jedan izvor) | [TechRadar: Polycam review](https://www.techradar.com/computing/websites-apps/polycam-pulls-in-the-real-world-and-make-sense-of-it-in-3d-and-i-am-hooked) |
| Polycam: GLB/glTF izvoz besplatan; PLY i ostali formati na plaćenim planovima | ⚠️ (stranice pomoći vratile 403; izvori se razlikuju oko toga koji plan uključuje PLY) | [Polycam: What File Types Can Polycam Export?](https://learn.poly.cam/hc/en-us/articles/27756102599572) · [Polycam Basic Plan](https://poly.cam/pricing/basic-plan) |
| Polycam: broj besplatnih Photo mode skenova | ❌ (izvori navode različite brojke; aplikacija pokaže preostali broj) | [Polycam: Can I use Polycam for free?](https://learn.poly.cam/product-faqs/faq/can-i-use-polycam-for-free) |
| Scaniverse je besplatan; neograničeno snimanje i obrada splatova na uređaju; ograničena cloud obrada na besplatnom nivou; izvoz SPZ, PLY, GLB, FBX; opcija "Ignore Lidar" | ✅ | [App Store: Scaniverse](https://apps.apple.com/us/app/scaniverse-lidar-3d-scanner/id1541433223) |
| Scaniverse PLY je splat ili point cloud, ne mesh; za mesh koristiti GLB | ⚠️ (forum korisnika i zajednice) | [Nomad Sculpt forum: Importing PLY](https://forum.nomadsculpt.com/t/importing-ply/15757) · [Niantic Spatial: Scaniverse](https://nianticspatial.com/products/scaniverse) |
| Oblačno vrijeme daje prirodno raspršeno svjetlo; za glavu snimati od vrata do vrha glave, stražnja strana manje kritična | ✅ | [Reallusion: Headshot and Polycam](https://magazine.reallusion.com/2025/01/20/becoming-a-game-character-using-headshot-and-polycam/) |
| 80–150 fotografija, 3 kruga, bez naočala, mat koža, druga osoba skenira | Zahtjev projekta | [prd.md P0.SCAN.02](../prd.md) |
| Raspodjela fotografija po krugovima, uglovi i udaljenost (§5.2) | Preporuka agenta, nije iz izvora | – (prilagoditi ako Polycam guided mode traži drugačije) |
