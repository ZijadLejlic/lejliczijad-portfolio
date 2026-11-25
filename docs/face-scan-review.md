# Pregled kvaliteta 3D skena glave (P0.SCAN.04)

> Datum: **2026-11-25** · Pregledao: agent (claude) · Checklista: [face-scan-guide.md §8](face-scan-guide.md#8-checklista-kvaliteta-pregled-odmah-na-telefonu)
> **Odluka: sken 2 je odobren za pipeline (P1.FACE.01). Ponovno snimanje nije potrebno.**

Ovaj fajl sadrži samo tekstualne nalaze. Sken, fotografije i renderi su biometrijski podaci i nisu u repou (vidi [face-scan-guide.md §10](face-scan-guide.md#10-privatnost)).

---

## 1. Šta je pregledano

Zijad je 2026-11-25 snimio dva skena. Oba su izvezena iz Polycama kao GLB s teksturom.

| | Sken 1 | Sken 2 |
|---|---|---|
| Lokalna putanja | `content/intake/scan/scan-1/scan-1.glb` | `content/intake/scan/scan-2/scan-2.glb` (kopija: `content/intake/_raw/scan.glb`) |
| Veličina | 4,3 MB | 17,9 MB |
| Vertexi / trokuti | 28.398 / 49.999 | 56.138 / 99.999 |
| Atributi | `POSITION`, `TEXCOORD_0` (bez normala) | `POSITION`, `TEXCOORD_0` (bez normala) |
| Base color tekstura | 4096 × 4096 JPEG | 8192 × 8192 JPEG |
| Ostale teksture | normal, occlusion | normal, occlusion, metallic-roughness |
| Opseg (x, y, z) | 1,175 × 1,273 × 0,632 | 0,492 × 0,514 × 0,307 |
| Obuhvat | glava, vrat, gornji dio tijela s rukama | glava, vrat, ramena |

**Metoda:** GLB je parsiran lokalno (Python + numpy). Površina je gusto uzorkovana bojom iz teksture i renderovana iz 6 uglova (front, 40°, oba profila, odozgo, odozdo), i s teksturom i kao sjenčena geometrija bez teksture. Renderi su ostali u privremenom folderu agenta i nisu commitovani.

---

## 2. Checklista (face-scan-guide.md §8)

| # | Provjera | Sken 1 | Sken 2 |
|---|---|---|---|
| 1 | Rupe na licu | ❌ rupa ispod brade, na prelazu brade u vrat | ✅ nema; jedna sitna rupa na tjemenu, u kosi |
| 2 | Oči | ⚠️ kapci slabo definisani u geometriji | ✅ oči otvorene, kapci jasni |
| 3 | Nos | ✅ | ✅ oštar vrh i nosnice |
| 4 | Usne i brada | ⚠️ usne mekane; rupa ispod brade | ✅ linija usana jasna (usne blago stisnute) |
| 5 | Uši | ✅ | ✅ oštre |
| 6 | Kosa | ✅ | ✅ obris čist, bez šiljaka |
| 7 | Tekstura i svjetlo | ✅ ujednačeno | ✅ ujednačeno, bez tvrdih sjenki i sjaja |
| 8 | Proporcije | ✅ | ✅ |
| 9 | Vrat i ramena | ✅ | ✅ |

**Zaključak:** sken 2 prolazi sve obavezne tačke. Sken 1 pada na tački 1 (rupa ispod brade). `prepare.py` siječe ispod ramena, pa ta rupa ne bi bila odsječena. Sken 1 ostaje lokalno kao rezerva, ali se ne koristi.

---

## 3. Napomene za pipeline (P1.FACE.01 i P1.FACE.03)

1. **Lančić oko vrata** (P1.FACE.01). Tanak lančić se vidi u teksturi i malo u geometriji, na dnu vrata i preko okovratnika. Nalazi se iznad linije reza, pa ga treba ukloniti ručno u Blenderu ili dodatnim čišćenjem u `prepare.py`. Druga opcija je da ostane, jer će u oblaku tačaka vjerovatno biti neprimjetan. Odluka pri implementaciji P1.FACE.01, uz screenshot u PR-u.
2. **Skala nije metrička kod skena 1** (~1,7× veća od stvarne), dok je sken 2 približno u metrima. Nije problem, jer `prepare.py` normalizuje visinu glave na 1.0. Skript ne smije pretpostavljati metre.
3. **Orijentacija:** kod oba skena je `+Y` gore, `+Z` prema licu, a dno modela je na `y = 0`. To je prirodna glTF orijentacija i `prepare.py` je može direktno koristiti.
4. **Gustina tačaka i brada** (P1.FACE.03). Težina samplinga je `0.6 × luminanca⁻¹ + 0.4 × zakrivljenost` (tech.md §7.4). Brada i kosa su najtamniji dijelovi teksture, a brada je velika površina. S tom formulom bi brada i kosa pokupile nesrazmjerno mnogo tačaka, a koža lica (čelo, obrazi, nos) premalo. Prijedlog za P1.FACE.03: ograničiti doprinos luminance (clamp) ili smanjiti težinu za zone ispod usta, pa provjeriti vizuelno. Ovo je podešavanje pipelinea, ne mana skena. Promjena formule iz tech.md ide uz Zijadovo odobrenje.
5. **Budžet trokuta:** sken 2 ima 100k trokuta, a `prepare.py` decimira na ~200k (tech.md §7.4). Decimacija tu nije potrebna, ali korak treba ostati za buduće skenove.
6. **Normale nisu u GLB-u** (samo pozicije i UV). Zakrivljenost za sampling (P1.FACE.03) se zato računa iz geometrije, a ne čita iz fajla.
7. **Sitna rupa na tjemenu** (sken 2): na stražnjem i gornjem dijelu kose, koji kamera ne vidi. Može se zatvoriti u `prepare.py` (fill holes) ili ignorisati.

---

## 4. Referentne fotografije (P0.SCAN.03)

| Fajl (lokalno, `content/intake/scan/`) | Izvor | Rezolucija |
|---|---|---|
| `ref-front.jpg` | `IMG_4211.HEIC` | 2827 × 2970 |
| `ref-right.jpg` (desni profil) | `IMG_4212.HEIC` | 3855 × 3828 |
| `ref-left.jpg` (lijevi profil) | `IMG_4213.HEIC` | 3855 × 3828 |

- Prvi set (`IMG_4208–4210`) je odbijen: selfie prednjom kamerom (2,7 mm) iz ruke i odozdo, profili ~70–80° okretom glave. Perspektiva izobličava proporcije, a te fotografije služe baš za provjeru proporcija.
- Drugi set je prihvaćen: glavna kamera 1× (6,77 mm, 24 mm ekvivalent), 24 MP, snimano s udaljenosti, profili ~90° okretom cijelog tijela, stražnja kamera (slika nije zrcaljena, pa su lijeva i desna strana tačne). Fotografije nemaju GPS lokaciju.
- JPEG-ovi su isječeni na glavu i ramena (bez osobe koja se vidi u pozadini frontalnog originala) i spremljeni bez EXIF metapodataka.
- Svih 6 originala je premješteno u `content/intake/_raw/ref-originals/`. Ništa nije obrisano.
- **`.ply`** nije izvezen. To je u redu, jer je PLY opcionalan (pipeline radi iz GLB-a).
- **`.gitignore` još ne pokriva `content/intake/scan/` ni `content/intake/_raw/`** (trenutni `.gitignore` iz P1.ENV.01 ima samo `node_modules/`, `dist/` i `.astro/`). Do P1.ENV.06 skenovi su nezaštićeni od slučajnog `git add`.
