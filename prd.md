# PRD: lejliczijad.com

> **Product Requirements Document**: portfolio Zijada Lejlića, full-stack developera.
> Verzija 1.0 · 23.11.2026 · Vlasnik: Zijad Lejlić · Status: odobreno za Fazu 0 i Fazu 1
>
> Povezani dokumenti: [tech.md](tech.md) (tehnička specifikacija) · [AGENTS.md](AGENTS.md) (pravila za agente)
>
> Dokumentacija je na bosanskom. Sav kod, komentari, commit poruke i **sav sadržaj sajta su na engleskom (US English)**.

---

## Sadržaj
1. [Sažetak](#1-sažetak)
2. [Ciljevi, ne-ciljevi i metrike uspjeha](#2-ciljevi-ne-ciljevi-i-metrike-uspjeha)
3. [Publika i persone](#3-publika-i-persone)
4. [Ključni korisnički tokovi](#4-ključni-korisnički-tokovi)
5. [Mapa sajta i navigacija](#5-mapa-sajta-i-navigacija)
6. [Globalne funkcionalnosti](#6-globalne-funkcionalnosti)
7. [Specifikacija stranica](#7-specifikacija-stranica)
8. [Sadržaj i šta Zijad dostavlja](#8-sadržaj-i-šta-zijad-dostavlja)
9. [Nefunkcionalni zahtjevi](#9-nefunkcionalni-zahtjevi)
10. [Plan rada: faze i taskovi](#10-plan-rada-faze-i-taskovi)
11. [Rizici](#11-rizici)
12. [Otvorena pitanja](#12-otvorena-pitanja)
13. [Dnevnik odluka](#13-dnevnik-odluka)

---

## 1. Sažetak

lejliczijad.com je lični portfolio na engleskom jeziku. Cilj mu je da donosi **projekte od stranih klijenata** i **ponude za remote posao**.
Prikazuje web aplikacije, web sajtove, promo videa i edukativna videa, a za glavne projekte daje detaljne case studyje.

Sajt se izdvaja po tri stvari:
1. **Vizuelni identitet:** vortex od čestica u pozadini cijelog sajta i Zijadova glava od tačaka (iz 3D skena) u heru, uz animacije i interakcije na nivou agencijskih sajtova.
2. **Najbolji mogući tehnički kvalitet:** Lighthouse 95+, A+ sigurnosni headeri, WCAG 2.2 AA, savršen responsive.
3. **Dokaz kroz rezultate:** case studyji (problem → rješenje → rezultat), testimonijali, video prolazi i logotipi klijenata.

Primarna konverzija je **Book a call** (Cal.com). Sekundarne su kalkulator procjene, kontakt forma, lead magnet i download CV-a.

---

## 2. Ciljevi, ne-ciljevi i metrike uspjeha

### 2.1 Poslovni ciljevi
| # | Cilj | Metrika | Cilj (3 mj. nakon lansiranja) | Cilj (12 mj.) |
|---|---|---|---|---|
| G1 | Upiti za projekte | Zakazani pozivi + forme + kalkulator s emailom | ≥ 4 / mj. | ≥ 10 / mj. |
| G2 | Remote zaposlenje | Download CV-a + upiti od recruitera | ≥ 5 downloada / mj. | ≥ 15 / mj. |
| G3 | Organski saobraćaj | Klikovi iz Google Search Consolea | ≥ 300 / mj. | ≥ 2.000 / mj. |
| G4 | Lista leadova | Prijave za lead magnet | ≥ 10 / mj. | ≥ 40 / mj. |
| G5 | Kredibilitet | Recenzije na Clutchu + Google Business | ≥ 3 | ≥ 8 |

> Ciljne brojke su početna pretpostavka. Zijad ih može korigovati nakon prvog mjeseca podataka.

### 2.2 Ciljevi kvaliteta (obavezni prije lansiranja svake faze)
| Oblast | Zahtjev |
|---|---|
| Performanse | Lighthouse mobile ≥ 95 (Performance, Accessibility, Best Practices, SEO) na svim šablonima stranica |
| Core Web Vitals | LCP < 2,0 s (mobile, 4G), CLS < 0,05, INP < 200 ms |
| Sigurnost | securityheaders.com **A+**, Mozilla Observatory **A+**, SSL Labs **A+**, 0 nalaza visoke ili kritične težine u pen testu |
| Pristupačnost | WCAG 2.2 AA; 0 kritičnih i ozbiljnih axe nalaza; cijeli sajt prohodan samo tastaturom |
| Responsive | 0 horizontalnog skrola i 0 prelaska margina na 320–2560 px; testirano na pravim iOS i Android uređajima |
| SEO | Sve indeksabilne stranice imaju jedinstven title, description, canonical, OG sliku i validan JSON-LD; 0 grešaka u Search Consoleu |
| Stabilnost | 0 grešaka u konzoli; 0 neuspjelih E2E testova; 0 pokvarenih linkova |

### 2.3 Ne-ciljevi (namjerno ne radimo)
- Nema baze podataka ni admin panela. Sadržaj su MDX fajlovi u repou.
- Nema korisničkih naloga, logina ni klijentskog portala.
- Nema light teme.
- Nema preloadera.
- Nema zasebnih stranica po industrijama.
- Nema prodaje kurseva ni plaćanja na sajtu.
- Nema kolačića ni cookie bannera (analitika bez kolačića).
- Za sada nema drugih jezika osim engleskog, ali je struktura spremna za `/de/` i `/bs/`.

---

## 3. Publika i persone

**Tržišta:** DACH (DE, AT, CH), UK i Irska, SAD i Kanada, Skandinavija i Benelux.

| Persona | Ko je | Šta traži na sajtu | Glavni strah | Šta ga uvjerava |
|---|---|---|---|---|
| **P1 · Vlasnik malog ili srednjeg biznisa** (DACH) | Vlasnik klinike, građevinske firme, servisa | Može li ovaj čovjek digitalizovati moj biznis i koliko to košta | "Freelancer iz BiH će nestati usred projekta" | Case studyji iz sličnih biznisa, jasan proces, Impressum, intro video, testimonijali |
| **P2 · Founder startupa** (UK/US) | Treba MVP brzo | Brzina, tech stack, cijena | Loš kod koji se mora prepisati | Arhitektura u case studyju, tech stack, kalkulator, GitHub kvalitet |
| **P3 · PM u agenciji** (white-label) | Traži pouzdanog developera za outsourcing | Kvalitet, komunikacija, vremenska zona | Kašnjenja, slaba komunikacija | Proces, dostupnost, vremenska zona (CET), recenzije |
| **P4 · Recruiter ili hiring manager** | Remote pozicija | CV, iskustvo, stack, kako razmišlja | Ne zna stvarni nivo kandidata | CV za download, case studyji s arhitekturom, blog, Lab |
| **P5 · IT manager u većoj firmi** | Interni sistem | Sigurnost, skalabilnost, dokumentacija | Sigurnosni rizik | Sigurnosni pristup u case studyjima, proces, ugovorni uslovi |

---

## 4. Ključni korisnički tokovi

**F1 · Od Googlea do poziva (P1, P2)**
Google ("clinic management software developer") → stranica usluge ili case study → testimonijal → CTA "Book a call" → `/contact` → Cal.com (15 min Intro) → potvrda.

**F2 · Kalkulator (P1, P2)**
Home ili usluga → "Estimate your project" → `/estimate` (koraci) → raspon cijene i trajanja → po želji email za detaljnu procjenu → CTA "Book a consultation" (45 min).

**F3 · Recruiter (P4)**
LinkedIn ili direktni link → Home → About → `/resume` → Download PDF → po želji Book a call.

**F4 · Lead magnet (P1, P2)**
Blog članak ili kalkulator → "Free guide: How much does a custom web app cost" → email + Turnstile → email s linkom za download.

**F5 · Upoznaj me (svi)**
Hero → dugme "Meet me" → modal s intro videom (60–90 s) → CTA u modalu "Book a call".

---

## 5. Mapa sajta i navigacija

```
/                                   Home
/work                               Svi projekti (filter: All · Web apps · Websites · Videos)
/work/[slug]                        Case study (pun ili kratak)
/services                           Pregled usluga
/services/web-app-development
/services/website-development
/services/promo-videos
/services/educational-videos
/services/seo
/services/ai-integration
/about                              Bio, intro video, stack, vrijednosti
/process                            Kako radim
/lab                                Eksperimenti
/lab/[slug]
/blog                               Insights
/blog/[slug]
/estimate                           Kalkulator procjene
/contact                            Book a call (Cal.com) + forma
/resume                             CV (HTML + PDF)
/faq                                FAQ
/guide/web-app-cost                 Lead magnet landing
/privacy  /impressum  /terms        Pravne stranice
/404
/sitemap-index.xml  /robots.txt  /rss.xml  /llms.txt  /.well-known/security.txt
```

**Glavni meni (header):** Work · Services · About · Process · Blog · **[Book a call]** (CTA dugme)
**Sekundarno (footer):** Lab · Estimate · Resume · FAQ · Free guide · Privacy · Impressum · Terms · Social (LinkedIn, GitHub, YouTube, Clutch, Google)

**Pravila za URL-ove:** sve malim slovima, kebab-case, engleski, bez trailing slasha, bez datuma u slugu bloga. **Slug se nakon lansiranja nikad ne mijenja.** Ako mora, ide 301 redirect.

---

## 6. Globalne funkcionalnosti

### 6.1 Pozadina: Particle Vortex (kroz cijeli sajt)
- Jedan WebGL canvas `position: fixed` iza sadržaja, zajednički za sve stranice. Pri navigaciji ostaje živ (ne restartuje se).
- Stil Dust Vortexa: hiljade sitnih bijelih i sivih čestica koje kruže u vrtlogu (curl noise), s povremenim akcentnim (plavim) česticama.
- Reaguje na miša (blago odbijanje ili privlačenje), skrol (brzina i rotacija vrtloga) i prelaze stranica.
- Nivoi kvaliteta po uređaju: high, medium, low, static. Na `prefers-reduced-motion` i bez WebGL-a prikazuje se statična slika.
- Pauzira se kad tab nije vidljiv. Nikad ne blokira čitanje sadržaja: kontrast teksta mora ostati AA i iznad vortexa.

### 6.2 Hero: glava od tačaka
- Model iz 3D skena Zijadove glave, prikazan kao oblak tačaka u Orvane stilu.
- **Intro:** na prvom učitavanju čestice izlete iz vortexa i formiraju lice (≤ 2,5 s). Tekst hero sekcije je vidljiv **odmah** (LCP je tekst, ne canvas).
- **Prati miša:** glava se blago okreće prema kursoru (ograničen ugao, opruga s prigušenjem). Na mobilnom reaguje na nagib telefona samo ako je dozvoljeno; inače blago automatsko kretanje.
- **Hover:** čestice oko kursora se razbježe pa se vrate.
- **Skrol:** dok se skrola niz Home, glava se raspada i čestice se pretapaju u vortex.
- Dok skena nema, koristi se privremeni generički model (task P1.FACE.02).

### 6.3 Magnetni custom kursor
- Krug koji prati miša s inercijom. Mijenja oblik i labelu na hoveru: `View` (projekti), `Play` (video), `Drag` (slider), `Open` (spoljni linkovi).
- Dugmad i CTA linkovi "privlače" kursor (magnetni efekat).
- Isključen na touch uređajima, s `prefers-reduced-motion` i u poljima za unos (ostaje sistemski kursor). Sistemski kursor se nikad ne skriva nad tekstom koji se može selektovati.

### 6.4 Prelazi između stranica
- Filmski prelaz kroz čestice: vortex se ubrza i "proguta" staru stranicu, pa se nova pojavi. Ukupno ≤ 700 ms; navigacija se nikad ne usporava zbog animacije (pre-fetch u pozadini).
- Implementacija: Astro View Transitions + kontroler čestica. Fallback je kratki cross-fade, a uz reduced motion nema animacije.
- Fokus se nakon navigacije premješta na `<h1>` nove stranice, a naslov se najavljuje screen readeru.

### 6.5 Scroll animacije
- Reveal naslova (split po riječima ili linijama), parallax slika, skaliranje kartica, brojači.
- **Pravilo:** sadržaj je čitljiv i bez JavaScripta; animacija nikad ne krije sadržaj duže od 600 ms; ništa ne "čeka" da se animira.
- Smooth scroll (Lenis) samo na desktopu i bez reduced motion; nativni skrol se ne lomi (anchor linkovi, tastatura, `Ctrl+F` rade).

### 6.6 Header i meni
- Header: logo (ime "Zijad Lejlić" kao wordmark), linkovi, CTA "Book a call", badge dostupnosti.
- Header se sakrije pri skrolu dole i pokaže pri skrolu gore; na vrhu stranice je proziran.
- Mobilni meni: fullscreen overlay s velikim linkovima, animiranim ulazom i fokus trapom; zatvara se na `Esc`, X ili klik na link.
- Aktivna stranica je označena (`aria-current="page"`).

### 6.7 Badge dostupnosti
- Zelena pulsirajuća tačka + tekst iz konfiguracije: `Available for new projects — January 2027` / `Limited availability` / `Fully booked until …`.
- Mijenja se u jednom fajlu (`src/data/site.ts`). Prikazuje se u headeru (desktop), heru, na Contactu i u footeru.

### 6.8 Footer
- Veliki završni CTA ("Have a project in mind?" + Book a call + email), navigacija, social linkovi, lokalno vrijeme (CET/CEST, živi sat), badge dostupnosti, pravni linkovi, © godina.

### 6.9 Video (lite embed)
- YouTube preko `youtube-nocookie.com`, s lite facadeom (poster slika + Play dugme). Iframe se učitava **tek na klik**.
- Intro video se otvara u modalu (fokus trap, `Esc`, vraćanje fokusa). Titlovi su uvijek uključeni; transkript je na About stranici.

### 6.10 Analitika događaja
Prate se događaji: `cta_book_call_click`, `cal_booking_opened`, `contact_submit_success`, `estimate_started`, `estimate_completed`, `estimate_email_sent`, `lead_magnet_submit`, `resume_download`, `video_play` (id), `outbound_live_project` (slug), `meet_me_open`.

---

## 7. Specifikacija stranica

Za svaku stranicu važi: jedinstveni `<title>` (≤ 60 znakova), meta description (140–160 znakova), canonical, generisana OG slika, breadcrumbs (osim Home), JSON-LD, tačno jedan `<h1>`, logična hijerarhija naslova i jasan CTA na kraju.

### 7.1 Home `/`
**Svrha:** u 5 sekundi reći ko je Zijad, šta radi i za koga, pa voditi ka radovima i pozivu.
**Glavna ključna riječ:** `full-stack developer` + `hire freelance web app developer`.
Sekcije, redom:
1. **Hero:** H1 (vrijednosna propozicija), podnaslov, CTA `Book a call` + `View work`, dugme `Meet me` (video), badge dostupnosti, glava od tačaka.
2. **Logo traka:** animirani marquee logotipa klijenata (pauzira se na hover i fokus, uz reduced motion je statičan).
3. **Selected work:** 5 glavnih projekata (velike kartice, hover s videom ili slikom, kursor `View`).
4. **Services:** 4 glavne + 2 dodatne usluge, link na svaku stranicu.
5. **Results / stats:** 3–4 brojača (godine iskustva, broj projekata, korisnici sistema…), samo provjerene brojke.
6. **Testimonials:** slider ili mreža (tekst + slika + ime + pozicija), 1 video testimonijal, linkovi na Clutch i Google.
7. **Process teaser:** 5 koraka, link na `/process`.
8. **Insights:** 3 najnovija članka (Faza 2).
9. **Final CTA:** "Let's build something" + Book a call + Estimate.

### 7.2 Work `/work`
- H1 + kratki uvod; filter tabovi `All · Web apps · Websites · Videos` (stanje se čuva u URL-u `?type=app`, a link se može dijeliti).
- Mreža kartica: naslov, klijent, tip, 2–3 taga stacka, godina, thumbnail (AVIF). Puni case studyji su vizuelno istaknuti.
- Video projekti: kartica s posterom; klik vodi na kratki case study s embedom.
- Bez JS-a su vidljivi svi projekti (filter je progresivno poboljšanje).

### 7.3 Case study `/work/[slug]`
**Pun case study** (Avicena, Karamujić Petrol, Limont, KP Bau, Rezervacija):
1. **Hero:** naslov, klijent, jednorečenični ishod, velika slika ili video.
2. **Summary kartica:** Client · Industry · Services · Timeline · Stack · Role · Live link · ključni rezultat.
3. **The challenge:** kako je klijent radio prije i u čemu je bio problem.
4. **Who uses it & how:** korisnici, uloge, tipičan dan s aplikacijom.
5. **The solution:** ključne funkcionalnosti (3–6 blokova sa screenshotom).
6. **Architecture:** dijagram (SVG) + stack + zašto je izabran.
7. **Process:** skice, wireframes, iteracije, odluke.
8. **Before / after:** slider za poređenje ili dvije kolone.
9. **Results:** brojke (okvirne su označene sa "~"), kvalitativni ishodi.
10. **Video walkthrough:** lite YouTube embed + transkript (sklopivi).
11. **Testimonial** klijenta.
12. **Next project** + CTA.

**Kratki case study** (APS Aluminium, Promax Home, Aligner, Limont reels, ostala videa): hero, summary kartica, 1–2 pasusa, galerija ili video, live link, next project.

### 7.4 Services `/services` i `/services/[slug]`
Svaka stranica usluge:
- H1 s ključnom riječi, uvod (problem klijenta), **šta dobijaš** (deliverables), **za koga je**, **proces** (specifičan za uslugu), **relevantni projekti** (2–3 kartice), **tehnologije**, **okvirna cijena i trajanje** ("Projects typically from €X", iz kalkulatora), **FAQ** (4–6 pitanja, FAQPage schema), CTA (Book a call + Estimate).
- JSON-LD: `Service` + `BreadcrumbList` + `FAQPage`.
- Ciljane ključne riječi definiše se kroz keyword research (task P2.SEO.*).

### 7.5 About `/about`
- H1, profesionalna fotografija, priča (ko sam, odakle, kako radim, zašto strani klijenti), **intro video** + transkript, vrijednosti (3–4), tech stack (grupisan), timeline iskustva, "Working with me from abroad" (vremenska zona CET, jezici, komunikacija, alati, način plaćanja), CTA.
- JSON-LD: `Person` (sa `sameAs`: LinkedIn, GitHub, YouTube, Clutch).

### 7.6 Process `/process`
- 6 faza: Discovery call → Proposal & estimate → Design → Development (sedmični demo) → Launch → Support.
- Za svaku fazu: šta se dešava, šta klijent dobija, trajanje, alati. Plus komunikacija (Slack/email/Meet), plaćanje (milestones), vlasništvo koda.
- CTA: Book a call.

### 7.7 Lab `/lab` i `/lab/[slug]`
- Mreža eksperimenata, svaki se učitava lijeno, s kratkim opisom tehnike.
- Početna 3 eksperimenta: (1) **Vortex playground** sa sliderima parametara, (2) **Particle text** (tekst od čestica koji korisnik upiše; samo lokalno, ništa se ne šalje), (3) **Face scan explained**: kako je napravljen hero (pipeline, za recruitere i developere).

### 7.8 Blog `/blog` i `/blog/[slug]`
- Listing s tagovima, stranica članka s TOC-om, vremenom čitanja, autorom, datumom objave i izmjene, povezanim člancima, CTA blokom i lead magnet blokom.
- JSON-LD `BlogPosting`; RSS feed.
- Plan: 1–2 članka mjesečno. Prva 3 se pišu u Fazi 2 (teme u P2.BLOG.*).

### 7.9 Estimate `/estimate` (kalkulator)
- Koraci (jedan po ekranu, progress bar, nazad/naprijed, stanje u URL-u):
  1. Tip projekta (kartice): Landing page · Business website · Website + CMS/blog · Web shop · Custom web app (MVP) · Complex web app / SaaS · Promo video · Educational video series
  2. Obim (ovisi o tipu): broj stranica, broj videa, trajanje videa, broj korisničkih uloga
  3. Funkcionalnosti (checkboxovi): custom design, auth & roles, payments, booking, admin dashboard, integrations (broj), AI feature, multilingual (broj jezika), SEO setup, content writing, data migration
  4. Rok: Standard · Fast-track
  5. **Rezultat:** raspon cijene (npr. `€4,500 – €7,000`), raspon trajanja (sedmice), šta je uključeno, disclaimer ("Estimate only; final quote after a discovery call") + CTA `Book a 45-min consultation` + opcija "Email me this estimate" (ime, email, Turnstile).
- Formula je u [tech.md §11](tech.md#11-kalkulator-procjene); tabela sati i satnica su u privatnom `content/intake/pricing.md` (P1.ENV.21). Satnica se nigdje ne prikazuje.
- Radi i na mobilnom, potpuno dostupan tastaturom i screen readerom (rezultat se najavljuje kroz `aria-live`).

### 7.10 Contact `/contact`
- H1, kratki tekst, **dva tipa poziva** (kartice): `Intro call · 15 min · free` i `Project consultation · 45 min`.
- Cal.com embed se učitava **na klik** (facade), kako se ništa sa strane ne bi učitavalo bez akcije korisnika. Alternativa je direktan link na Cal.com.
- **Kontakt forma** (alternativa): ime\*, email\*, kompanija, tip projekta (select), budžet (raspon), rok, poruka\* (≤ 5.000 znakova), checkbox za Privacy\*, Turnstile, honeypot. Stanja: idle / sending / success / error, uz poruke za svako polje.
- Info: email `support@lejliczijad.com`, lokalno vrijeme, vremena odgovora ("I reply within 24h on business days"), badge dostupnosti, intro video link.

### 7.11 Resume `/resume`
- HTML verzija CV-a (semantička, štampa se lijepo) + dugme `Download PDF`. PDF se generiše pri buildu iz istih podataka (jedan izvor istine).
- Sekcije: summary, skills, experience, selected projects (linkovi na case studyje), education, languages, contact.

### 7.12 FAQ `/faq`
- Grupe: Working together · Pricing & payment · Timeline · Technical · Remote/timezone. Accordion (nativni `<details>`), FAQPage schema.

### 7.13 Lead magnet `/guide/web-app-cost`
- Landing: naslov "How Much Does a Custom Web App Cost in 2027?", šta je u vodiču, preview 2–3 stranice, forma (ime, email, Turnstile, checkbox za privacy) → email s linkom za download (potpisan, ističe za 7 dana).
- Vodič: PDF od 12–20 stranica, dizajniran u brendu.

### 7.14 Pravne stranice
- **Privacy Policy (GDPR):** Zijad kao rukovalac podacima (fizičko lice), koji se podaci prikupljaju (forme, kalkulator email, lead magnet, Cal.com), obrađivači (Cloudflare, Resend, Cal.com, Umami, YouTube na klik, Hostinger email), pravni osnov, rokovi čuvanja, prava korisnika, kontakt.
- **Impressum:** ime i prezime, adresa, email, telefon; napomena da je Zijad fizičko lice (freelancer). Status registracije se ne izmišlja.
- **Terms of Service:** korištenje sajta, kalkulator je samo okvirna procjena, intelektualna svojina sadržaja, ograničenje odgovornosti, mjerodavno pravo.
- Sve pravne stranice imaju datum zadnje izmjene. **Napomena:** tekstove piše agent, ali ih prije objave **pregleda Zijad** (po mogućnosti i pravnik), jer agent nije pravni savjetnik.

### 7.15 404
- Kreativna 404 (čestice formiraju "404"), linkovi na Home, Work i Contact, pretraga projekata, `noindex`.

---

## 8. Sadržaj i šta Zijad dostavlja

### 8.1 Projekti
| Projekat | Format | Live link | Napomena |
|---|---|---|---|
| Avicena management system | **Pun CS** | ? | Sistem za polikliniku |
| Karamujić Petrol | **Pun CS** | ? | Web + aplikacija |
| Limont | **Pun CS** | ? | Web + aplikacija |
| KP Bau | **Pun CS** | ? | |
| Rezervacija (booking app) | **Pun CS** (obavezno) | ? | |
| APS Aluminium | Kratki | aps-aluminium.ba | Samo sajt (+ reel) |
| Promax Home | Kratki | promaxhome.ba | Samo sajt |
| Aligner | Kratki | ? | |
| Limont reels i ostala videa | Kratki (video) | YouTube | Videa su bez govora |

### 8.2 Upitnik po projektu (Zijad popunjava, agent pretvara u case study)
1. Ko je klijent (djelatnost, veličina, država)?
2. Kako su radili prije (papir, Excel, stari sistem)? Šta ih je najviše boljelo?
3. Šta si napravio? Navedi 3–6 ključnih funkcionalnosti.
4. Ko koristi aplikaciju (uloge, koliko ljudi) i kako izgleda tipičan dan?
5. Tehnologije i zašto baš one?
6. Koliko je trajalo i koja je bila tvoja uloga (sam, s timom)?
7. Okvirni rezultati (vrijeme, greške, prihod, broj rezervacija, korisnici…). Napiši odakle znaš.
8. Najteži tehnički problem i kako si ga riješio.
9. Screenshotovi (desktop + mobilni), skice ili wireframes, ako postoje.
10. Dozvola za live link? Ima li demo nalog?
11. Testimonijal klijenta (ili kontakt da ga zamolimo).

### 8.3 Ostali materijali
- 3D sken glave (uputstvo u P0.SCAN), profesionalna fotografija (portret, 3:4, min. 2000 px), kratka biografija, podaci za CV.
- 4–10 testimonijala (tekst, fotografija, ime, pozicija, kompanija, LinkedIn URL) + 1–2 video testimonijala (30–60 s).
- Logotipi klijenata (SVG ili PNG s providnom pozadinom), dozvola za prikaz.
- YouTube linkovi svih videa ili sirovi fajlovi za upload.
- Podaci za Impressum: puno ime, adresa, telefon.
- Linkovi profila: LinkedIn, GitHub, YouTube, Clutch, Google Business.

---

## 9. Nefunkcionalni zahtjevi

| ID | Oblast | Zahtjev |
|---|---|---|
| NFR-01 | Performanse | Početni JS ≤ 90 KB gzip (bez WebGL chunka koji se učitava lijeno); CSS ≤ 35 KB gzip; najviše 3 preloadovana fonta |
| NFR-02 | Performanse | LCP element je tekst (H1); WebGL se inicijalizuje nakon prvog paint-a i ne blokira main thread duže od 50 ms |
| NFR-03 | Performanse | WebGL drži ≥ 55 FPS na srednjem laptopu i ≥ 30 FPS na srednjem Android telefonu; ako padne ispod toga, kvalitet se automatski smanjuje |
| NFR-04 | Pristupačnost | WCAG 2.2 AA; vidljiv fokus; skip link; `prefers-reduced-motion` poštovan svuda; kontrast teksta ≥ 4,5:1 |
| NFR-05 | Responsive | Breakpointi 360/480/768/1024/1280/1536/1920; fluidna tipografija; testirano 320–2560 px; landscape na telefonu |
| NFR-06 | Browseri | Zadnje 2 verzije Chromea, Edgea, Firefoxa i Safarija (macOS i iOS); Samsung Internet; iOS 16+ |
| NFR-07 | Sigurnost | Strogi CSP bez `unsafe-inline` za skripte; HSTS preload; sve ulaze validira server; rate limit; Turnstile; 0 tajni u repou |
| NFR-08 | Privatnost | Bez kolačića; treće strane (Cal.com, YouTube) se učitavaju tek na klik; GDPR Privacy Policy |
| NFR-09 | SEO | SSG HTML za svaku stranicu; validan JSON-LD; sitemap; canonical; OG; hreflang struktura; IndexNow |
| NFR-10 | Pouzdanost | Sajt radi bez JS-a (osim kalkulatora, za koji postoji `<noscript>` poruka i link na kontakt) |
| NFR-11 | Održavanje | Novi projekat ili članak se dodaje jednim MDX fajlom + slikama; build pada ako nedostaje obavezno polje |
| NFR-12 | Kvalitet koda | TypeScript strict, 0 lint grešaka, testovi zeleni u CI-u, svaki PR prolazi review |

---

## 10. Plan rada: faze i taskovi

### 10.1 Legenda
- `[ ]` nije započeto · `[~]` u toku (uz oznaku ko radi) · `[x]` završeno · `[!]` blokirano (uz razlog)
- **Ko:** `A` = agent · `Z` = Zijad · `A+Z` = agent priprema, Zijad odobrava ili radi ručni korak
- **Zavisi:** ID-jevi taskova koji moraju biti završeni prije
- **Gotovo kad:** kriterij prihvatanja; task nije gotov dok svi nisu ispunjeni
- Svaki task = jedna grana = jedan PR (osim `Z` taskova). Detaljna pravila su u [AGENTS.md](AGENTS.md).

### 10.2 Pregled faza
| Faza | Sadržaj | Izlaz |
|---|---|---|
| **0 · Priprema** | Nalozi, DNS, email, prikupljanje sadržaja, 3D sken | Sve spremno za razvoj |
| **1 · Temelj i jezgro** | Repo, CI, dizajn sistem, layout, vortex, hero, kursor, prelazi, Home, Work + 5 case studyja, About, Contact, pravne stranice, SEO osnova, analitika | **Lansiranje v1** |
| **2 · Proširenje** | Usluge, kratki projekti, blog, kalkulator, lead magnet, Process, FAQ, Lab, Resume, testimonijali i recenzije | **Lansiranje v2** |
| **3 · Hardening** | Pen test, sigurnosni audit, puni QA, performanse, SEO audit, monitoring | **Produkcija sertifikovana** |
| **4 · Rast (stalno)** | Blog kalendar, mjesečni SEO izvještaj, kvartalni sigurnosni scan | Kontinuirano |

> Faza 3 ima i "mini" verziju (P1.QA) prije lansiranja v1, da v1 nikad ne izađe netestiran.

---

### FAZA 0: Priprema

#### P0.ACC: Nalozi i pristupi
- [x] **P0.ACC.01** Napraviti privatni GitHub repo `lejliczijad-portfolio` i dati agentu pristup (gh CLI login) · Ko: Z · Gotovo kad: `gh repo view` radi iz terminala.
- [x] **P0.ACC.02** Napraviti Cloudflare nalog (ako ne postoji) i uključiti 2FA · Ko: Z · Gotovo kad: nalog postoji, 2FA je aktivan.
- [x] **P0.ACC.03** Napraviti Cal.com nalog, povezati Google kalendar, podesiti radno vrijeme (CET) · Ko: Z · Gotovo kad: kalendar je povezan.
- [x] **P0.ACC.04** Napraviti Cal.com tip poziva "Intro call" (15 min, besplatno, 10 min buffer, min. 12 h unaprijed) · Ko: Z · Zavisi: P0.ACC.03 · Gotovo kad: javni link radi.
- [x] **P0.ACC.05** Napraviti Cal.com tip poziva "Project consultation" (45 min, pitanja: tip projekta, budžet, rok) · Ko: Z · Zavisi: P0.ACC.03 · Gotovo kad: javni link radi.
- [x] **P0.ACC.06** Napraviti Resend nalog · Ko: Z · Gotovo kad: nalog postoji.
- [x] **P0.ACC.07** Napraviti Umami Cloud nalog i website `lejliczijad.com`; dati agentu website ID · Ko: Z · Gotovo kad: ID je upisan u `.env.example` dokumentaciju (ID nije tajna). · **Website ID:** `5ffb4174-1d86-495f-97a7-7fca89f695d9`, skripta `https://cloud.umami.is/script.js` (P1.ENV.07 ga prenosi u `.env.example` kao `PUBLIC_UMAMI_WEBSITE_ID`).
- [x] **P0.ACC.08** Google Search Console: dodati Domain property `lejliczijad.com` (DNS verifikacija ide u P0.DNS) · Ko: Z · Gotovo kad: property čeka verifikaciju. · **TXT za verifikaciju** (nije tajna, unosi se u P0.DNS.09 kao TXT na `@`): `google-site-verification=UO9oNuitP7CPTaSxqZsjOQ2y1MtG_1HfptPNAOmnyd8`
- [ ] **P0.ACC.09** Bing Webmaster Tools: uvoz iz Search Consolea · Ko: Z · Zavisi: P3.SEO.01 · Gotovo kad: sajt je dodan.
- [ ] **P0.ACC.10** Napraviti ili srediti Clutch profil (usluge, opis, portfolio) · Ko: Z · Gotovo kad: profil je javan; URL je poslan agentu.
- [ ] **P0.ACC.11** Napraviti ili srediti Google Business profil (service-area business, bez javne adrese) · Ko: Z · Gotovo kad: profil je verifikovan; URL je poslan.
- [ ] **P0.ACC.12** Srediti YouTube kanal (ime, avatar, banner, opis s linkom na sajt) · Ko: Z · Gotovo kad: kanal je spreman za upload.
- [ ] **P0.ACC.13** Srediti LinkedIn profil (headline usklađen s pozicijom sa sajta, link na sajt) · Ko: Z · Gotovo kad: URL je poslan agentu.

#### P0.DNS: Domena, DNS i email (oprezno, ne smije se prekinuti support@ email)
- [ ] **P0.DNS.01** Izvesti **sve** postojeće DNS zapise iz Hostinger panela (screenshot + lista: A, AAAA, CNAME, MX, TXT, SRV) · Ko: Z · Gotovo kad: lista je u `docs/dns-backup.md` (bez tajni).
- [ ] **P0.DNS.02** Agent pregleda listu i pripremi plan migracije (koji zapisi idu u Cloudflare, posebno MX/SPF/DKIM za Hostinger email) · Ko: A · Zavisi: P0.DNS.01 · Gotovo kad: plan je u `docs/dns-plan.md` i Zijad ga je odobrio.
- [ ] **P0.DNS.03** Dodati domenu u Cloudflare (Free plan) i provjeriti da su svi zapisi iz backupa uvezeni · Ko: Z (A vodi) · Zavisi: P0.DNS.02 · Gotovo kad: svi zapisi postoje u Cloudflareu, MX je "DNS only".
- [ ] **P0.DNS.04** Promijeniti nameservere u Hostingeru na Cloudflare · Ko: Z · Zavisi: P0.DNS.03 · Gotovo kad: Cloudflare pokazuje status "Active".
- [ ] **P0.DNS.05** Testirati email: poslati na i sa `support@lejliczijad.com` (Gmail → support i support → Gmail) · Ko: Z · Zavisi: P0.DNS.04 · Gotovo kad: oba smjera rade.
- [ ] **P0.DNS.06** Verifikovati Resend domenu (DKIM `resend._domainkey`, SPF i MX za `send.` subdomenu) · Ko: Z (A daje vrijednosti) · Zavisi: P0.DNS.04, P0.ACC.06 · Gotovo kad: Resend pokazuje "Verified".
- [ ] **P0.DNS.07** Spojiti SPF root zapis tako da uključuje Hostinger (i ništa ne prelazi limit od 10 lookupa) · Ko: A+Z · Zavisi: P0.DNS.06 · Gotovo kad: SPF validator prolazi.
- [ ] **P0.DNS.08** Dodati DMARC `p=none` s izvještajima (prelazi na `quarantine` u P3.SEC.20) · Ko: A+Z · Gotovo kad: DMARC validator prolazi.
- [ ] **P0.DNS.09** Verifikovati Search Console (TXT zapis) · Ko: Z · Zavisi: P0.DNS.04, P0.ACC.08 · Gotovo kad: "Ownership verified".
- [ ] **P0.DNS.10** Uključiti DNSSEC u Cloudflareu (i DS zapis u Hostingeru) · Ko: Z · Zavisi: P0.DNS.04 · Gotovo kad: DNSSEC validator prolazi.
- [ ] **P0.DNS.11** Dodati CAA zapise (dozvoljeni CA-ovi za Cloudflare) · Ko: A+Z · Gotovo kad: zapis postoji, SSL i dalje radi.
- [ ] **P0.DNS.12** SSL/TLS mod "Full (strict)", "Always Use HTTPS", minimalni TLS 1.2, TLS 1.3 uključen · Ko: Z · Gotovo kad: podešavanja su potvrđena screenshotom.

#### P0.CNT: Prikupljanje sadržaja
- [x] **P0.CNT.01** Agent pripremi upitnik iz §8.2 kao `content/intake/project-questionnaire.md` · Ko: A · Gotovo kad: fajl postoji.
- [ ] **P0.CNT.02** Uz Zijadovu dozvolu, agent pregleda lokalne foldere projekata (`~/Desktop/avicena_menagment_system`, `KpBau`, `rezervacija`, `aligner`, `limont reels`) i izvuče stack, funkcionalnosti i strukturu u `content/intake/<projekat>-notes.md`. **Samo čita, ništa ne mijenja, bez tajni.** · Ko: A · Gotovo kad: 5 fajlova s bilješkama.
- [ ] **P0.CNT.03** Zijad popuni upitnik za **Avicenu** · Ko: Z · Zavisi: P0.CNT.01 · Gotovo kad: svih 11 odgovora.
- [ ] **P0.CNT.04** Zijad popuni upitnik za **Karamujić Petrol** · Ko: Z · Gotovo kad: svih 11 odgovora.
- [ ] **P0.CNT.05** Zijad popuni upitnik za **Limont** · Ko: Z · Gotovo kad: svih 11 odgovora.
- [ ] **P0.CNT.06** Zijad popuni upitnik za **KP Bau** · Ko: Z · Gotovo kad: svih 11 odgovora.
- [ ] **P0.CNT.07** Zijad popuni upitnik za **Rezervaciju** · Ko: Z · Gotovo kad: svih 11 odgovora.
- [ ] **P0.CNT.08** Kratki podaci za APS Aluminium, Promax Home, Aligner i Limont reels (2–3 rečenice + linkovi) · Ko: Z · Gotovo kad: podaci su u `content/intake/short-projects.md`.
- [ ] **P0.CNT.09** Screenshotovi za 5 glavnih projekata (desktop 1440 px + mobilni 390 px, ključni ekrani, **bez pravih ličnih podataka pacijenata ili kupaca**) · Ko: Z (A može snimiti javne sajtove) · Gotovo kad: slike su u `content/intake/assets/<projekat>/`.
- [x] **P0.CNT.10** Agent napiše email ili poruku za klijente s molbom za testimonijal (EN + BS verzija, sa 4 vodeća pitanja) · Ko: A · Gotovo kad: šablon je u `content/intake/testimonial-request.md`.
- [ ] **P0.CNT.11** Zijad pošalje molbe za testimonijale i prikupi 4–10 odgovora (tekst + fotografija + dozvola) · Ko: Z · Zavisi: P0.CNT.10 · Gotovo kad: odgovori su u `content/intake/testimonials/`.
- [ ] **P0.CNT.12** Zamoliti 1–2 klijenta za video testimonijal (30–60 s, uz uputstvo za snimanje telefonom) · Ko: Z · Gotovo kad: video fajlovi su primljeni.
- [ ] **P0.CNT.13** Prikupiti logotipe klijenata (SVG ili PNG) + dozvolu · Ko: Z · Gotovo kad: logotipi su u `content/intake/logos/`.
- [ ] **P0.CNT.14** Uploadovati videa na YouTube (naslov, opis i tagovi na engleskom, šablon priprema agent) · Ko: Z (A piše metapodatke) · Gotovo kad: lista YouTube ID-jeva je u `content/intake/videos.md`.
- [ ] **P0.CNT.15** Profesionalna fotografija (portret; neutralna tamna pozadina idealno se uklapa) · Ko: Z · Gotovo kad: fajl je u `content/intake/photo/`.
- [ ] **P0.CNT.16** Podaci za CV (iskustvo, obrazovanje, jezici, vještine) · Ko: Z · Gotovo kad: `content/intake/resume.md`.
- [ ] **P0.CNT.17** Podaci za Impressum (ime, adresa, telefon) · Ko: Z · Gotovo kad: podaci su poslani agentu (unose se u `src/data/legal.ts`).

#### P0.SCAN: 3D sken glave (iPhone 17 Pro Max)
- [x] **P0.SCAN.01** Agent napiše uputstvo `docs/face-scan-guide.md` (aplikacija, svjetlo, poza, izvoz) · Ko: A · Gotovo kad: uputstvo postoji.
- [x] **P0.SCAN.02** Snimiti sken po uputstvu. Preporuka: **Polycam ili Scaniverse, photo/photogrammetry mod; skenira druga osoba** koja te obiđe u 3 kruga (visina očiju, iznad, ispod), 80–150 fotografija. Neutralan izraz, otvorene oči, bez naočala, mat koža (bez sjaja), raspršeno svjetlo (oblačan dan ili prozor), mirno sjedenje, ramena u kadru · Ko: Z · Gotovo kad: postoji model bez rupa na licu.
- [x] **P0.SCAN.03** Izvesti `.glb` (s teksturom) i, ako postoji, `.ply` point cloud; plus 3 referentne fotografije (front, lijevi i desni profil) · Ko: Z · Gotovo kad: fajlovi su u `content/intake/scan/`.
- [x] **P0.SCAN.04** Agent provjeri kvalitet skena (rupe, šum, proporcije) i javi treba li ponoviti · Ko: A · Zavisi: P0.SCAN.03 · Gotovo kad: sken je odobren ili su poslane precizne upute za ponovno snimanje.

---

### FAZA 1: Temelj i jezgro (→ lansiranje v1)

#### P1.ENV: Projekt, alati, CI
- [x] **P1.ENV.01** Inicijalizovati Astro projekat (TypeScript strict, pnpm, Node LTS u `.nvmrc`, tačne verzije u `package.json`) · Ko: A · Gotovo kad: `pnpm dev` i `pnpm build` rade.
- [x] **P1.ENV.02** Struktura foldera prema [tech.md §3](tech.md#3-struktura-repozitorija) + path aliasi (`@/components` …) · Ko: A · Zavisi: P1.ENV.01 · Gotovo kad: aliasi rade u Astro, TS-u i Vitestu. · **Bilješka (2026-11-25):** Astro i TS su provjereni ([archive PR 14](https://github.com/ZijadLejlic/lejliczijad-portfolio-archive/pull/14)); provjera aliasa u Vitestu je prebačena u P1.ENV.08 (Zijadova odluka, opcija B). Smoke test aliasa u Vitestu prolazi u P1.ENV.08 (`tests/unit/setup.test.ts`, `tests/api/setup.test.ts`).
- [x] **P1.ENV.03** ESLint (flat config, astro, ts, svelte, jsx-a11y pravila) + Prettier (+ astro i svelte plugin) · Ko: A · Gotovo kad: `pnpm lint` prolazi, `pnpm format` radi.
- [x] **P1.ENV.04** Stylelint za CSS (order, no-hardcoded colors osim tokena) · Ko: A · Gotovo kad: `pnpm lint:css` prolazi.
- [x] **P1.ENV.05** Husky + lint-staged (lint i format na commitu) + commitlint (Conventional Commits) · Ko: A · Gotovo kad: neispravan commit je odbijen.
- [x] **P1.ENV.06** `.editorconfig`, `.gitattributes`, `.gitignore` (uključujući `.env*`, `.dev.vars`, `content/intake/scan/*.glb` ako je prevelik) · Ko: A · Gotovo kad: fajlovi postoje.
- [x] **P1.ENV.07** Shema env varijabli (`astro:env` ili zod) + `.env.example` + `.dev.vars.example` · Ko: A · Gotovo kad: build pada s jasnom porukom ako fali obavezna varijabla.
- [x] **P1.ENV.08** Vitest setup (+ `@cloudflare/vitest-pool-workers` za API) · Ko: A · Gotovo kad: primjer testa prolazi u `pnpm test`; smoke test potvrđuje da `@/*` alias radi u Vitestu (preneseno iz P1.ENV.02). · **Bilješka (2026-11-25):** paket je preimenovan u `@cloudflare/vitest-plugin` (stari je deprecated); projekti `unit` (Node) i `api` (workerd) u `vitest.config.ts`.
- [x] **P1.ENV.09** Playwright setup (chromium, webkit, firefox, Pixel 7, iPhone 15) + `?fx=off` mod za stabilne screenshotove · Ko: A · Gotovo kad: smoke test prolazi.
- [x] **P1.ENV.10** GitHub Actions `ci.yml`: install (cache) → lint → typecheck → unit → build → e2e · Ko: A · Zavisi: P1.ENV.03–09 · Gotovo kad: CI je zelen na PR-u.
- [x] **P1.ENV.11** GitHub Actions `security.yml`: `pnpm audit`, gitleaks, CodeQL · Ko: A · Gotovo kad: radi na PR-u i sedmično (cron). · **Bilješka (2026-11-26):** `pnpm audit` i gitleaks rade na PR-u i sedmično; CodeQL job postoji, ali je isključen (`vars.CODEQL_ENABLED`), jer code scanning na privatnom repou ličnog naloga traži GitHub Code Security. Repo ostaje privatan (Zijadova odluka), pa je uključivanje CodeQL-a izdvojeno u P3.SEC.22.
- [x] **P1.ENV.12** Dependabot ili Renovate (sedmično, grupisano, bez auto-mergea majora) · Ko: A · Gotovo kad: konfiguracija je u repou. · **Bilješka (2026-11-26):** Dependabot (`.github/dependabot.yml`), npm (pnpm) + github-actions, sedmično ponedjeljkom; minor i patch grupisani, svaki major u svom PR-u; cooldown 3–14 dana; nema auto-mergea.
- [x] **P1.ENV.13** Cloudflare Worker (static assets) projekat + `wrangler.jsonc` + adapter `@astrojs/cloudflare` · Ko: A+Z · Zavisi: P0.ACC.02 · Gotovo kad: `wrangler deploy --dry-run` prolazi. · **Bilješka (2026-11-26):** `@astrojs/cloudflare` 14.4.9 + `wrangler` 4.168.0; dry-run prolazi (Worker ~190 KiB, bindingi `ASSETS` + 2 vars). Dodan je `GET /api/health` (tech.md §9.6), jer wrangler odbija `run_worker_first` bez Worker skripte. Pravi deploy, login i `account_id` nisu dirani; to ide u P1.ENV.14 (Z daje API token).
- [x] **P1.ENV.14** Deploy workflow: preview za svaki PR (`*.workers.dev` + `X-Robots-Tag: noindex`), produkcija na `main` (API token sa minimalnim pravima, kao GitHub secret) · Ko: A+Z · Gotovo kad: PR dobija komentar s preview URL-om. · **Bilješka (2026-11-26):** `.github/workflows/deploy.yml` s Workers Previews (`wrangler preview`, ADR-016); PR #38 je dobio komentar `https://pr-38-lejliczijad.lejliczijad-79f.workers.dev` (`X-Robots-Tag: noindex`, `/api/health` ok). Token: Workers Scripts Edit + Account Settings Read, samo jedan nalog. Preview URL-ovi rade tek nakon prvog `wrangler deploy`, pa je Zijad jednom lokalno deployao noindex build (`PUBLIC_DEPLOY_ENV=preview`) na `lejliczijad.lejliczijad-79f.workers.dev`. Produkcijski job na `main` pada dok postoji `TODO(content)` (Zijadova odluka). Subdomena ostaje `lejliczijad-79f`.
- [x] **P1.ENV.15** Branch protection na `main` (obavezan PR, CI zelen, bez force pusha) · Ko: Z (A daje upute) · Zavisi: P1.ENV.20 · Gotovo kad: direktan push na `main` je odbijen. · **Bilješka (2026-11-26):** blokada (GitHub ne dozvoljava rulesets na privatnom repou besplatnog ličnog naloga) je riješena novim javnim repoom (P1.ENV.20). Ruleset "Protect main" (id 28164632, zapis u `.github/rulesets/main.json`) je aktivan, bez bypassa: zabranjeni force push i brisanje, obavezan PR (0 odobrenja, riješeni komentari, squash ili merge), obavezne provjere `Lint, typecheck, unit, build`, `E2E (Playwright)`, `Secret scan (gitleaks)` i `Dependency audit (pnpm)`, grana mora biti ažurna s `main`. Direktan push je testiran i odbijen (GH013).
- [x] **P1.ENV.16** PR šablon + issue šabloni (bug, task) + `CODEOWNERS` · Ko: A · Gotovo kad: novi PR automatski dobija šablon. · **Bilješka (2026-11-26):** `.github/PULL_REQUEST_TEMPLATE.md` (prati AGENTS.md §5.3 + DoD), issue forme `bug.yml` i `task.yml` (prazni issuei isključeni), `CODEOWNERS` (`@ZijadLejlic` za sve). GitHub čita šablone sa `main`, pa se "novi PR dobija šablon" provjerava na prvom PR-u nakon mergea.
- [x] **P1.ENV.17** `README.md` (pokretanje, komande, deploy, linkovi na prd, tech i AGENTS) · Ko: A · Gotovo kad: novi developer pokreće projekat u ≤ 5 min. · **Bilješka (2026-11-26):** svjež clone → `pnpm dev` (HTTP 200) za ~6 s s toplim pnpm cacheom; deploy sekcija opisuje ciljno stanje dok P1.ENV.13–14 nisu gotovi.
- [x] **P1.ENV.18** Content guard: build u produkciji pada ako u sadržaju postoji `TODO(content)`, `lorem` ili `PLACEHOLDER` · Ko: A · Gotovo kad: test s placeholderom ruši `build:prod`. · **Bilješka (2026-11-26):** `scripts/checks/content-guard.ts` skenira `src/` i `public/`; `pnpm build:prod` = guard → `astro build`. Na današnjem `main` `build:prod` namjerno pada na `src/pages/index.astro` (`TODO(content)` za hero copy, P1.HOME.01). Deploy workflow (P1.ENV.14) mora koristiti `build:prod`.
- [x] **P1.ENV.19** ITF fontovi (Clash Display, Satoshi) van repoa: skripta ih pri `pnpm install` preuzima iz zvaničnih Fontshare ZIP-ova i provjerava SHA-256; fajlovi su u `.gitignore` · Ko: A · Gotovo kad: svjež clone bez font fajlova → `pnpm install` → `pnpm build` radi lokalno i u CI-u; pogrešan hash ruši install s jasnom porukom. · **Bilješka (2026-11-26):** `scripts/fonts/fetch.ts` kao `postinstall` (ADR-017); svjež clone → install → build radi lokalno i u CI-u ([archive PR 39](https://github.com/ZijadLejlic/lejliczijad-portfolio-archive/pull/39)). Stara historija i dalje sadrži fajlove (P1.ENV.20).
- [x] **P1.ENV.21** Interni podaci van javnog repoa: `content/intake/**` i podaci kalkulatora (satnica, tabela sati, dodaci, množioci, pragovi) prelaze u privatni repo `lejliczijad-private`, kloniran lokalno u `content/intake/` (u `.gitignore`); tech.md §11 ostaje bez brojki; prepis iz P1.ENV.20 uklanja ih i iz historije · Ko: A+Z · Gotovo kad: stablo `main` nema satnicu, tabelu sati ni `content/intake/`; privatni repo postoji i sadrži ih; probni prepis ne nalazi ih ni u jednom commitu. · **Bilješka (2026-11-26):** privatni repo `ZijadLejlic/lejliczijad-private` je pushan (6 fajlova, uključujući `pricing.md`; `_raw/` i `scan/*` su ignorisani). Probni prepis ne nalazi `content/intake/`, cijene ni ITF fontove ni u jednom commitu (kontrola na staroj historiji: 131 blob s cijenama, 4 fonta). Pravi prepis u P1.ENV.20 (2026-11-26) daje isti rezultat u novom javnom repou.
- [x] **P1.ENV.20** Novi javni repo s prepisanom historijom: `git filter-repo` uklanja ITF font fajlove iz svih commitova, autor email ide na GitHub noreply, gitleaks cijele nove historije, push u novi repo; secreti, varijable i Actions se ponovo podešavaju; stari repo ostaje privatan (arhiva) · Ko: Z (A vodi) · Zavisi: P1.ENV.19, P1.ENV.21 · Gotovo kad: novi repo je javan, CI i deploy zeleni, nijedan commit ne sadrži ITF font fajl. · **Bilješka (2026-11-26):** stari repo je preimenovan u `ZijadLejlic/lejliczijad-portfolio-archive` (privatan, arhiviran, bez secreta, čuva PR-ove 1–40). Novi javni `ZijadLejlic/lejliczijad-portfolio` ima historiju prepisanu `git filter-repo`-om (66 commitova): 0 ITF fontova, 0 `content/intake/`, 0 blobova s cijenama, autor na GitHub noreply, gitleaks čist, stablo identično starom `main`. `(#N)` u porukama commitova je postalo `(archive PR N)`, a linkovi na stare PR-ove u dokumentaciji vode na arhivu (vidljivu samo Zijadu). Secreti, `CODEQL_ENABLED`, environment `production`, secret scanning s push protectionom, vulnerability alerts i private vulnerability reporting su podešeni. CI i Security su zeleni na `main`; Preview deploy (prvi pravi test novog Cloudflare tokena) prolazi na prvom PR-u u novom repou. Produkcijski deploy i dalje namjerno pada na content guardu (`TODO(content)`, P1.HOME.01, odluka uz P1.ENV.14).

#### P1.DS: Dizajn sistem
- [x] **P1.DS.01** Tri vizuelna mockupa hero sekcije (crna + električno plava #4D7CFF, Clash Display + Satoshi + JetBrains Mono) kao HTML preview; Zijad bira smjer · Ko: A+Z · Gotovo kad: Zijad je odobrio jedan smjer. · **Izabrano: C · Off-axis** (2026-11-25), mockupi u `docs/design/p1-ds-01/`.
- [x] **P1.DS.02** Color tokeni (`--color-*`) prema [tech.md §6](tech.md#6-dizajn-tokeni) + dokumentovan kontrast svakog para · Ko: A · Zavisi: P1.DS.01 · Gotovo kad: svi tekstualni parovi ≥ 4,5:1 (veliki tekst ≥ 3:1). · **Bilješka (2026-11-26):** `--color-accent-pressed` je `#4570F5` (Zijadova odluka; `#3A66E6` je imao 4,10:1); parovi u `docs/design/contrast.md`, provjera u `tests/unit/styles/tokens-contrast.test.ts`.
- [x] **P1.DS.03** Self-host fontova (WOFF2; Clash Display i Satoshi originalni, bez subsettinga prema ADR-013; JetBrains Mono subset latin + latin-ext; provjeriti č/ć/š/ž/đ), `font-display: swap`, preload 2 fonta, fallback metrike (`size-adjust`) protiv CLS-a · Ko: A · Gotovo kad: CLS od fontova = 0; licence su dokumentovane u `docs/licenses.md`. · **Bilješka (2026-11-26):** self-hostovani su fajlovi iz zvaničnih Fontshare ZIP-ova (nisu isti kao API fajlovi); preload je Clash 600 + Satoshi 400 (ADR-015, zamijenio ADR-014); CLS 0 u Chromiumu; detalji u `docs/licenses.md`.
- [x] **P1.DS.04** Fluidna tipografska skala (clamp) + tokeni za line-height i letter-spacing · Ko: A · Gotovo kad: naslovi skaliraju 320–2560 px bez prelamanja riječi. · **Bilješka (2026-11-26):** display min smanjen na 40 px (Zijadova odluka); provjera najduže riječi na 11 širina u `docs/design/typography.md`.
- [x] **P1.DS.05** Spacing, radius, border, shadow, z-index tokeni · Ko: A · Gotovo kad: tokeni postoje; z-index skala je dokumentovana.
- [x] **P1.DS.06** Motion tokeni (trajanja, easing krivulje) + globalni `prefers-reduced-motion` reset · Ko: A · Gotovo kad: uz reduced motion nema animacija dužih od 0,01 s osim opacity fade. · **Bilješka (2026-11-26):** reset je u `src/styles/motion.css`; opacity fade je opt-in preko `data-motion="fade"`; provjereno u Chromiumu primjenom pravila iz media bloka (emulacija reduced motion nije bila dostupna, E2E ide s Playwrightom u P1.QA.09).
- [x] **P1.DS.07** CSS reset, base stilovi, `::selection`, `:focus-visible` prsten (akcentni, 2 px + offset), stilovi scrollbara · Ko: A · Gotovo kad: fokus je vidljiv na svim interaktivnim elementima.
- [ ] **P1.DS.08** Layout primitivi: `Container`, `Section`, `Grid`, `Stack`, `Cluster` · Ko: A · Gotovo kad: komponente su dokumentovane na `/_dev/ui`.
- [ ] **P1.DS.09** `Heading`, `Eyebrow` (mono labela), `Text`, `Prose` (MDX stilovi) · Ko: A · Gotovo kad: prikazane na `/_dev/ui`.
- [ ] **P1.DS.10** `Button` (primary, secondary, ghost; veličine; s ikonom; kao link; disabled; loading) · Ko: A · Gotovo kad: sva stanja su prikazana i dostupna tastaturom.
- [ ] **P1.DS.11** `Link` (interni, spoljni s ikonom i `rel="noopener"`, animirana podvlaka) · Ko: A · Gotovo kad: spoljni linkovi se automatski prepoznaju.
- [ ] **P1.DS.12** `Tag`/`Chip`, `Badge`, `AvailabilityBadge` · Ko: A · Gotovo kad: badge čita iz `site.ts`.
- [ ] **P1.DS.13** `Icon` sistem (SVG sprite ili inline, lucide set, `aria-hidden` po defaultu) · Ko: A · Gotovo kad: ikonica nema mrežnih zahtjeva.
- [ ] **P1.DS.14** `ProjectCard` (veliki i mali, hover video ili slika, data za kursor) · Ko: A · Gotovo kad: radi s tastaturom i bez hovera na touch uređajima.
- [ ] **P1.DS.15** `TestimonialCard` + `TestimonialSlider` (dostupan: dugmad, swipe, bez auto-playa ili s pauzom) · Ko: A · Gotovo kad: prolazi axe i tastaturu.
- [ ] **P1.DS.16** `LogoMarquee` (CSS animacija, pauza na hover i fokus, statičan uz reduced motion, duplirani elementi `aria-hidden`) · Ko: A · Gotovo kad: nema skoka na kraju petlje.
- [ ] **P1.DS.17** `StatCounter` (broji kad uđe u viewport, `aria-label` s konačnom vrijednošću) · Ko: A · Gotovo kad: screen reader čita konačnu brojku.
- [ ] **P1.DS.18** `Accordion` (nativni `details`/`summary`, animirana visina) · Ko: A · Gotovo kad: radi bez JS-a.
- [ ] **P1.DS.19** `Modal`/`Dialog` (nativni `<dialog>`, fokus trap, `Esc`, vraćanje fokusa, zaključan skrol) · Ko: A · Gotovo kad: E2E test za tastaturu prolazi.
- [ ] **P1.DS.20** `LiteYouTube` (youtube-nocookie, poster iz `i.ytimg.com` ili lokalni, iframe na klik, naslov za a11y) · Ko: A · Gotovo kad: 0 YouTube zahtjeva prije klika.
- [ ] **P1.DS.21** Form komponente: `Input`, `Textarea` (brojač znakova), `Select`, `RadioCard`, `Checkbox`, `FieldError`, `FormStatus` · Ko: A · Gotovo kad: labele, `aria-describedby` i `aria-invalid` su ispravni.
- [ ] **P1.DS.22** `Breadcrumbs` (+ JSON-LD BreadcrumbList) · Ko: A · Gotovo kad: validan u Rich Results Testu.
- [ ] **P1.DS.23** `Picture`/`Image` wrapper (Astro Image, AVIF + WebP, `sizes`, lazy, blur placeholder, obavezan `alt`) · Ko: A · Gotovo kad: build pada ako fali `alt` (prazan `alt` je dozvoljen samo eksplicitno, za dekoraciju).
- [ ] **P1.DS.24** `BeforeAfter` slider (tastatura: strelice; `role="slider"` s vrijednostima) · Ko: A · Gotovo kad: radi mišem, prstom i tastaturom.
- [ ] **P1.DS.25** `SkipLink` · Ko: A · Gotovo kad: prvi Tab ga prikaže i on vodi na `<main>`.
- [ ] **P1.DS.26** Dev stranica `/_dev/ui` s prikazom svih komponenti (isključena iz produkcijskog builda i sitemapa) · Ko: A · Gotovo kad: ne postoji u `dist/` produkcije.

#### P1.LAY: Layout, navigacija, prelazi
- [ ] **P1.LAY.01** `BaseLayout.astro` (`<html lang="en">`, head slot, SEO komponenta, skip link, header, main, footer) · Ko: A · Zavisi: P1.DS.07 · Gotovo kad: sve stranice ga koriste.
- [ ] **P1.LAY.02** `SEO.astro` (title, description, canonical, OG/Twitter, robots, hreflang priprema, JSON-LD slot) · Ko: A · Gotovo kad: unit test provjerava izlaz za 3 tipa stranice.
- [ ] **P1.LAY.03** Header za desktop (logo, linkovi, CTA, badge, `aria-current`) · Ko: A · Gotovo kad: prolazi a11y i ne prelazi marginu na 1024 px.
- [ ] **P1.LAY.04** Header ponašanje (sakrij na skrol dole, pokaži gore, proziran na vrhu) · Ko: A · Gotovo kad: nema treperenja na iOS bounce skrolu.
- [ ] **P1.LAY.05** Mobilni meni (dugme s `aria-expanded`, fullscreen overlay, fokus trap, `Esc`, animacija) · Ko: A · Gotovo kad: E2E test otvori, navigira i zatvori meni tastaturom i dodirom.
- [ ] **P1.LAY.06** Footer (završni CTA, nav, social, lokalni sat CET/CEST, badge, pravni linkovi) · Ko: A · Gotovo kad: sat pokazuje tačno vrijeme za Europe/Sarajevo i sam prelazi na ljetno računanje.
- [ ] **P1.LAY.07** Astro View Transitions (`ClientRouter`), `transition:persist` za FX canvas, prefetch na hover i viewport · Ko: A · Gotovo kad: canvas se ne re-inicijalizuje pri navigaciji (test brojačem init poziva).
- [ ] **P1.LAY.08** Lifecycle skripti (`astro:page-load` init, `astro:before-swap` cleanup) + util `onPage()` · Ko: A · Gotovo kad: 50 navigacija ne povećava broj listenera ni memoriju (test).
- [ ] **P1.LAY.09** A11y za navigaciju: fokus na `<h1>` nakon swapa, `aria-live` najava naslova stranice · Ko: A · Gotovo kad: VoiceOver najavljuje novu stranicu.
- [ ] **P1.LAY.10** Lenis smooth scroll (desktop, bez reduced motion; anchor linkovi i tastatura rade; reset na navigaciji) · Ko: A · Gotovo kad: `Space`, `PageDown`, `Home`/`End` i `#anchor` rade.
- [ ] **P1.LAY.11** 404 stranica (statična verzija; particle "404" se dodaje u P1.FX.20) · Ko: A · Gotovo kad: Worker vraća status 404 i `noindex`.

#### P1.FX: WebGL: vortex, prelazi, kursor
- [ ] **P1.FX.01** Detekcija mogućnosti: WebGL2, float teksture, `detect-gpu` tier, `deviceMemory`, `hardwareConcurrency`, reduced motion, save-data → `quality: high | medium | low | static` · Ko: A · Gotovo kad: unit testovi pokrivaju matricu odluka.
- [ ] **P1.FX.02** `FxCanvas.astro`: fixed canvas iza sadržaja, `aria-hidden`, `pointer-events: none`, persist kroz navigaciju · Ko: A · Zavisi: P1.LAY.07 · Gotovo kad: canvas je ispod sadržaja i ne hvata klikove.
- [ ] **P1.FX.03** Statični fallback: AVIF poster vortexa + CSS gradijent (za `static`, bez JS-a i dok se WebGL ne učita) · Ko: A · Gotovo kad: nema praznog ekrana ni CLS-a pri zamjeni postera canvasom.
- [ ] **P1.FX.04** Lijeno učitavanje FX bundlea (dynamic import nakon `load` + `requestIdleCallback`) · Ko: A · Gotovo kad: three.js nije u početnom JS bundleu (provjera bundle analizom).
- [ ] **P1.FX.05** `Renderer` singleton (three.js WebGLRenderer, DPR limit po tieru, resize observer, `webglcontextlost` i `restored` handleri) · Ko: A · Gotovo kad: simulirani gubitak konteksta se oporavi bez greške.
- [ ] **P1.FX.06** Render petlja (jedan rAF, delta time clamp, pauza na `visibilitychange`, pauza kad je canvas van ekrana) · Ko: A · Gotovo kad: 0 % GPU-a dok je tab skriven.
- [ ] **P1.FX.07** Adaptivni kvalitet: mjerenje FPS-a (prozor od 2 s); ispod praga se spušta tier, oporavak tek nakon 10 s stabilnosti · Ko: A · Gotovo kad: uz CPU throttle 6× kvalitet automatski padne.
- [ ] **P1.FX.08** GPGPU simulacija vortexa (FBO ping-pong pozicija i brzina, curl noise, broj čestica po tieru) · Ko: A · Gotovo kad: ≥ 55 FPS na high tieru; vizuelno odgovara Dust Vortex referenci.
- [ ] **P1.FX.09** Shader za čestice (veličina po dubini, alpha, bijelo/sivo + ~3 % akcentnih plavih, mekane ivice, additive blending) · Ko: A · Gotovo kad: Zijad odobri izgled na screenshotu i videu.
- [ ] **P1.FX.10** Interakcija s mišem (pozicija u svjetskim koordinatama, polje odbijanja, inercija) · Ko: A · Gotovo kad: efekat je primjetan, ali ne ometa čitanje.
- [ ] **P1.FX.11** Reakcija na skrol (brzina skrola → brzina i rotacija vrtloga, mapirano preko uniforma) · Ko: A · Gotovo kad: nema trzanja pri brzom skrolu.
- [ ] **P1.FX.12** Čitljivost: sloj za "dimming" vortexa iza teksta i sekcija (uniform `uDim` po sekciji) · Ko: A · Gotovo kad: kontrast teksta ≥ 4,5:1 mjeren na najsvjetlijem dijelu vortexa.
- [ ] **P1.FX.13** Kontroler stanja FX-a (`idle`, `hero`, `transition-out`, `transition-in`, `section:<id>`) s tweenovanim uniformama · Ko: A · Gotovo kad: stanja su unit-testirana (bez WebGL-a).
- [ ] **P1.FX.14** Page transition: `transition-out` (ubrzanje + gutanje), `swap`, `transition-in`; ukupno ≤ 700 ms; navigacija ne čeka animaciju duže od 350 ms · Ko: A · Zavisi: P1.FX.13, P1.LAY.07 · Gotovo kad: Zijad odobri video prelaza.
- [ ] **P1.FX.15** Fallback prelaz (CSS View Transition cross-fade) za `low`/`static` + bez animacije uz reduced motion · Ko: A · Gotovo kad: sva tri moda su testirana.
- [ ] **P1.FX.16** Custom kursor: krug + tačka, inercija, `mix-blend-mode`, skriven na touch, reduced motion i iznad inputa · Ko: A · Gotovo kad: nema laga (rAF, `transform` samo).
- [ ] **P1.FX.17** Stanja kursora preko `data-cursor="view|play|drag|open"` + labela · Ko: A · Gotovo kad: radi na karticama, videima, slideru i spoljnim linkovima.
- [ ] **P1.FX.18** Magnetni efekat za `[data-magnetic]` elemente (dugmad, CTA) · Ko: A · Gotovo kad: element se vraća na mjesto; nema pomjeranja layouta.
- [ ] **P1.FX.19** Debug panel (`?fx=debug`: FPS, tier, broj čestica, parametri; isključen u produkciji osim s parametrom) · Ko: A · Gotovo kad: panel nije u produkcijskom bundleu dok se ne zatraži.
- [ ] **P1.FX.20** Particle "404" (čestice vortexa formiraju 404) · Ko: A · Zavisi: P1.FX.08, P1.LAY.11 · Gotovo kad: radi na 404 stranici.
- [ ] **P1.FX.21** Test memorije: 50 navigacija + 10 min idle bez rasta GPU i JS memorije > 10 % · Ko: A · Gotovo kad: izvještaj je u PR-u.

#### P1.FACE: Hero glava od tačaka
- [ ] **P1.FACE.01** Pipeline skripta `scripts/face/prepare.py` (Blender headless: čišćenje, odsijecanje vrata, centriranje, normalizacija skale, decimacija, export GLB) · Ko: A · Zavisi: P0.SCAN.04 · Gotovo kad: `pnpm face:prepare` proizvodi `face.clean.glb`.
- [ ] **P1.FACE.02** Privremeni generički model glave (CC0 ili proceduralni) dok sken ne bude spreman · Ko: A · Gotovo kad: hero radi end-to-end s placeholderom (označeno u `site.ts`).
- [ ] **P1.FACE.03** Skripta za sampling `scripts/face/sample.ts` (MeshSurfaceSampler, gustina po luminanci teksture i zakrivljenosti; više tačaka na očima, nosu i usnama) → `face.bin` (Int16 kvantizacija: x, y, z, luminanca) · Ko: A · Gotovo kad: desktop ≤ 35k tačaka, mobile ≤ 12k; fajl ≤ 300 KB prije Brotlija.
- [ ] **P1.FACE.04** Loader za `face.bin` (fetch nakon LCP-a, dekodiranje u Float32, cache headeri immutable) · Ko: A · Gotovo kad: učitavanje ne blokira main thread > 50 ms.
- [ ] **P1.FACE.05** Shader tačaka lica (veličina po luminanci i dubini, mekani rub, blagi "shimmer" šum) · Ko: A · Gotovo kad: lice je prepoznatljivo; Zijad odobri.
- [ ] **P1.FACE.06** Intro formiranje (svaka tačka kreće iz nasumične pozicije u vortexu → cilj na licu, stagger po visini, ≤ 2,5 s, samo prva posjeta u sesiji) · Ko: A · Gotovo kad: animacija ne pomjera layout i ne kasni LCP.
- [ ] **P1.FACE.07** Praćenje miša (yaw ±25°, pitch ±12°, opruga s prigušenjem; na touch uređajima blago auto-kretanje) · Ko: A · Gotovo kad: kretanje je glatko i nema "skoka" pri ulasku miša.
- [ ] **P1.FACE.08** Hover raspršivanje (screen-space radijus oko kursora, odbijanje u vertex shaderu, povratak oprugom) · Ko: A · Gotovo kad: radi pri 60 FPS na high tieru.
- [ ] **P1.FACE.09** Skrol morph (napredak skrola hero sekcije 0→1 → tačke lica se pretapaju u vortex; obrnuto na skrol gore) · Ko: A · Gotovo kad: morph je reverzibilan i ne trza.
- [ ] **P1.FACE.10** Pozicioniranje lica po breakpointu (desktop desno od teksta, tablet iza, mobilni iznad ili iza teksta sa zatamnjenjem) · Ko: A · Gotovo kad: tekst je čitljiv (AA) na svim breakpointima.
- [ ] **P1.FACE.11** Zamjena placeholdera pravim skenom + fino podešavanje gustine · Ko: A+Z · Zavisi: P1.FACE.03 · Gotovo kad: Zijad kaže da se prepoznaje.

#### P1.CNT: Content model (MDX)
- [ ] **P1.CNT.01** Zod shema `projects` prema [tech.md §5](tech.md#5-content-model) · Ko: A · Gotovo kad: neispravan frontmatter ruši build s jasnom porukom.
- [ ] **P1.CNT.02** Zod sheme `testimonials`, `clients`, `services`, `faq`, `posts`, `lab` · Ko: A · Gotovo kad: sve kolekcije su tipizirane.
- [x] **P1.CNT.03** `src/data/site.ts` (ime, URL, email, social, dostupnost, vremenska zona, Cal.com linkovi) · Ko: A · Gotovo kad: nijedan od tih podataka nije hardkodiran van ovog fajla. · **Bilješka (2026-11-26):** Cal.com linkovi su s naloga (`cal.com/lejliczijad/intro-15`, `consultation-45`); GitHub je `github.com/ZijadLejlic`. Ostali profili čekaju P0.ACC.10–13, a status dostupnosti Zijadovu potvrdu (oba su `TODO(content)`). `wrangler.jsonc`, `.dev.vars.example` i `.env.example` ponavljaju vrijednosti, a `tests/unit/data/site.test.ts` čuva da se ne raziđu.
- [ ] **P1.CNT.04** MDX komponente za case study (`Summary`, `Feature`, `ArchitectureDiagram`, `Gallery`, `Metric`, `Quote`, `BeforeAfter`, `VideoWalkthrough`) · Ko: A · Gotovo kad: primjer MDX-a koristi sve komponente.

#### P1.HOME: Home stranica
- [ ] **P1.HOME.01** Copy za hero: 3 varijante H1 i podnaslova (EN), Zijad bira · Ko: A+Z · Gotovo kad: tekst je odobren.
- [ ] **P1.HOME.02** Hero sekcija (H1, podnaslov, CTA, Meet me, badge, mjesto za lice, statični fallback) · Ko: A · Zavisi: P1.HOME.01 · Gotovo kad: LCP < 2,0 s na mobilnom profilu.
- [ ] **P1.HOME.03** "Meet me" modal s intro videom (do snimanja: dugme skriveno preko feature flaga) · Ko: A · Zavisi: P1.DS.19, P1.DS.20 · Gotovo kad: flag radi; modal je dostupan.
- [ ] **P1.HOME.04** Sekcija Logo traka · Ko: A · Zavisi: P1.DS.16, P0.CNT.13 · Gotovo kad: svi logotipi su optimizovani (SVG ili AVIF) i imaju `alt`.
- [ ] **P1.HOME.05** Sekcija Selected work (5 projekata, scroll animacija) · Ko: A · Zavisi: P1.DS.14 · Gotovo kad: kartice vode na case studyje.
- [ ] **P1.HOME.06** Sekcija Services (6 usluga; u v1 linkuju na `/services#…`, a u v2 na podstranice) · Ko: A · Gotovo kad: nema mrtvih linkova.
- [ ] **P1.HOME.07** Sekcija Stats (samo brojke koje je Zijad potvrdio) · Ko: A+Z · Gotovo kad: svaka brojka ima izvor u `content/intake`.
- [ ] **P1.HOME.08** Sekcija Testimonials (+ linkovi na Clutch i Google) · Ko: A · Zavisi: P1.DS.15, P0.CNT.11 · Gotovo kad: prikazuje stvarne testimonijale.
- [ ] **P1.HOME.09** Sekcija Process teaser · Ko: A · Gotovo kad: link na `/process` (v2), a u v1 sekcija stoji samostalno.
- [ ] **P1.HOME.10** Završna CTA sekcija · Ko: A · Gotovo kad: CTA šalje analytics događaj.
- [ ] **P1.HOME.11** Scroll animacije za sve sekcije (GSAP ScrollTrigger + SplitText, cleanup na navigaciji) · Ko: A · Zavisi: P1.LAY.08 · Gotovo kad: bez JS-a i uz reduced motion je sav sadržaj vidljiv.
- [ ] **P1.HOME.12** JSON-LD za Home (`WebSite`, `Person`, `ProfessionalService` u jednom `@graph`) · Ko: A · Gotovo kad: validator nema grešaka.

#### P1.WORK: Work i case studyji
- [ ] **P1.WORK.01** `/work` listing (mreža, sortiranje: istaknuti pa po godini) · Ko: A · Zavisi: P1.CNT.01 · Gotovo kad: svi projekti su prikazani i bez JS-a.
- [ ] **P1.WORK.02** Filter tabovi (`?type=`), `aria-pressed`, animirano preraspoređivanje (FLIP), najava broja rezultata · Ko: A · Gotovo kad: link s filterom se može dijeliti; radi Nazad u browseru.
- [ ] **P1.WORK.03** Šablon punog case studyja (`/work/[slug]`, svih 12 sekcija iz §7.3) · Ko: A · Zavisi: P1.CNT.04 · Gotovo kad: primjer projekta se renderuje bez grešaka.
- [ ] **P1.WORK.04** Šablon kratkog case studyja · Ko: A · Gotovo kad: primjer se renderuje.
- [ ] **P1.WORK.05** "Next project" navigacija (kružno) · Ko: A · Gotovo kad: zadnji projekat vodi na prvi.
- [ ] **P1.WORK.06** JSON-LD za case study (`CreativeWork` ili `SoftwareApplication` + `VideoObject` + `BreadcrumbList`) · Ko: A · Gotovo kad: validator nema grešaka.
- [ ] **P1.WORK.07** Dijagrami arhitekture kao SVG (dostupni: `<title>` i `<desc>`, tamna paleta) · Ko: A · Gotovo kad: postoji šablon dijagrama.
- [ ] **P1.WORK.08** **Avicena**: nacrt case studyja iz upitnika (EN) · Ko: A · Zavisi: P0.CNT.03, P0.CNT.02 · Gotovo kad: MDX je u PR-u.
- [ ] **P1.WORK.09** **Avicena**: Zijad pregleda činjenice i odobri tekst · Ko: Z · Gotovo kad: PR je odobren.
- [ ] **P1.WORK.10** **Avicena**: slike (optimizacija, crop, mockupi uređaja), dijagram arhitekture · Ko: A · Gotovo kad: sve slike su AVIF + WebP, s `alt`.
- [ ] **P1.WORK.11** **Karamujić Petrol**: nacrt · Ko: A · Zavisi: P0.CNT.04
- [ ] **P1.WORK.12** **Karamujić Petrol**: pregled i odobrenje · Ko: Z
- [ ] **P1.WORK.13** **Karamujić Petrol**: slike i dijagram · Ko: A
- [ ] **P1.WORK.14** **Limont**: nacrt · Ko: A · Zavisi: P0.CNT.05
- [ ] **P1.WORK.15** **Limont**: pregled i odobrenje · Ko: Z
- [ ] **P1.WORK.16** **Limont**: slike i dijagram · Ko: A
- [ ] **P1.WORK.17** **KP Bau**: nacrt · Ko: A · Zavisi: P0.CNT.06
- [ ] **P1.WORK.18** **KP Bau**: pregled i odobrenje · Ko: Z
- [ ] **P1.WORK.19** **KP Bau**: slike i dijagram · Ko: A
- [ ] **P1.WORK.20** **Rezervacija**: nacrt · Ko: A · Zavisi: P0.CNT.07
- [ ] **P1.WORK.21** **Rezervacija**: pregled i odobrenje · Ko: Z
- [ ] **P1.WORK.22** **Rezervacija**: slike i dijagram · Ko: A
- [ ] **P1.WORK.23** Slugovi i meta (title i description) za 5 case studyja, uz kratki keyword check za svaki · Ko: A · Gotovo kad: Zijad je odobrio slugove (nakon lansiranja se ne mijenjaju).
- [ ] **P1.WORK.24** Hover video ili animirani preview za kartice (MP4/WebM ≤ 600 KB, muted, `playsinline`, samo na hover i bez reduced motion) · Ko: A · Gotovo kad: ne učitava se na mobilnom.

#### P1.ABOUT: About
- [ ] **P1.ABOUT.01** Copy (priča, vrijednosti, "Working with me from abroad") na osnovu Zijadovih odgovora · Ko: A+Z · Gotovo kad: odobreno.
- [ ] **P1.ABOUT.02** Stranica (fotografija, tekst, stack grid, timeline, video blok, CTA) · Ko: A · Gotovo kad: responsive 320–2560 px.
- [ ] **P1.ABOUT.03** Scenarij za intro video (60–90 s, EN, struktura: ko sam → šta radim → za koga → kako radim → CTA) + uputstvo za snimanje (svjetlo, kadar, zvuk) · Ko: A · Gotovo kad: `docs/intro-video-script.md`.
- [ ] **P1.ABOUT.04** Snimanje intro videa (telefon + svjetlo + lavalier) · Ko: Z · Zavisi: P1.ABOUT.03 · Gotovo kad: sirovi snimak je predan.
- [ ] **P1.ABOUT.05** Montaža (rez, kolor, zvuk), engleski titlovi (SRT), upload na YouTube (unlisted ili public) · Ko: A+Z · Gotovo kad: YouTube ID je u `site.ts`; titlovi rade.
- [ ] **P1.ABOUT.06** Transkript na About stranici (sklopiv) + `VideoObject` JSON-LD · Ko: A · Gotovo kad: validator prolazi.
- [ ] **P1.ABOUT.07** JSON-LD `Person` (`sameAs`, `knowsAbout`, `jobTitle`) · Ko: A · Gotovo kad: validator prolazi.

#### P1.CONT: Contact i API
- [ ] **P1.CONT.01** Stranica `/contact` (2 kartice tipa poziva, info, badge, sat) · Ko: A · Gotovo kad: responsive i dostupna.
- [ ] **P1.CONT.02** Cal.com facade (poster + dugme; embed se učitava na klik; fallback link) · Ko: A · Zavisi: P0.ACC.04–05 · Gotovo kad: 0 zahtjeva prema Cal.com prije klika.
- [ ] **P1.CONT.03** Kontakt forma UI (polja iz §7.10, klijentska validacija istom zod shemom, stanja) · Ko: A · Gotovo kad: forma radi s JS-om; bez JS-a se prikazuje `<noscript>` s `mailto:` linkom (Turnstile traži JS).
- [ ] **P1.CONT.04** Turnstile widget (managed, lazy, tamna tema) · Ko: A · Gotovo kad: token se šalje s formom.
- [ ] **P1.CONT.05** API `POST /api/contact`: method i content-type provjera, Origin provjera, limit veličine tijela · Ko: A · Gotovo kad: unit testovi za 405, 415, 403 i 413.
- [ ] **P1.CONT.06** API: zod `strict()` validacija, normalizacija (trim, NFC), maksimalne dužine · Ko: A · Gotovo kad: testovi za nevažeće i maliciozne ulaze (XSS payloadi, CRLF, unicode trikovi).
- [ ] **P1.CONT.07** API: Turnstile siteverify (secret, remoteip, idempotency key, provjera hostname i action) · Ko: A · Gotovo kad: test s mock-ovanim lažnim tokenom vraća 400.
- [ ] **P1.CONT.08** API: rate limit (Rate Limiting binding 5/min + KV brojač 20/dan po IP-u, IP samo iz `CF-Connecting-IP`) + honeypot + minimalno vrijeme popunjavanja 3 s · Ko: A · Gotovo kad: šesti zahtjev u minuti dobija 429.
- [ ] **P1.CONT.09** Email šablon za Zijada (sva polja escapovana, `Reply-To` samo kao validiran email, bez korisničkog unosa u ostalim headerima) · Ko: A · Gotovo kad: test potvrđuje da je `<script>` u poruci prikazan kao tekst.
- [ ] **P1.CONT.10** Auto-reply klijentu (brendiran, EN, linkovi: Cal.com, Work) · Ko: A · Gotovo kad: stiže na Gmail i Outlook bez spam oznake (test na mail-tester.com ≥ 9/10).
- [ ] **P1.CONT.11** Slanje preko Resend API-ja (timeout, retry 1×, generička greška klijentu, log bez PII) · Ko: A · Gotovo kad: pad Resenda vraća korisniku 502 s porukom "Please email me directly".
- [ ] **P1.CONT.12** E2E: uspješno slanje (mock Resend u testu), greške validacije, rate limit · Ko: A · Gotovo kad: testovi su zeleni u CI-u.
- [ ] **P1.CONT.13** Ručni test na produkciji: stvarni email stiže na `support@lejliczijad.com` · Ko: A+Z · Gotovo kad: Zijad potvrdi prijem.

#### P1.LEGAL: Pravne stranice
- [ ] **P1.LEGAL.01** Privacy Policy (GDPR, svi obrađivači iz [tech.md §15](tech.md#15-treće-strane-i-privatnost)) · Ko: A · Gotovo kad: nacrt je u PR-u.
- [ ] **P1.LEGAL.02** Impressum (fizičko lice; podaci iz P0.CNT.17) · Ko: A · Zavisi: P0.CNT.17
- [ ] **P1.LEGAL.03** Terms of Service · Ko: A
- [ ] **P1.LEGAL.04** Zijad (po mogućnosti i pravnik) pregleda sve tri stranice · Ko: Z · Gotovo kad: odobreno.
- [ ] **P1.LEGAL.05** Linkovi u footeru i formama (checkbox "I agree to the Privacy Policy") · Ko: A · Gotovo kad: svaka forma linkuje na Privacy.

#### P1.SEO: SEO osnova
- [ ] **P1.SEO.01** `@astrojs/sitemap` (bez `/_dev`, 404 i noindex stranica; `lastmod` iz gita) · Ko: A · Gotovo kad: sitemap je validan.
- [ ] **P1.SEO.02** `robots.txt` (produkcija dozvoljava i linkuje sitemap; preview blokira) · Ko: A · Gotovo kad: preview vraća `Disallow: /` + `X-Robots-Tag: noindex`.
- [ ] **P1.SEO.03** Generisanje OG slika pri buildu (satori + resvg, 1200×630, šablon po tipu stranice) · Ko: A · Gotovo kad: svaka stranica ima svoju OG sliku.
- [ ] **P1.SEO.04** Favicon set (SVG + PNG 32/180/192/512) + `site.webmanifest` + `theme-color` · Ko: A · Gotovo kad: realfavicongenerator provjera prolazi.
- [ ] **P1.SEO.05** JSON-LD helperi (tipizirani builderi za `@graph`, `@id` reference) · Ko: A · Gotovo kad: unit testovi za svaki builder.
- [ ] **P1.SEO.06** Pravila za canonical i trailing slash (bez slasha; redirect `/x/` → `/x` sa 301) · Ko: A · Gotovo kad: E2E test redirecta.
- [ ] **P1.SEO.07** i18n struktura (`defaultLocale: 'en'`, bez prefiksa za EN; priprema za `de`/`bs`; hreflang komponenta spremna, a dok postoji samo EN emituje samo `x-default`) · Ko: A · Gotovo kad: dodavanje locale-a ne traži refaktor.
- [ ] **P1.SEO.08** `/.well-known/security.txt` + `/llms.txt` (sažetak sajta za AI pretraživače) · Ko: A · Gotovo kad: oba fajla se serviraju.
- [ ] **P1.SEO.09** Audit headinga i internih linkova (skripta koja traži više H1, preskočene nivoe, siročad stranice) · Ko: A · Gotovo kad: skripta je dio CI-a.

#### P1.ANL: Analitika
- [ ] **P1.ANL.01** Cloudflare Web Analytics (uključiti u dashboardu; bez dodatne skripte ako je automatski) · Ko: Z+A · Gotovo kad: podaci se vide.
- [ ] **P1.ANL.02** Umami Cloud skripta (`defer`, samo u produkciji, u CSP-u) · Ko: A · Zavisi: P0.ACC.07 · Gotovo kad: pageview je vidljiv u Umamiju.
- [ ] **P1.ANL.03** Util `track(event, props)` + događaji iz §6.10 · Ko: A · Gotovo kad: svaki događaj je ručno potvrđen u Umamiju.
- [ ] **P1.ANL.04** Ciljevi (goals) u Umamiju za Book a call i contact submit · Ko: Z (A daje upute) · Gotovo kad: ciljevi postoje.

#### P1.QA: QA prije lansiranja v1 (blokira lansiranje)
- [ ] **P1.QA.01** Test overflowa: Playwright na 320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920 i 2560 px, svaka stranica: `scrollWidth <= clientWidth`, nijedan element van viewporta · Ko: A · Gotovo kad: 0 prelaza.
- [ ] **P1.QA.02** Vizuelni regresioni snapshotovi (FX isključen, maska za dinamične dijelove) za sve stranice × 4 breakpointa · Ko: A · Gotovo kad: baseline je odobren.
- [ ] **P1.QA.03** axe test za svaku stranicu (0 kritičnih i ozbiljnih) · Ko: A
- [ ] **P1.QA.04** Ručni test samo tastaturom (cijeli tok F1 i F5) · Ko: A · Gotovo kad: checklista je u PR-u.
- [ ] **P1.QA.05** VoiceOver (macOS + iOS) prolaz kroz Home, case study i Contact · Ko: A+Z · Gotovo kad: bilješke su u PR-u, problemi su riješeni.
- [ ] **P1.QA.06** Lighthouse CI (mobile + desktop) za svaki šablon; budžeti iz NFR-01 · Ko: A · Gotovo kad: svi rezultati ≥ 95.
- [ ] **P1.QA.07** Provjera linkova (interni + spoljni) i HTML validacija · Ko: A · Gotovo kad: 0 grešaka.
- [ ] **P1.QA.08** Pravi uređaji: iPhone 17 Pro Max (Safari), stariji iPhone ako postoji, Android (Chrome, Samsung Internet), MacBook (Safari, Chrome, Firefox), Windows (Edge) · Ko: Z (A daje checklistu) · Gotovo kad: checklista je popunjena.
- [ ] **P1.QA.09** Test bez JS-a i uz reduced motion (sav sadržaj dostupan) · Ko: A
- [ ] **P1.QA.10** Brzi sigurnosni pregled prije v1: headeri (A+), osnovni ZAP baseline, ručni test forme · Ko: A · Zavisi: P3.SEC.01–05 · Gotovo kad: nema High nalaza.
- [ ] **P1.QA.11** Pregled konzole: 0 grešaka i 0 upozorenja na svim stranicama u 3 browsera · Ko: A

#### P1.LAUNCH: Lansiranje v1
- [ ] **P1.LAUNCH.01** Spojiti custom domenu `lejliczijad.com` + `www` → 301 na apex · Ko: A+Z · Gotovo kad: oba rade preko HTTPS-a.
- [ ] **P1.LAUNCH.02** Produkcijske tajne (`wrangler secret put`: Turnstile, Resend, token secret) · Ko: Z (A daje komande) · Gotovo kad: `/api/contact` radi u produkciji.
- [ ] **P1.LAUNCH.03** Smoke test produkcije (sve stranice 200, forma, Cal.com, video, analitika) · Ko: A · Gotovo kad: checklista je zelena.
- [ ] **P1.LAUNCH.04** Poslati sitemap u Search Console + zatražiti indeksiranje ključnih stranica · Ko: Z · Gotovo kad: sitemap ima status "Success".
- [ ] **P1.LAUNCH.05** Uptime monitoring (UptimeRobot ili Cloudflare Health Checks) za `/` i `/api/health` · Ko: A+Z · Gotovo kad: alarm stiže na email.
- [ ] **P1.LAUNCH.06** Git tag `v1.0.0` + CHANGELOG · Ko: A

---

### FAZA 2: Proširenje (→ lansiranje v2)

#### P2.SEO: Keyword research i strategija
- [ ] **P2.SEO.01** Keyword research za 6 usluga (volumen, težina, namjera; tržišta US, UK i DE na engleskom) → `docs/seo/keywords.md` · Ko: A · Gotovo kad: svaka stranica ima primarnu i 3–5 sekundarnih ključnih riječi.
- [ ] **P2.SEO.02** Keyword mapa za postojeće stranice (Home, About, case studyji) i ispravke title i description · Ko: A · Gotovo kad: nema kanibalizacije (jedna ključna riječ, jedna stranica).
- [ ] **P2.SEO.03** Analiza 5 konkurentskih portfolija i agencija (struktura, sadržaj, šta im fali) · Ko: A · Gotovo kad: `docs/seo/competitors.md`.
- [ ] **P2.SEO.04** Plan internog linkovanja (usluga ↔ case study ↔ blog) · Ko: A · Gotovo kad: matrica linkova je dokumentovana i implementirana.
- [ ] **P2.SEO.05** Blog kalendar za 6 mjeseci (12 tema, ključna riječ, namjera, CTA) · Ko: A+Z · Gotovo kad: Zijad je odobrio kalendar.

#### P2.SRV: Stranice usluga
- [ ] **P2.SRV.01** `/services` pregled (6 kartica, uvod, CTA) · Ko: A
- [ ] **P2.SRV.02** Šablon stranice usluge (sekcije iz §7.4) · Ko: A
- [ ] **P2.SRV.03** Web app development: copy + FAQ + povezani projekti · Ko: A (Z odobrava)
- [ ] **P2.SRV.04** Website development: copy + FAQ + povezani projekti · Ko: A (Z odobrava)
- [ ] **P2.SRV.05** Promo videos: copy + FAQ + embedovi videa · Ko: A (Z odobrava)
- [ ] **P2.SRV.06** Educational videos: copy + FAQ · Ko: A (Z odobrava)
- [ ] **P2.SRV.07** SEO: copy + FAQ · Ko: A (Z odobrava)
- [ ] **P2.SRV.08** AI integration: copy + FAQ · Ko: A (Z odobrava)
- [ ] **P2.SRV.09** JSON-LD `Service` + `FAQPage` za svih 6 · Ko: A
- [ ] **P2.SRV.10** Prebaciti linkove s Home na nove podstranice · Ko: A

#### P2.WORK: Kratki projekti i videa
- [ ] **P2.WORK.01** APS Aluminium (kratki CS + live link + reel) · Ko: A · Zavisi: P0.CNT.08
- [ ] **P2.WORK.02** Promax Home (kratki CS) · Ko: A
- [ ] **P2.WORK.03** Aligner (kratki CS) · Ko: A
- [ ] **P2.WORK.04** Limont reels (video CS) · Ko: A
- [ ] **P2.WORK.05** Ostala videa (po jedan kratki unos po videu ili grupa) · Ko: A · Zavisi: P0.CNT.14
- [ ] **P2.WORK.06** `VideoObject` JSON-LD za sve video unose (thumbnail, uploadDate, duration) · Ko: A

#### P2.BLOG: Blog
- [ ] **P2.BLOG.01** Listing `/blog` (paginacija od 12, tagovi) · Ko: A
- [ ] **P2.BLOG.02** Šablon članka (TOC, vrijeme čitanja, autor, datumi, povezani članci, CTA, lead magnet blok, kod blokovi uz Shiki) · Ko: A
- [ ] **P2.BLOG.03** RSS `/rss.xml` · Ko: A
- [ ] **P2.BLOG.04** JSON-LD `BlogPosting` · Ko: A
- [ ] **P2.BLOG.05** Članak 1: "How I Digitized a Polyclinic: Building Avicena" (case-study priča, link na CS) · Ko: A+Z
- [ ] **P2.BLOG.06** Članak 2: "How Much Does a Custom Web App Cost in 2027?" (podržava lead magnet i kalkulator) · Ko: A+Z
- [ ] **P2.BLOG.07** Članak 3: "Building a Booking System That Actually Gets Used" (Rezervacija) · Ko: A+Z
- [ ] **P2.BLOG.08** Sekcija Insights na Home (3 najnovija) · Ko: A
- [ ] **P2.BLOG.09** IndexNow ping pri deployu novih članaka · Ko: A

#### P2.EST: Kalkulator procjene
- [ ] **P2.EST.01** Zijad pregleda i potvrdi tabelu sati i množioce iz privatnog `content/intake/pricing.md` (model u [tech.md §11](tech.md#11-kalkulator-procjene)) · Ko: Z · Gotovo kad: tabela ima oznaku "approved".
- [ ] **P2.EST.02** Čista funkcija `estimate(input): Result` + konfiguracija `src/data/pricing.ts` · Ko: A · Zavisi: P2.EST.01 · Gotovo kad: 100 % pokrivenost unit testovima, uključujući granične slučajeve.
- [ ] **P2.EST.03** UI korak 1: tip projekta (radio kartice) · Ko: A
- [ ] **P2.EST.04** UI korak 2: obim (dinamična polja po tipu) · Ko: A
- [ ] **P2.EST.05** UI korak 3: funkcionalnosti · Ko: A
- [ ] **P2.EST.06** UI korak 4: rok · Ko: A
- [ ] **P2.EST.07** UI rezultat (raspon cijene i sedmica, uključeno, disclaimer, CTA-ovi, `aria-live`) · Ko: A
- [ ] **P2.EST.08** Stanje u URL-u (dijeljenje procjene) + navigacija nazad i naprijed · Ko: A
- [ ] **P2.EST.09** API `POST /api/estimate` (sva zaštita kao kod P1.CONT.05–11; server **ponovo računa** procjenu, ne vjeruje klijentu) · Ko: A
- [ ] **P2.EST.10** Email: procjena klijentu + obavijest Zijadu · Ko: A
- [ ] **P2.EST.11** Analytics događaji (start, korak, završetak, email) · Ko: A
- [ ] **P2.EST.12** E2E testovi (svi tipovi projekata, mobilni, tastatura) · Ko: A
- [ ] **P2.EST.13** `<noscript>` fallback + link na kontakt · Ko: A

#### P2.LEAD: Lead magnet
- [ ] **P2.LEAD.01** Sadržaj vodiča "How Much Does a Custom Web App Cost in 2027?" (12–20 stranica, struktura → tekst) · Ko: A · Gotovo kad: Zijad je odobrio tekst.
- [ ] **P2.LEAD.02** Dizajn PDF-a (HTML šablon u brendu → PDF preko Playwrighta; tamna i svjetla verzija za štampu) · Ko: A
- [ ] **P2.LEAD.03** Landing `/guide/web-app-cost` · Ko: A
- [ ] **P2.LEAD.04** API `POST /api/lead` (zaštita kao kod P1.CONT) + email s potpisanim linkom (HMAC, ističe za 7 dana) · Ko: A
- [ ] **P2.LEAD.05** `GET /api/guide/download?token=` (provjera potpisa i isteka, stream PDF-a; PDF nije javno dostupan na statičnoj putanji) · Ko: A
- [ ] **P2.LEAD.06** Obavijest Zijadu o novom leadu · Ko: A
- [ ] **P2.LEAD.07** Lead magnet blokovi na blogu i u rezultatu kalkulatora · Ko: A

#### P2.PAGES: Ostale stranice
- [ ] **P2.PAGES.01** `/process` (6 faza, copy + vizual timeline) · Ko: A (Z odobrava)
- [ ] **P2.PAGES.02** `/faq` (25–35 pitanja u grupama) + FAQPage schema · Ko: A (Z odobrava)
- [ ] **P2.PAGES.03** `/resume`: podaci `src/data/resume.ts` (iz P0.CNT.16) · Ko: A
- [ ] **P2.PAGES.04** `/resume`: HTML stranica + print CSS · Ko: A
- [ ] **P2.PAGES.05** `/resume`: PDF generisan pri buildu (Playwright print) + dugme za download (događaj `resume_download`) · Ko: A
- [ ] **P2.PAGES.06** `/lab` listing · Ko: A
- [ ] **P2.PAGES.07** Lab 1: Vortex playground (slideri, bez slanja podataka) · Ko: A
- [ ] **P2.PAGES.08** Lab 2: Particle text · Ko: A
- [ ] **P2.PAGES.09** Lab 3: Face scan explained (pipeline, interaktivni prikaz koraka) · Ko: A

#### P2.SOC: Društveni dokaz
- [ ] **P2.SOC.01** Video testimonijali (montaža, titlovi, YouTube, embed na Home i u case studyju) · Ko: A · Zavisi: P0.CNT.12
- [ ] **P2.SOC.02** Clutch i Google Business badgevi (statični, linkovani; bez skripti treće strane) · Ko: A · Zavisi: P0.ACC.10–11
- [ ] **P2.SOC.03** Zamoliti 3 klijenta za recenziju na Clutchu ili Googleu (šablon poruke priprema A) · Ko: Z

#### P2.QA: QA prije lansiranja v2
- [ ] **P2.QA.01** Ponoviti P1.QA.01–P1.QA.11 za sve nove stranice · Ko: A
- [ ] **P2.QA.02** Rich Results Test za FAQ, Article, Video i Breadcrumbs · Ko: A
- [ ] **P2.QA.03** Git tag `v2.0.0` + CHANGELOG · Ko: A

---

### FAZA 3: Hardening i sertifikacija

#### P3.SEC: Sigurnost
- [ ] **P3.SEC.01** Security headeri u `public/_headers` (ili Worker middleware) prema [tech.md §13](tech.md#13-sigurnost) · Ko: A · Gotovo kad: securityheaders.com A+.
- [ ] **P3.SEC.02** CSP s hashevima za inline skripte (Astro CSP ili build skripta), bez `unsafe-inline` za skripte · Ko: A · Gotovo kad: 0 CSP grešaka u konzoli; Observatory A+.
- [ ] **P3.SEC.03** CSP `report-to` endpoint `/api/csp-report` (rate limitiran, samo logovanje) · Ko: A
- [ ] **P3.SEC.04** HSTS s `preload` (nakon 2 sedmice stabilnog HTTPS-a) + prijava na hstspreload.org · Ko: Z (A vodi) · Gotovo kad: domena je na listi za preload.
- [ ] **P3.SEC.05** `Permissions-Policy`, `COOP`, `CORP`, `Referrer-Policy`, `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors` · Ko: A
- [ ] **P3.SEC.06** SRI za sve skripte treće strane gdje je moguće (Umami) ili self-proxy · Ko: A
- [ ] **P3.SEC.07** Threat model (STRIDE) za sve API endpointe → `docs/security/threat-model.md` · Ko: A
- [ ] **P3.SEC.08** OWASP ZAP baseline scan (cijeli sajt) u CI-u · Ko: A · Gotovo kad: 0 High/Medium.
- [ ] **P3.SEC.09** OWASP ZAP active scan na preview okruženju protiv `/api/*` · Ko: A · Gotovo kad: 0 High/Medium.
- [ ] **P3.SEC.10** nuclei scan (templates: misconfig, exposures, cves) · Ko: A
- [ ] **P3.SEC.11** Ručni pen test: XSS (reflected i stored kroz email), HTML injection u emailu, CRLF/header injection, CSRF, JSON parser trikovi, prototype pollution, rate-limit bypass (X-Forwarded-For spoofing), Turnstile replay, veliki payloadi, unicode i homoglyph email, open redirect, path traversal na download linku, manipulacija tokenom (HMAC, istek) · Ko: A · Gotovo kad: izvještaj `docs/security/pentest-report.md` sa svakim testom i rezultatom.
- [ ] **P3.SEC.12** Provjera da u `dist/` nema source mapa, `.env` fajlova, `/_dev` stranica ni internih bilješki (`content/intake`) · Ko: A · Gotovo kad: test u CI-u.
- [ ] **P3.SEC.13** Audit zavisnosti (`pnpm audit`, licence, napušteni paketi) · Ko: A · Gotovo kad: 0 high/critical.
- [ ] **P3.SEC.14** Gitleaks scan kompletne historije · Ko: A · Gotovo kad: 0 nalaza.
- [ ] **P3.SEC.15** Cloudflare: WAF managed rules (free), Bot Fight Mode, rate limiting pravilo za `/api/*` na edgeu · Ko: Z (A vodi) · Gotovo kad: pravila su aktivna i testirana.
- [ ] **P3.SEC.16** Prava Cloudflare API tokena (minimalno: Workers deploy za jedan nalog) i 2FA na svim nalozima (GitHub, Cloudflare, Resend, Cal.com, Hostinger) · Ko: Z · Gotovo kad: checklista je potvrđena.
- [ ] **P3.SEC.17** Rotacija tajni (dokumentovan postupak) · Ko: A · Gotovo kad: `docs/security/secrets-rotation.md`.
- [ ] **P3.SEC.18** Logovanje bez PII (IP hashiran dnevnom solju), obrada grešaka bez stack traceova prema klijentu · Ko: A
- [ ] **P3.SEC.19** SSL Labs test (A+) · Ko: A
- [ ] **P3.SEC.20** DMARC `p=quarantine` nakon 2 sedmice čistih izvještaja (pa `reject`) · Ko: Z (A vodi)
- [ ] **P3.SEC.21** Retest svih nalaza nakon popravki + završni izvještaj · Ko: A
- [ ] **P3.SEC.22** Uključiti CodeQL u `security.yml` (repo varijabla `CODEQL_ENABLED=true`) kad repo postane javan ili kad postoji GitHub Code Security licenca; do tada ostaje isključen (izdvojeno iz P1.ENV.11) · Ko: Z (A vodi) · Gotovo kad: CodeQL job radi na PR-u i sedmično, 0 High/Critical nalaza. · **Bilješka (2026-11-26):** `CODEQL_ENABLED=true` je postavljen u novom javnom repou; CodeQL (JS/TS) je zelen na `main` i na prvom PR-u. Otvoren je 1 Medium nalaz (`js/http-to-file-access` u `scripts/fonts/fetch.ts`, preuzimanje fontova s provjerom SHA-256), 0 High/Critical. Ostaje otvoreno dok ne prođe prvi sedmični (cron) run; trijaža Medium nalaza ide uz to.

#### P3.PERF: Performanse
- [ ] **P3.PERF.01** Bundle analiza (svaka ruta) + uklanjanje nepotrebnog koda · Ko: A
- [ ] **P3.PERF.02** Test slabog uređaja (CPU 6×, mreža Slow 4G): LCP, INP i FPS FX-a · Ko: A
- [ ] **P3.PERF.03** Pregled slika (dimenzije, `sizes`, AVIF kvalitet, `fetchpriority` za hero) · Ko: A
- [ ] **P3.PERF.04** Cache headeri (hashirani asseti `immutable` 1 godinu, HTML `must-revalidate`, `face.bin` immutable) · Ko: A
- [ ] **P3.PERF.05** Early Hints / preconnect pregled · Ko: A
- [ ] **P3.PERF.06** RUM: Core Web Vitals iz CF Web Analyticsa nakon 2 sedmice; popraviti stranice ispod cilja · Ko: A

#### P3.QA: Puni QA
- [ ] **P3.QA.01** Kompletna regresija: svi E2E, vizuelni, a11y, overflow i link testovi · Ko: A
- [ ] **P3.QA.02** Cross-browser matrica (NFR-06) na BrowserStacku ili pravim uređajima · Ko: A+Z
- [ ] **P3.QA.03** Edge slučajevi: zoom na 200 % i 400 % (WCAG reflow), veliki font u OS-u, landscape na telefonu, uski prozori 280 px, visoki ekrani 2560×1440, ultrawide · Ko: A
- [ ] **P3.QA.04** Prevođenje u browseru (Google Translate) ne lomi layout · Ko: A
- [ ] **P3.QA.05** Print stilovi (case study, resume) · Ko: A
- [ ] **P3.QA.06** Offline ili mrežne greške (forma pokazuje jasnu poruku) · Ko: A

#### P3.SEO: SEO audit
- [ ] **P3.SEO.01** Kompletan tehnički SEO audit (crawl cijelog sajta: statusni kodovi, canonical, duplikati, dubina, orphan stranice, meta dužine) · Ko: A
- [ ] **P3.SEO.02** Schema validator za sve stranice · Ko: A
- [ ] **P3.SEO.03** OG preview (LinkedIn Post Inspector, X, Facebook, Slack, WhatsApp) · Ko: A+Z
- [ ] **P3.SEO.04** Search Console: Coverage, Enhancements, CWV, bez grešaka · Ko: Z (A analizira)
- [ ] **P3.SEO.05** Bing Webmaster + IndexNow provjera · Ko: Z

#### P3.DOC: Dokumentacija i predaja
- [ ] **P3.DOC.01** `docs/how-to-add-project.md` (korak po korak, s primjerom) · Ko: A
- [ ] **P3.DOC.02** `docs/how-to-add-post.md` · Ko: A
- [ ] **P3.DOC.03** `docs/runbook.md` (deploy, rollback, tajne, šta ako forma ne radi, šta ako email ne stiže) · Ko: A
- [ ] **P3.DOC.04** Git tag `v3.0.0` · Ko: A

---

### FAZA 4: Rast (stalno)
- [ ] **P4.01** 1–2 članka mjesečno prema kalendaru · Ko: A+Z
- [ ] **P4.02** Mjesečni SEO izvještaj (Search Console + Umami: upiti, pozicije, konverzije, prijedlozi) · Ko: A
- [ ] **P4.03** Dodavanje novih projekata u roku od 2 sedmice nakon završetka · Ko: A+Z
- [ ] **P4.04** Kvartalni sigurnosni re-scan (ZAP, nuclei, audit, headeri) · Ko: A
- [ ] **P4.05** Kvartalno ažuriranje zavisnosti (major verzije, uz regresiju) · Ko: A
- [ ] **P4.06** Ažuriranje badgea dostupnosti po potrebi · Ko: Z
- [ ] **P4.07** Evaluacija `/de/` verzije nakon 6 mjeseci (po podacima iz DACH-a) · Ko: A+Z

---

## 11. Rizici

| Rizik | Vjerovatnoća | Uticaj | Mitigacija |
|---|---|---|---|
| WebGL efekti ruše performanse i SEO | Srednja | Visok | LCP je tekst, FX se učitava lijeno, adaptivni kvalitet, statični fallback, Lighthouse budžeti u CI-u |
| Migracija DNS-a prekine `support@` email | Srednja | Visok | Backup zapisa (P0.DNS.01), plan koji odobrava Zijad, test emaila odmah nakon migracije |
| Sken lica lošeg kvaliteta | Srednja | Srednji | Uputstvo, provjera kvaliteta (P0.SCAN.04), placeholder model, ponovno skeniranje |
| Kašnjenje sadržaja (upitnici, testimonijali) | Visoka | Visok | Faza 0 paralelno s razvojem, šabloni i upitnici, agent priprema nacrte iz lokalnih foldera |
| Animacije štete pristupačnosti | Srednja | Srednji | Reduced motion svuda, sadržaj nikad ne zavisi od animacije, axe i VoiceOver testovi |
| Spam ili zloupotreba formi | Srednja | Srednji | Turnstile, rate limit, honeypot, WAF |
| Izmišljene tvrdnje u sadržaju | Niska | Visok | Pravilo u AGENTS.md: ništa bez izvora; Zijad odobrava svaki case study |
| Pravni tekstovi nisu ispravni | Srednja | Srednji | Zijad pregleda, preporuka da pogleda i pravnik |
| Lock-in na Cloudflare | Niska | Niski | Statični build je prenosiv; API je mali i izolovan u `src/pages/api` + `src/server` |

---

## 12. Otvorena pitanja

Riješiti prije taska koji je naveden.

| # | Pitanje | Blokira | Default ako nema odgovora |
|---|---|---|---|
| Q1 | Tačan H1 i vrijednosna propozicija | P1.HOME.02 | Agent predlaže 3 varijante (P1.HOME.01) |
| Q2 | Live linkovi i demo nalozi za 5 glavnih projekata | P1.WORK.* | Bez linka, samo screenshotovi |
| Q3 | Konačna tabela sati za kalkulator | P2.EST.02 | Draft iz privatnog `content/intake/pricing.md` |
| Q4 | Smije li telefon biti javan u Impressumu | P1.LEGAL.02 | Samo email + adresa |
| Q5 | Način plaćanja za strane klijente (Wise, PayPal, Payoneer…) za FAQ i Process | P2.PAGES.01–02 | "Bank transfer (SEPA/SWIFT) or Wise" |
| Q6 | Jezici koje Zijad govori (za About i CV) | P1.ABOUT.01 | English, Bosnian/Croatian/Serbian |
| Q7 | Koje su godine iskustva i ukupan broj projekata (za Stats) | P1.HOME.07 | Sekcija se ne prikazuje bez potvrde |
| Q8 | Kako kalkulator računa bez otkrivanja satnice u javnom kodu i JS bundleu (npr. računanje samo na serveru, a brojke kao Worker secret ili privatni modul pri buildu) | P2.EST.02 | Agent predlaže 2–3 varijante prije P2.EST.02 |

---

## 13. Dnevnik odluka

| Datum | Odluka | Razlog |
|---|---|---|
| 2026-11-23 | Lični brend "Zijad Lejlić", domena lejliczijad.com | Povjerenje, pretraga po imenu |
| 2026-11-23 | Full-stack developer pozicija; ciljevi su projekti + remote zaposlenje | Zijadov izbor |
| 2026-11-23 | Primarni CTA Book a call (Cal.com: 15 + 45 min) | Najbolja konverzija kod stranih B2B klijenata |
| 2026-11-23 | Kalkulator procjene umjesto cjenovnika; satnica se ne prikazuje (vrijednost je u privatnom `pricing.md`) | Lead magnet + filtriranje |
| 2026-11-23 | 5 punih case studyja: Avicena, Karamujić Petrol, Limont, KP Bau, Rezervacija | Zijadov izbor |
| 2026-11-23 | Astro + Three.js + MDX, bez baze | SEO, performanse, minimalna površina napada |
| 2026-11-23 | Cloudflare (Workers static assets) za hosting; domena ostaje na Hostingeru, DNS ide na Cloudflare | Brzina, WAF, besplatno |
| 2026-11-23 | Email `support@lejliczijad.com` (Hostinger sanduče); Resend za transakcione emailove | Postojeće sanduče |
| 2026-11-23 | Samo dark tema; crna + električno plava `#4D7CFF`; Clash Display + Satoshi + JetBrains Mono | Vizuelni smjer |
| 2026-11-23 | Hero iz 3D skena (iPhone 17 Pro Max); vortex kroz cijeli sajt; filmski prelazi; magnetni kursor; bez preloadera | Vizuelni identitet + CWV |
| 2026-11-23 | YouTube + lite embed; intro video snimljen telefonom | SEO kanal, besplatno, bez kolačića do klika |
| 2026-11-23 | Analitika: Cloudflare Web Analytics + Umami Cloud; bez kolačića i bez cookie bannera | GDPR, konverzije |
| 2026-11-23 | Lead magnet: "How Much Does a Custom Web App Cost in 2027?" | Uz kalkulator, privlači klijente s budžetom |
| 2026-11-23 | Fizičko lice (freelancer): Impressum, Privacy i Terms | Zijadov status |
| 2026-11-23 | GitHub privatni repo, PR za svaki task, CI obavezan | Kvalitet i kontrola |
| 2026-11-23 | Samo EN; i18n struktura spremna za DE i BS | Fokus, kasnije širenje |
| 2026-11-24 | Testimonijali na bosanskom: agent prevodi na engleski, klijent pismeno odobrava i original i prevod prije objave; za sajt se bira jedan doslovan odlomak ≤ 400 znakova | Sajt je samo EN, a testimonijali se objavljuju doslovno; Zijadov izbor (P0.CNT.10) |
| 2026-11-25 | Hero smjer **C · Off-axis**: predimenzionirana glava od tačaka odsječena desnim rubom, nagnut vortex disk, tekst usidren dolje lijevo na tankoj mreži od 4 kolone, mono labele u uglovima (uloga, lokalno vrijeme CET/CEST), H1 u Clash Display 500 | Zijadov izbor između 3 mockupa (P1.DS.01, `docs/design/p1-ds-01/`) |
| 2026-11-25 | Clash Display i Satoshi se self-hostuju bez subsettinga (ADR-013) | ITF FFL v2.0 zabranjuje subsetting bez pismene dozvole; originalni fajlovi (~41 KB za 2 preloada) su ispod budžeta od 90 KB; Zijadov izbor (opcija A) |
| 2026-11-26 | `--color-accent-pressed` = `#4570F5` (P1.DS.02) | `#3A66E6` je s tamnim tekstom imao 4,10:1 i nije prolazio AA; Zijadov izbor |
| 2026-11-26 | Preload Clash Display 500 + Satoshi 400 (ADR-014) | Hero H1 (LCP) je u Clash Display 500, pa se preloaduje font koji LCP stvarno koristi; Zijadov izbor |
| 2026-11-26 | `--text-display` = `clamp(2.5rem, 0.6rem + 8.4vw, 10rem)` (P1.DS.04) | Sa 48 px na 320 px duge riječi ("Infrastructure") nisu stajale u kolonu; od ~600 px krivulja je skoro ista; Zijadov izbor |
| 2026-11-26 | Svi H1, uključujući hero H1, u Clash Display 600; preload Clash Display 600 + Satoshi 400 (ADR-015, zamjenjuje ADR-014 i težinu H1 iz hero smjera C) | Zijad je uporedio 500 i 600 lokalno i izabrao 600; preloadovan je font LCP naslova na svim stranicama |
| 2026-11-26 | PR preview preko Workers Previews (`wrangler preview`) umjesto `wrangler versions upload` (ADR-016); produkcijski deploy na `main` namjerno pada dok postoji `TODO(content)` | Version URL-ovi koriste produkcijske resurse, a Cloudflare za PR-ove preporučuje Previews; na produkciju ne ide sadržaj s placeholderima; Zijadov izbor (P1.ENV.14) |
| 2026-11-26 | `content/intake/**` i podaci kalkulatora (satnica, tabela sati) prelaze u privatni repo `lejliczijad-private`, kloniran u `content/intake/`; prepis za javni repo ih uklanja i iz historije (P1.ENV.21) | Javni repo bi otkrio satnicu i interne bilješke o klijentima; Zijadov izbor |
| 2026-11-26 | Novi javni repo `ZijadLejlic/lejliczijad-portfolio` s prepisanom historijom (bez ITF fontova, `content/intake/`, cijena i privatnog emaila); stari repo je privatna, arhivirana `lejliczijad-portfolio-archive` sa PR-ovima 1–40 (P1.ENV.20) | GitHub zauvijek čuva `refs/pull/*` starih PR-ova, pa force push ne bi uklonio stare commitove; javni repo omogućava ruleset za `main` (P1.ENV.15) i CodeQL na besplatnom nalogu; Zijadov izbor |
