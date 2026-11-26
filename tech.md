# Tehnička specifikacija: lejliczijad.com

> Verzija 1.0 · 23.11.2026 · Prati [prd.md](prd.md) · Pravila rada su u [AGENTS.md](AGENTS.md)
>
> Ovaj dokument je **izvor istine za tehničke odluke**. Promjena odluke ide kroz ADR (§20) i Zijadovo odobrenje.
> Tamo gdje piše **"provjeriti pri implementaciji"**, agent mora potvrditi tačnu vrijednost u zvaničnoj dokumentaciji, a ne iz sjećanja.

---

## Sadržaj
1. [Pregled arhitekture](#1-pregled-arhitekture)
2. [Stack](#2-stack)
3. [Struktura repozitorija](#3-struktura-repozitorija)
4. [Rendering, rute i build](#4-rendering-rute-i-build)
5. [Content model](#5-content-model)
6. [Dizajn tokeni](#6-dizajn-tokeni)
7. [WebGL / FX arhitektura](#7-webgl--fx-arhitektura)
8. [Animacije i interakcije](#8-animacije-i-interakcije)
9. [API specifikacija](#9-api-specifikacija)
10. [Email](#10-email)
11. [Kalkulator procjene](#11-kalkulator-procjene)
12. [SEO implementacija](#12-seo-implementacija)
13. [Sigurnost](#13-sigurnost)
14. [Performanse](#14-performanse)
15. [Treće strane i privatnost](#15-treće-strane-i-privatnost)
16. [Testiranje](#16-testiranje)
17. [CI/CD i okruženja](#17-cicd-i-okruženja)
18. [DNS i email zapisi](#18-dns-i-email-zapisi)
19. [Monitoring i operacije](#19-monitoring-i-operacije)
20. [ADR: zapisi arhitektonskih odluka](#20-adr-zapisi-arhitektonskih-odluka)

---

## 1. Pregled arhitekture

```
                         ┌──────────────────────────── Cloudflare ────────────────────────────┐
 Browser ── HTTPS ──►    │  DNS · TLS 1.3 · WAF · Bot Fight · Edge rate limit · CDN cache     │
                         │                                                                    │
                         │  Worker "lejliczijad"  (Workers + Static Assets)                   │
                         │   ├─ /*        → statični HTML/CSS/JS/slike iz dist/ (bez Workera) │
                         │   └─ /api/*    → Astro server endpoints (prerender = false)        │
                         │                   ├─ zod validacija                                │
                         │                   ├─ Turnstile siteverify ───────► challenges.cf   │
                         │                   ├─ Rate Limiting binding + KV (dnevni limit)     │
                         │                   ├─ R2 (privatni bucket: lead magnet PDF)         │
                         │                   └─ Resend API ─────────────────► email           │
                         └────────────────────────────────────────────────────────────────────┘
 Treće strane (samo na klik ili defer):  Cal.com embed · youtube-nocookie · Umami Cloud · CF Web Analytics
 Email sanduče: Hostinger (support@lejliczijad.com) · MX ostaje na Hostingeru
```

**Principi:**
1. **Static-first.** Svaka stranica je prerenderovan HTML. Server kod postoji samo za `/api/*`.
2. **Nema baze i nema sesija.** Zato nema SQL injectiona, session hijackinga ni "auth" površine napada.
3. **Progresivno poboljšanje.** Sadržaj radi bez JS-a. FX, animacije i islands su dodatak.
4. **Ne vjeruj klijentu.** Server validira sve i ponovo računa sve (npr. procjenu).
5. **Zero third-party by default.** Ništa treće strane se ne učitava bez korisnikove akcije, osim analitike bez kolačića.

---

## 2. Stack

> Verzije se **pinuju tačno** (`"astro": "x.y.z"`, bez `^`) na najnoviju stabilnu u trenutku scaffolda (P1.ENV.01) i bilježe se u ADR-001.

| Sloj | Tehnologija | Napomena |
|---|---|---|
| Runtime | Node.js LTS (`.nvmrc`), pnpm (`packageManager` polje) | Corepack |
| Framework | **Astro** (najnovija stabilna) | `output: 'static'` + endpointi s `prerender = false` |
| Adapter | `@astrojs/cloudflare` | Workers + Static Assets |
| Islands | **Svelte 5** (`@astrojs/svelte`) | Samo za: filter, kalkulator, forme, modal i interaktivni Lab. Ostalo je Astro + vanilla TS |
| Sadržaj | `@astrojs/mdx`, Content Layer (`src/content.config.ts`) s zod shemama | |
| 3D/FX | **three.js** (moduli: WebGLRenderer, BufferGeometry, ShaderMaterial, `GPUComputationRenderer` iz `three/addons`, `MeshSurfaceSampler`) | Lijeno učitavanje |
| GPU tier | `detect-gpu` | Lijeno |
| Animacije | **GSAP** (core, ScrollTrigger, SplitText, Flip) | GSAP je od 2025. besplatan, uključujući sve pluginove; licencu provjeriti pri implementaciji |
| Smooth scroll | **Lenis** | Samo desktop, bez reduced motion |
| Validacija | **zod** | Dijeljene sheme klijent/server u `src/server/schemas` |
| Email | **Resend** (REST preko `fetch`, bez SDK-a ako to smanjuje bundle) | |
| Anti-bot | **Cloudflare Turnstile** | managed mode |
| OG slike | `satori` + `@resvg/resvg-js` (build-time) | |
| Slike | `astro:assets` (sharp) | AVIF + WebP |
| Kod u blogu | Shiki (ugrađen u Astro) | Tema usklađena s tokenima |
| Sitemap | `@astrojs/sitemap` | |
| Video | `lite-youtube-embed` (ili vlastita komponenta, ≤ 2 KB) | `youtube-nocookie.com` |
| Testovi | Vitest, `@cloudflare/vitest-plugin` (novo ime za `@cloudflare/vitest-pool-workers`), Playwright, `@axe-core/playwright`, Lighthouse CI, `html-validate`, `linkinator` | |
| Kvalitet | ESLint (flat), Prettier, Stylelint, TypeScript strict, Husky, lint-staged, commitlint | |
| Sigurnost u CI-u | gitleaks, CodeQL, `pnpm audit`, OWASP ZAP (docker), nuclei | |
| Face pipeline | Blender (headless, Python) + Node skripta | Lokalno, ne u CI-u |
| Fontovi | **Clash Display** (naslovi), **Satoshi** (tekst), **JetBrains Mono** (labele i brojevi) | Fontshare (ITF Free Font License) + OFL; licence provjeriti i zapisati u `docs/licenses.md` |

**Zabranjeno bez ADR-a:** jQuery, Bootstrap, Tailwind, React (osim ako ADR ne kaže drugačije), bilo koji UI kit, CSS-in-JS runtime, Google Fonts CDN, Google Analytics, bilo koji tracking pixel.

---

## 3. Struktura repozitorija

```
lejliczijad-portfolio/
├─ AGENTS.md  CLAUDE.md  prd.md  tech.md  README.md  CHANGELOG.md
├─ astro.config.ts
├─ wrangler.jsonc
├─ package.json  pnpm-lock.yaml  tsconfig.json  .nvmrc  .editorconfig
├─ eslint.config.js  .prettierrc  .stylelintrc.json  commitlint.config.js  lint-staged.config.js
├─ .husky/ pre-commit  commit-msg
├─ lighthouserc.json  playwright.config.ts  vitest.config.ts
├─ .github/
│  ├─ workflows/ ci.yml  security.yml  deploy.yml  lighthouse.yml  zap.yml
│  ├─ PULL_REQUEST_TEMPLATE.md  ISSUE_TEMPLATE/  CODEOWNERS  dependabot.yml
├─ content/
│  └─ intake/                 # sirovi materijali od Zijada, NE ulaze u build
│     ├─ project-questionnaire.md  <projekat>-notes.md  short-projects.md
│     ├─ testimonials/  logos/  photo/  assets/<projekat>/
│     └─ _raw/                # .gitignore: sken, sirovi video, veliki fajlovi
├─ docs/
│  ├─ dns-backup.md  dns-plan.md  face-scan-guide.md  intro-video-script.md  licenses.md
│  ├─ seo/ keywords.md  competitors.md  content-calendar.md
│  ├─ security/ threat-model.md  pentest-report.md  secrets-rotation.md
│  └─ runbook.md  how-to-add-project.md  how-to-add-post.md
├─ scripts/
│  ├─ face/ prepare.py  sample.ts
│  ├─ og/ generate.ts
│  ├─ pdf/ resume.ts  guide.ts
│  └─ checks/ content-guard.ts  headings.ts  dist-leaks.ts  overflow-report.ts
├─ public/
│  ├─ _headers                # security i cache headeri
│  ├─ favicon.svg  favicon-32.png  apple-touch-icon.png  icon-192.png  icon-512.png
│  ├─ site.webmanifest
│  └─ .well-known/security.txt
├─ src/
│  ├─ assets/
│  │  ├─ fonts/               # woff2 (Clash/Satoshi originalni, bez subseta; ADR-013)
│  │  ├─ images/              # globalne slike
│  │  └─ fx/ face.bin  vortex-poster.avif
│  ├─ components/
│  │  ├─ ui/                  # Button, Link, Tag, Badge, Icon, Modal, Accordion …
│  │  ├─ layout/              # Header, MobileMenu, Footer, SEO, SkipLink, Breadcrumbs
│  │  ├─ sections/            # Hero, LogoMarquee, SelectedWork, ServicesGrid …
│  │  ├─ case-study/          # Summary, Feature, ArchitectureDiagram, Metric …
│  │  ├─ forms/               # ContactForm.svelte, Estimator/*.svelte, LeadForm.svelte, fields/*
│  │  └─ media/               # Picture, LiteYouTube, BeforeAfter, HoverVideo
│  ├─ content/
│  │  ├─ projects/<slug>/index.mdx + images/
│  │  ├─ posts/<slug>/index.mdx + images/
│  │  ├─ services/<slug>.mdx
│  │  ├─ lab/<slug>.mdx
│  │  ├─ testimonials/<id>.json
│  │  ├─ clients/<id>.json
│  │  └─ faq/<group>.json
│  ├─ content.config.ts
│  ├─ data/ site.ts  nav.ts  pricing.ts  resume.ts  legal.ts
│  ├─ fx/
│  │  ├─ index.ts             # javni API: initFx(), fx.setState(), fx.dispose()
│  │  ├─ core/ capabilities.ts  renderer.ts  loop.ts  quality.ts  state.ts  input.ts
│  │  ├─ vortex/ simulation.ts  particles.ts
│  │  ├─ face/ loader.ts  points.ts
│  │  ├─ transitions/ controller.ts
│  │  ├─ cursor/ cursor.ts  magnetic.ts
│  │  ├─ shaders/ *.glsl      # importovani kao string (vite ?raw)
│  │  └─ debug/ panel.ts
│  ├─ layouts/ BaseLayout.astro  CaseStudyLayout.astro  PostLayout.astro  LegalLayout.astro
│  ├─ lib/
│  │  ├─ seo/ meta.ts  schema.ts  og.ts
│  │  ├─ analytics.ts  motion.ts  lifecycle.ts  format.ts  dom.ts
│  ├─ pages/
│  │  ├─ index.astro  about.astro  process.astro  contact.astro  estimate.astro
│  │  ├─ resume.astro  faq.astro  privacy.astro  impressum.astro  terms.astro  404.astro
│  │  ├─ work/index.astro  work/[slug].astro
│  │  ├─ services/index.astro  services/[slug].astro
│  │  ├─ blog/index.astro  blog/[...page].astro  blog/[slug].astro
│  │  ├─ lab/index.astro  lab/[slug].astro
│  │  ├─ guide/web-app-cost.astro
│  │  ├─ rss.xml.ts  robots.txt.ts  llms.txt.ts  og/[...route].png.ts
│  │  ├─ _dev/ui.astro        # samo dev
│  │  └─ api/ contact.ts  estimate.ts  lead.ts  guide/download.ts  csp-report.ts  health.ts
│  ├─ server/
│  │  ├─ schemas/ contact.ts  estimate.ts  lead.ts
│  │  ├─ http.ts              # json(), error(), guards (method, content-type, origin, size)
│  │  ├─ turnstile.ts  ratelimit.ts  tokens.ts  email/ send.ts  templates/*.ts  escape.ts
│  │  └─ log.ts
│  ├─ styles/ tokens.css  reset.css  base.css  typography.css  utilities.css  prose.css
│  └─ env.d.ts
└─ tests/
   ├─ unit/  api/  e2e/  visual/  a11y/  fixtures/
```

**Pravila:**
- `src/server/**` se nikad ne importuje iz klijentskog koda (ESLint `no-restricted-imports`). Izuzetak su `schemas/*`, koje su dijeljene.
- `content/intake/**` nikad ne ulazi u `dist/` (provjera `scripts/checks/dist-leaks.ts`).
- Jedna komponenta = jedan fajl. Ime komponente je PascalCase, sve ostalo kebab-case ili camelCase prema tipu fajla.
- **Path alias:** jedan alias `@/*` → `./src/*`, definisan samo u `tsconfig.json` (`compilerOptions.paths`). Astro (i Vite ispod njega) ga čita odatle, pa se ne duplira u `astro.config.ts`. Primjeri: `@/components/ui/Button.astro`, `@/lib/seo/meta`, `@/server/http`, `@/fx`. Vitest ga dobija preko `getViteConfig()` iz `astro/config` za projekat `unit`, a projekat `api` (workerd, bez Astro pluginova) preko Vite opcije `resolve.tsconfigPaths` (P1.ENV.08).
- Prazni folderi iz ove strukture se drže kroz `.gitkeep` dok ne dobiju prve fajlove; tada se `.gitkeep` briše.

---

## 4. Rendering, rute i build

- `astro.config.ts`: `site: 'https://lejliczijad.com'`, `trailingSlash: 'never'`, `build.format: 'file'`, `output: 'static'`, `adapter: cloudflare()`, `prefetch: { prefetchAll: false, defaultStrategy: 'hover' }`.
- Svaka ruta osim `/api/*` je prerenderovana. API fajlovi imaju `export const prerender = false`.
- Workers static assets: `html_handling: "drop-trailing-slash"`, `not_found_handling: "404-page"`. Worker se poziva **samo** za `/api/*` (`run_worker_first: ["/api/*"]`, sintaksu provjeriti pri implementaciji).
- Redirecti su u `public/_redirects` (npr. `www` rješava Cloudflare Redirect Rule, a ne Worker).
- `PUBLIC_DEPLOY_ENV = production | preview | development`. Kad nije `production`: `<meta name="robots" content="noindex,nofollow">` na svim stranicama, `robots.txt` → `Disallow: /`, a analitika je isključena.
- Build koraci (`pnpm build`): `content-guard` (samo prod) → `astro check` → `astro build` → generisanje OG slika (integracija) → PDF resume/guide → `dist-leaks` provjera.

---

## 5. Content model

> Implementacija je u `src/content.config.ts`. Ovdje su obavezna polja; sve sheme su `.strict()`.

### 5.1 `projects`
```ts
{
  title: string;                    // "Avicena — Polyclinic Management System"
  slug: string;                     // kebab-case, nepromjenjiv nakon lansiranja
  client: { name: string; country: string; industry: string; logo?: reference('clients') };
  type: 'app' | 'website' | 'video';
  format: 'full' | 'short';
  featured: boolean;                // u "Selected work"
  order: number;
  year: number;
  duration?: string;                // "4 months"
  role: string;                     // "Solo full-stack developer"
  services: Array<'web-app-development'|'website-development'|'promo-videos'|'educational-videos'|'seo'|'ai-integration'>;
  stack: string[];                  // ["Laravel","Vue","PostgreSQL"]
  summary: string;                  // ≤ 160 znakova, koristi se i za meta description
  outcome: string;                  // jednorečenični rezultat
  metrics?: Array<{ label: string; value: string; approximate: boolean; source: string }>; // source je obavezan (interno, ne prikazuje se)
  liveUrl?: string (url);
  cover: image();  coverAlt: string;
  thumb: image();  thumbAlt: string;
  hoverVideo?: string;              // putanja do mp4/webm
  youtubeId?: string;               // walkthrough ili glavni video
  testimonial?: reference('testimonials');
  seo: { title: string (≤ 60); description: string (140–160); keywords: string[] };
  publishedAt: date; updatedAt?: date;
  draft: boolean;                   // draft se ne builda u produkciji
}
```

### 5.2 Ostale kolekcije
- **testimonials:** `{ id, quote (≤ 400), author, role, company, photo?: image, linkedin?: url, projectRef?, videoYoutubeId?, rating?: 1..5, source: 'direct'|'clutch'|'google', date, consent: true }`. Build pada ako je `consent !== true`.
- **clients:** `{ id, name, logo: image | svg, url?, consent: true }`
- **services:** `{ slug, title, h1, summary, deliverables[], audience[], process[], tech[], fromPrice?: number, relatedProjects: reference('projects')[], faq: {q,a}[], seo }`
- **posts:** `{ title, slug, description, publishedAt, updatedAt?, tags[], cover, coverAlt, draft, seo, relatedProjects? }`
- **faq:** `{ group, items: {q, a, id}[] }`
- **lab:** `{ slug, title, description, tech[], component: string, cover, publishedAt }`

### 5.3 `src/data/site.ts`
```ts
export const site = {
  name: 'Zijad Lejlić',
  url: 'https://lejliczijad.com',
  email: 'support@lejliczijad.com',
  jobTitle: 'Full-Stack Developer',
  timezone: 'Europe/Sarajevo',
  availability: { status: 'available' | 'limited' | 'booked', label: string, from?: 'YYYY-MM' },
  cal: { intro: 'https://cal.com/<user>/intro-15', consultation: 'https://cal.com/<user>/consultation-45' },
  social: { linkedin, github, youtube, clutch, google },
  introVideoYoutubeId?: string,   // ako nedostaje, "Meet me" se ne prikazuje
  facePlaceholder: boolean,       // true dok ne stigne sken
} as const;
```

---

## 6. Dizajn tokeni

> Vrijednosti su početne. P1.DS.01 (mockupi) može ih korigovati, a konačne se upisuju ovdje.

### 6.1 Boje
| Token | Vrijednost | Upotreba | Kontrast na `--color-bg` |
|---|---|---|---|
| `--color-bg` | `#050507` | Pozadina | – |
| `--color-surface-1` | `#0B0B0F` | Kartice | – |
| `--color-surface-2` | `#13131A` | Hover, modal | – |
| `--color-border` | `rgb(255 255 255 / 8%)` | Linije (dekorativno) | 1,16:1 |
| `--color-border-strong` | `rgb(255 255 255 / 16%)` | Jače linije (dekorativno; nije dovoljno kao jedina granica inputa) | 1,48:1 |
| `--color-text` | `#F4F4F6` | Primarni tekst | 18,54:1 |
| `--color-text-muted` | `#A1A1AA` | Sekundarni tekst | 7,95:1 |
| `--color-text-subtle` | `#7C7C86` | Meta, labele (ne na `surface-2`: 4,48:1; ne iznad canvasa) | 4,93:1 |
| `--color-accent` | `#4D7CFF` | Linkovi, fokus, akcenti | 5,47:1 |
| `--color-accent-hover` | `#6B93FF` | Hover | 7,02:1 |
| `--color-accent-pressed` | `#4570F5` | Active (P1.DS.02, Zijadova odluka 2026-11-26; `#3A66E6` je imao 4,10:1 s tamnim tekstom) | 4,74:1 |
| `--color-on-accent` | `#050507` | **Tekst na akcentnom dugmetu** | 5,47:1 na accent · 7,02:1 na hover · 4,74:1 na pressed |
| `--color-success` | `#22C55E` | Tačka dostupnosti | 8,94:1 |
| `--color-danger` | `#F87171` | Greške u formi | 7,36:1 |
| `--color-focus` | `#4D7CFF` | Fokus prsten (2 px + 2 px offset) | 5,47:1 |

> **Važno:** bijeli tekst na `#4D7CFF` ima kontrast samo 3,72:1 i **ne prolazi AA** za normalan tekst. Primarno dugme zato koristi tamni tekst (`--color-on-accent`).
> Kontrast se mjeri i na **najsvjetlijem dijelu vortexa** iza teksta (P1.FX.12).
> Konačne vrijednosti (P1.DS.02) su u `src/styles/tokens.css`. Svi parovi na sve tri površine i pravila upotrebe su u [docs/design/contrast.md](docs/design/contrast.md); test `tests/unit/styles/tokens-contrast.test.ts` ruši `pnpm check` ako dozvoljeni par padne ispod praga.

### 6.2 Tipografija
| Token | Font | Veličina (clamp) | Line-height | Tracking |
|---|---|---|---|---|
| `--text-display` | Clash Display 600 | `clamp(3rem, 1.2rem + 7.5vw, 10rem)` | 0.92 | -0.03em |
| `--text-h1` | Clash Display 600 | `clamp(2.5rem, 1.4rem + 4.6vw, 6rem)` | 0.98 | -0.025em |
| `--text-h2` | Clash Display 500 | `clamp(2rem, 1.3rem + 2.8vw, 4rem)` | 1.05 | -0.02em |
| `--text-h3` | Clash Display 500 | `clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem)` | 1.15 | -0.01em |
| `--text-lead` | Satoshi 400 | `clamp(1.125rem, 1rem + 0.5vw, 1.5rem)` | 1.5 | 0 |
| `--text-body` | Satoshi 400 | `clamp(1rem, 0.96rem + 0.2vw, 1.125rem)` | 1.65 | 0 |
| `--text-small` | Satoshi 500 | `0.875rem` | 1.5 | 0 |
| `--text-mono` | JetBrains Mono 500 | `0.75rem`–`0.875rem` | 1.4 | 0.08em, uppercase |

- Minimalna veličina tekstnog sadržaja je 16 px. Dužina linije 60–75 znakova (`max-width: 68ch` za prozu).
- Clash Display i Satoshi se self-hostuju kao **originalni WOFF2 fajlovi, bez subsettinga** (ITF FFL v2.0 zabranjuje subsetting; [ADR-013](docs/adr/013-fonts-no-subset.md)). JetBrains Mono (OFL) se smije subsetovati na `latin` + `latin-ext`. Svi fontovi moraju imati č, ć, š, ž, đ. Preload: Clash Display 600 + Satoshi 400.
- Fallback stack s `size-adjust`/`ascent-override` da CLS pri zamjeni fonta bude 0.

### 6.3 Prostor, oblici, slojevi
- Spacing skala (4 px baza): `--space-1` 4 · 2: 8 · 3: 12 · 4: 16 · 5: 24 · 6: 32 · 7: 48 · 8: 64 · 9: 96 · 10: 128 · 11: 192
- Sekcije: `padding-block: clamp(4rem, 2rem + 8vw, 10rem)`. Kontejner: `max-width: 1440px`, gutter `clamp(1rem, 0.5rem + 2.5vw, 3rem)`.
- Radius: `--radius-sm` 6 px · `--radius-md` 12 px · `--radius-lg` 20 px · `--radius-pill` 999 px
- Z-index: `fx -1` · `base 0` · `header 50` · `menu 60` · `cursor 70` · `modal 80` · `toast 90` · `skip-link 100`

### 6.4 Breakpointi (u `em` u media queryjima)
`xs 360` · `sm 480` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536` · `3xl 1920`. Mobile-first. Container queries za komponente gdje ima smisla (kartice).

### 6.5 Motion
| Token | Vrijednost |
|---|---|
| `--dur-instant` | 100 ms |
| `--dur-fast` | 200 ms |
| `--dur-base` | 400 ms |
| `--dur-slow` | 700 ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--ease-spring` | GSAP `elastic.out(1, 0.5)` samo za magnetni povratak |

`@media (prefers-reduced-motion: reduce)`: sve tranzicije ≤ 0,01 ms osim opacity (≤ 150 ms), bez parallaxa, bez marqueeja, bez smooth scrolla, FX je `static`.

---

## 7. WebGL / FX arhitektura

### 7.1 Životni ciklus
1. HTML se renderuje s `<div class="fx-poster">` (AVIF + CSS gradijent). To je odmah vidljivo i ne utiče na LCP.
2. Nakon `load` i `requestIdleCallback` (timeout 2 s): `import('@/fx')` → `capabilities()` → `quality`.
3. Ako je `quality === 'static'`, ostaje poster i FX se ne učitava.
4. Inače se pravi `renderer` na canvasu `#fx` (`transition:persist`), pokreće simulacija, a poster se ukloni cross-fadeom (400 ms).
5. Lice (`face.bin`) se učitava samo na Home, nakon što je vortex aktivan.
6. Navigacija: `astro:before-preparation` → `fx.setState('transition-out')`; `astro:after-swap` → `fx.setState('transition-in')` → stanje stranice (`data-fx-state` na `<main>`).
7. `visibilitychange` (hidden) zaustavlja petlju; `webglcontextlost` → poster, a `restored` → ponovna inicijalizacija resursa.

### 7.2 Nivoi kvaliteta
| Tier | Uslov (okvirno) | Čestice vortexa | Tačke lica | DPR cap | Post efekti |
|---|---|---|---|---|---|
| `high` | detect-gpu tier ≥ 3, desktop | 512×256 = 131.072 | 35.000 | 2.0 | soft glow (opciono) |
| `medium` | tier 2 ili jak mobilni | 256×256 = 65.536 | 20.000 | 1.5 | ne |
| `low` | tier 1, `deviceMemory ≤ 4` | 128×128 = 16.384 | 10.000 | 1.0 | ne |
| `static` | nema WebGL2/float tekstura, reduced motion, `saveData`, tier 0 | 0 | 0 | – | – |

**Adaptacija:** FPS se mjeri kao EMA u prozoru od 2 s. Ako je < 50 (desktop) ili < 28 (mobilni), tier pada za jedan nivo. Vraćanje je dozvoljeno najviše jednom, i to nakon 10 s stabilnih > 58 FPS. Override za testiranje: `?fx=high|medium|low|static|off|debug`.

### 7.3 Vortex simulacija
- `GPUComputationRenderer`: dvije teksture (pozicija `RGBA32F`, brzina `RGBA32F`), ping-pong.
- Sila = vrtložno polje oko Y ose (tangencijalna komponenta ∝ 1/r, ograničena) + **curl noise** (3D simplex, 2–3 oktave) + slabo privlačenje prema torusu radijusa `R` + polje miša (odbijanje, radijus `uMouseRadius`) + modulacija skrolom (`uScrollVel` → ugaona brzina).
- "Životni vijek" čestice je u `w` kanalu. Kad istekne, čestica se respawnuje na rubu (izbjegava nakupljanje).
- Render: `THREE.Points`, `gl_PointSize` ∝ 1/dubina × `uSize` × DPR, mekani krug u fragment shaderu, additive blending, `depthWrite: false`. Boja: bijela ili siva po šumu; ~3 % čestica akcentne boje (hash po indeksu).
- Uniformi koje kontroliše stanje: `uSpeed`, `uSwirl`, `uNoiseAmp`, `uDim`, `uAttract` (za prelaz), `uMouse`, `uMouseStrength`, `uScrollVel`, `uTime`.

### 7.4 Lice
- **Pipeline:** `content/intake/_raw/scan.glb` → `scripts/face/prepare.py` (Blender: ukloni podlogu i šum, odsijeci ispod ramena, centriraj na nos, skaliraj visinu glave na 1.0, decimiraj na ~200k trokuta) → `face.clean.glb` → `scripts/face/sample.ts` → `src/assets/fx/face.bin`.
- **Sampling:** `MeshSurfaceSampler` s težinom = `0.6 * luminanca_teksture⁻¹` (tamniji detalji poput obrva i očiju dobijaju više tačaka) + `0.4 * zakrivljenost`. Odbaciti tačke na stražnjoj strani ako kamera nikad ne ide iza (ušteda ~35 %).
- **Format `face.bin`:** header (magic `FACE`, verzija, broj tačaka po tieru) + Int16 `x, y, z` (kvantizovano na [-1, 1]) + Uint8 luminanca. Tierovi su prefiksi niza (prvih N tačaka je dobar uzorak), pa jedan fajl služi za sve tierove.
- **Animacija:** vertex shader miješa `aStart` (pozicija u vortexu) i `aTarget` (lice) preko `uForm` (0→1, intro) i `uDissolve` (skrol 0→1). Hover: screen-space udaljenost od `uMouse` → odbijanje uz ograničenje. Rotacija: matrica iz yaw/pitch opruge (k = 120, c = 18).
- **Placeholder:** dok je `site.facePlaceholder === true`, koristi se proceduralna glava (deformisana sfera + šum) ili CC0 model (licenca u `docs/licenses.md`).

### 7.5 Kursor
- Dva DOM elementa (`.cursor-dot`, `.cursor-ring`) s `position: fixed` i `transform: translate3d` u rAF petlji. Lerp 0,2 za ring i 1,0 za dot.
- Aktivira se samo ako `matchMedia('(hover: hover) and (pointer: fine)')` vrati true i nema reduced motion.
- Stanja preko `data-cursor` na elementima (event delegation, `pointerover`/`pointerout`). Labela je samo vizuelna (`aria-hidden`); pravi tekst linka ostaje.
- Magnetic: `[data-magnetic]` → pomak `(pointer - center) * 0.3`, max 12 px, povratak preko GSAP `elastic.out`. Pomak ide na unutrašnji wrapper, nikad na element koji utiče na layout.
- Sistemski kursor se ne skriva (`cursor: none` se ne koristi globalno). Moguće je samo na `[data-cursor]` elementima, a nikad na tekstu, inputima ni `[contenteditable]`.

### 7.6 Fallback matrica
| Situacija | Ponašanje |
|---|---|
| Bez JS-a | Poster, sav sadržaj vidljiv, nema kursora ni prelaza |
| Reduced motion | `static`, bez prelaza, bez kursora, bez Lenisa, reveal animacije isključene |
| WebGL nije dostupan / greška | Poster, ostatak radi; greška se loguje u konzolu samo u devu |
| Gubitak konteksta | Poster se vrati; pokušaj obnove 1× |
| `?fx=off` (testovi) | Kao `static`, deterministički za screenshotove |

---

## 8. Animacije i interakcije

- **Biblioteke:** GSAP core + ScrollTrigger + SplitText + Flip, Lenis. Sve se importuje lijeno po stranici gdje treba.
- **Lifecycle:** svaka skripta koristi `onPage(init)` iz `src/lib/lifecycle.ts`. Taj helper zove `init` na `astro:page-load` i automatski poziva vraćeni cleanup na `astro:before-swap` (ScrollTrigger `kill`, `gsap.context().revert()`, uklanjanje listenera).
- **Reveal:** početno stanje se postavlja **u JS-u** (`gsap.set`), nikad u CSS-u. Bez JS-a je sve vidljivo. `SplitText` se poziva tek nakon `document.fonts.ready`, a linije se ponovo dijele na resize (debounce 200 ms).
- **Lenis:** `lerp 0.1`, `smoothWheel: true`, bez smooth touch. Integracija s ScrollTriggerom preko `lenis.on('scroll', ScrollTrigger.update)` i GSAP tickera. Na navigaciji ide `lenis.scrollTo(0, { immediate: true })`, osim kod back/forward (restauracija pozicije).
- **Marquee:** čisti CSS (`@keyframes translateX`), duplirani set ima `aria-hidden="true"`, a `animation-play-state: paused` je na `:hover` i `:focus-within`.
- **Filter na Work:** GSAP Flip, najviše 500 ms, `aria-live="polite"` najavljuje "Showing 4 projects".
- **Hover video:** `<video muted playsinline preload="none">`. `play()` se poziva samo na `pointerenter` (hover: hover), a `pause()` i reset na `pointerleave`.

---

## 9. API specifikacija

### 9.1 Zajedničko za sve `POST` endpointe
Redoslijed zaštite (`src/server/http.ts`):
1. Metoda mora biti `POST`, inače **405**. Na `OPTIONS` ide **204** bez CORS headera (same-origin only).
2. `Content-Type: application/json`, inače **415**.
3. `Origin` mora biti `https://lejliczijad.com` (ili preview origin u preview okruženju), inače **403**.
4. `Content-Length` ≤ 16 KB (i stvarno pročitano tijelo ≤ 16 KB, streaming limit), inače **413**.
5. `JSON.parse` u try/catch; greška daje **400** `invalid_json`. Odbijaju se ključevi `__proto__`, `constructor` i `prototype`.
6. Zod `.strict()` validacija, greška daje **422** sa `fields` (poruke po polju, bez eha ulaza).
7. Honeypot (`website` polje mora biti prazno) i `elapsedMs ≥ 3000`. Ako nije ispunjeno, vraća se **200** s lažnim uspjehom (tihi drop) i bilježi se u log.
8. Rate limit: binding `RL_FORMS` 5 zahtjeva/60 s po ključu `sha256(ip + endpoint)` → **429** + `Retry-After`. Dnevni limit 20/dan po IP-u ide preko KV-a (`RL_DAILY`, TTL 24 h).
9. Turnstile `siteverify` (POST `secret`, `response`, `remoteip`, `idempotency_key`). Provjerava se `success`, `hostname === lejliczijad.com` i `action` po endpointu. Greška daje **400** `captcha_failed`.
10. Poslovna logika → Resend. Na grešku Resenda: 1 retry nakon 500 ms, zatim **502** `delivery_failed`.

**IP adresa** se uzima samo iz `request.headers.get('CF-Connecting-IP')`. `X-Forwarded-For` se ignoriše (sprječava spoofing).
**Odgovori:**
```json
{ "ok": true }
{ "ok": false, "error": { "code": "validation_failed", "message": "Please check the highlighted fields.", "fields": { "email": "Enter a valid email address." } } }
```
Kodovi: `invalid_json`, `validation_failed`, `captcha_failed`, `rate_limited`, `delivery_failed`, `forbidden`, `unsupported_media_type`, `payload_too_large`, `method_not_allowed`, `internal_error`. Poruke ne otkrivaju interne detalje.
**Headeri odgovora:** `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`.

### 9.2 `POST /api/contact`
```ts
ContactInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  company: z.string().trim().max(120).optional(),
  projectType: z.enum(['web-app','website','promo-video','educational-video','seo','ai','other']),
  budget: z.enum(['<5k','5-10k','10-25k','25-50k','50k+','not-sure']),
  timeline: z.enum(['asap','1-3-months','3-6-months','flexible']).optional(),
  message: z.string().trim().min(20).max(5000),
  consent: z.literal(true),
  website: z.string().max(0),          // honeypot
  elapsedMs: z.number().int().min(0).max(86_400_000),
  turnstileToken: z.string().min(1).max(2048),
}).strict()
```
Efekti: email Zijadu (`to: CONTACT_TO`, `reply_to: email`) + auto-reply klijentu. Turnstile `action: 'contact'`.

### 9.3 `POST /api/estimate`
Ulaz: `EstimateInput` (tip, obim, funkcionalnosti, rok; sve enumi i ograničeni brojevi) + `name`, `email`, `consent`, `website`, `elapsedMs`, `turnstileToken`.
Server **ponovo računa** `estimate(input)` istom funkcijom iz `src/data/pricing.ts` i šalje je emailom. Klijentski izračun se ignoriše. Turnstile `action: 'estimate'`.

### 9.4 `POST /api/lead`
Ulaz: `name`, `email`, `consent`, `website`, `elapsedMs`, `turnstileToken`. Izlaz: email s linkom `https://lejliczijad.com/api/guide/download?token=…` + obavijest Zijadu. Turnstile `action: 'lead'`.

### 9.5 `GET /api/guide/download?token=`
- Token: `base64url(JSON{ v:1, e: sha256(email)[0..16], exp: unix }) + "." + base64url(HMAC-SHA256(LEAD_TOKEN_SECRET, payload))`.
- Provjera: format, potpis (`crypto.subtle.verify` je constant-time), `exp > now`, a `exp - now` ≤ 7 dana.
- Uspjeh: stream iz R2 (`GUIDES` bucket, ključ hardkodiran, **nikad iz parametra**), `Content-Disposition: attachment; filename="web-app-cost-guide-2027.pdf"`, `Cache-Control: private, no-store`.
- Greška: redirect 303 na `/guide/web-app-cost?expired=1`.
- Rate limit: 10/60 s po IP-u.

### 9.6 `POST /api/csp-report` i `GET /api/health`
- `csp-report`: prihvata `application/csp-report` i `application/reports+json`, tijelo ≤ 8 KB, rate limit 30/60 s, samo `console.log` (Workers Logs) bez IP-a. Odgovor 204.
- `health`: `{ ok: true, version: <git sha> }`, `Cache-Control: no-store`. Ne otkriva ništa drugo.

### 9.7 Env varijable i bindingi
| Ime | Tip | Gdje | Napomena |
|---|---|---|---|
| `PUBLIC_SITE_URL` | var | build | `https://lejliczijad.com` |
| `PUBLIC_DEPLOY_ENV` | var | build | `production` / `preview` / `development` |
| `PUBLIC_TURNSTILE_SITE_KEY` | var | build | javni ključ |
| `PUBLIC_UMAMI_WEBSITE_ID` | var | build | javni ID |
| `TURNSTILE_SECRET` | **secret** | Worker | `wrangler secret put` |
| `RESEND_API_KEY` | **secret** | Worker | ograničen na "sending access" za domenu |
| `LEAD_TOKEN_SECRET` | **secret** | Worker | 32+ nasumičnih bajta |
| `IP_HASH_SALT` | **secret** | Worker | za logove |
| `CONTACT_TO` | var | Worker | `support@lejliczijad.com` |
| `MAIL_FROM` | var | Worker | `Zijad Lejlić <support@lejliczijad.com>` |
| `RL_FORMS`, `RL_DOWNLOAD` | binding | Worker | Rate Limiting |
| `RL_DAILY` | KV | Worker | dnevni brojač |
| `GUIDES` | R2 | Worker | privatni bucket |

Lokalno: `.env` (build, `PUBLIC_*`) i `.dev.vars` (Worker runtime), oba u gitignoreu; šabloni su `.env.example` i `.dev.vars.example`. Turnstile test ključevi (provjereno 2026-11-25 u [Cloudflare docs](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)): sitekey `1x00000000000000000000AA` / secret `1x0000000000000000000000000000000AA` uvijek prolaze, `2x00000000000000000000AB` / `2x0000000000000000000000000000000AA` uvijek padaju.

**Shema (P1.ENV.07):** `env.schema` u `astro.config.ts` (`astro:env`). `PUBLIC_SITE_URL` i `PUBLIC_DEPLOY_ENV` su obavezni; build pada s `EnvInvalidVariables` porukom ako fale ili nisu ispravni. Validacija se okida kad se `astro:env/client` prvi put importuje, zato ga `src/lib/deploy-env.ts` importuje i koristi u svakoj stranici. `PUBLIC_TURNSTILE_SITE_KEY` i `PUBLIC_UMAMI_WEBSITE_ID` su opcioni dok ih P1.CONT.04 i P1.ANL.02 ne učine obaveznim. Worker varijable (`TURNSTILE_SECRET`, `RESEND_API_KEY`, `LEAD_TOKEN_SECRET`, `IP_HASH_SALT`, `CONTACT_TO`, `MAIL_FROM`) imaju `access: 'secret'`, jer se samo taj nivo čita iz runtime env-a umjesto da se ugradi u bundle; validiraju se pri prvom pristupu, ne pri buildu.

---

## 10. Email

- **Slanje:** Resend, `from: "Zijad Lejlić <support@lejliczijad.com>"`. DKIM `resend._domainkey`, return-path na `send.lejliczijad.com` (zapise daje Resend, unose se u Cloudflare DNS).
- **Prijem:** Hostinger sanduče `support@`. MX zapisi ostaju na Hostingeru.
- **Šabloni** (`src/server/email/templates/*.ts`): čisti TS koji vraća `{ subject, html, text }`. **Svaka** dinamička vrijednost ide kroz `escapeHtml()`; URL-ovi se ne grade iz korisničkog unosa; `text` verzija je obavezna.
- **Subject** ne sadrži korisnički unos osim imena, koje je sanitizovano: uklanjaju se `\r`, `\n` i kontrolni znakovi, max 60 znakova. Ovo sprječava header injection.
- **Tipovi:** `contact-notify` (Zijadu), `contact-autoreply`, `estimate-client`, `estimate-notify`, `lead-guide`, `lead-notify`.
- **Dizajn:** tamni header s wordmarkom, svijetlo tijelo (bolja čitljivost u email klijentima), max-width 600 px, inline CSS, bez spoljnih fontova i trackinga.
- **Deliverability:** SPF, DKIM i DMARC usklađeni; test mail-tester.com ≥ 9/10 prije lansiranja.

---

## 11. Kalkulator procjene

> Status: **DRAFT, čeka Zijadovo odobrenje (P2.EST.01)**. Satnica, tabela sati, dodaci, množioci i pragovi su poslovni podaci i **nisu u ovom javnom repou** (P1.ENV.21). Nalaze se u privatnom `content/intake/pricing.md` (repo `lejliczijad-private`). Satnica se nikad ne prikazuje.

### 11.1 Ulazi
- **Tip projekta** (8 tipova iz [prd.md §7.9](prd.md#79-estimate-estimate-kalkulator)): osnovica u satima, `base_low` – `base_high`.
- **Obim:** dodatne stranice preko uključenih, broj videa (popust za seriju), dodatne korisničke uloge.
- **Funkcionalnosti:** fiksni dodatak u satima (`feature_low` – `feature_high`) ili procenat osnovice (`pct_features`).
- **Rok:** Standard ili Fast-track (množilac cijene i trajanja).

### 11.2 Formula
```
H_low  = base_low  + scope_low  + Σ feature_low  + pct_features × base_low
H_high = base_high + scope_high + Σ feature_high + pct_features × base_high
mult   = fastTrack ? FAST_TRACK_PRICE_MULT : 1.0
price_low  = roundDown(H_low  × RATE_LOW  × mult, PRICE_STEP)
price_high = roundUp(H_high × RATE_HIGH × mult, PRICE_STEP)
price_low  = max(price_low, MIN_PRICE)
weeks_low  = ceil(H_low  / HOURS_PER_WEEK_MAX) × (fastTrack ? FAST_TRACK_WEEKS_MULT : 1)
weeks_high = ceil(H_high / HOURS_PER_WEEK_MIN) × (fastTrack ? FAST_TRACK_WEEKS_MULT : 1)
```
- Prikaz: `€4,500 – €7,000` (US format brojeva), `4–7 weeks`.
- Ako je `price_high > SCOPE_THRESHOLD` ili je tip "Complex web app": umjesto raspona se prikazuje "From €… — let's scope it together" + CTA za konsultaciju.
- Funkcija je čista i deterministička, s 100 % pokrivenosti testovima: granice, kombinacije, zaokruživanje i fast-track.

### 11.3 Gdje žive brojevi (odluka prije P2.EST.02)
Ako tabela sati i satnica uđu u klijentski JS bundle, satnicu može pročitati svako u DevToolsu, a i u javnom repou bi bila u `src/data/pricing.ts`. Prije P2.EST.02 se bira pristup (prd.md, pitanje Q8).

---

## 12. SEO implementacija

### 12.1 Meta
- **Title:** `{Page title} — Zijad Lejlić` (≤ 60 znakova). Home: `Zijad Lejlić — Full-Stack Developer for Web Apps & Websites`. Case study: `{Project}: {Outcome short} — Case Study`.
- **Description:** 140–160 znakova, jedinstvena (CI provjera duplikata).
- **Canonical:** apsolutni URL bez trailing slasha i bez query stringa (osim gdje query mijenja sadržaj; filter na Work ima canonical `/work`).
- **OG/Twitter:** `og:type` (`website` / `article` / `profile`), `og:image` 1200×630 (generisan), `og:image:alt`, `twitter:card=summary_large_image`.
- **Robots:** produkcija `index,follow,max-image-preview:large`; 404, `/_dev`, `?expired=1` i `/api` dobijaju `noindex`.

### 12.2 Strukturirani podaci (JSON-LD, jedan `@graph` po stranici)
| Stranica | Tipovi |
|---|---|
| Svaka | `WebSite` (`@id: /#website`), `Person` (`@id: /#person`), `BreadcrumbList` |
| Home | + `ProfessionalService` (`@id: /#service`; `areaServed`: DE, AT, CH, GB, IE, US, CA, SE, NO, DK, FI, NL, BE, LU; `founder → #person`) |
| About | + `ProfilePage` (`mainEntity → #person`), `VideoObject` (intro) |
| Case study | + `CreativeWork` ili `SoftwareApplication` (`creator → #person`), `VideoObject`, `Review` (ako ima testimonijal, vezan za CreativeWork, ne za samog sebe) |
| Usluga | + `Service` (`provider → #person`), `FAQPage` |
| Blog post | + `BlogPosting` (`author → #person`, `datePublished`, `dateModified`, `image`) |
| FAQ | + `FAQPage` |

> Napomena: Google ne prikazuje zvjezdice za "self-serving" recenzije (recenzije o sebi na vlastitom sajtu). `Review` markup ostaje semantički ispravan, ali se ne obećavaju zvjezdice u rezultatima pretrage.

### 12.3 Ostalo
- Sitemap s `lastmod` iz `git log -1 --format=%cI <fajl>`; `changefreq` i `priority` se ne koriste.
- RSS (`/rss.xml`) s punim sadržajem; `<link rel="alternate" type="application/rss+xml">` na svim stranicama.
- `llms.txt`: kratak opis, glavne stranice, usluge i kontakt.
- IndexNow: ključ u `public/<key>.txt` i ping nakon produkcijskog deploya za izmijenjene URL-ove (GitHub Action).
- Hreflang: komponenta je spremna. Dok postoji samo EN, emituje se `en` + `x-default` (oba na isti URL).
- Slike: opisni `alt` (bez "image of"), imena fajlova kebab-case i opisna, `width`/`height` uvijek postavljeni.
- Interni linkovi: svaki case study linkuje na 1–2 usluge i obrnuto; svaki članak na ≥ 1 case study i ≥ 1 uslugu; nema siročadi stranica (CI skripta).
- Headingi: tačno jedan `h1`, bez preskakanja nivoa (CI skripta).

---

## 13. Sigurnost

### 13.1 Model prijetnji (sažetak; detalji u `docs/security/threat-model.md`)
| Prijetnja | Vektor | Kontrola |
|---|---|---|
| Spam i zloupotreba formi | Botovi, skripte | Turnstile, rate limit (edge + Worker), honeypot, minimalno vrijeme, WAF |
| XSS | Korisnički unos prikazan u emailu; MDX sadržaj | Escape u šablonima, nema `set:html` / `{@html}` s nepouzdanim podacima, strogi CSP, Trusted Types (gdje podržano) |
| Email header injection | `\r\n` u imenu ili emailu | Zod email, uklanjanje CRLF-a, korisnički unos se ne stavlja u headere osim validiranog `reply_to` |
| CSRF | Lažna forma s druge domene | Nema kolačića ni sesija; Origin provjera; Turnstile hostname provjera |
| SSRF / path traversal | Download endpoint | Ključ R2 objekta je hardkodiran; token je potpisan; nema korisničkih URL-ova |
| Token forgery i replay | Lead download link | HMAC-SHA256, istek 7 dana, constant-time verify |
| Supply chain | npm paketi | Pinovane verzije, lockfile, `pnpm audit`, Dependabot, minimalan broj zavisnosti, `pnpm` `onlyBuiltDependencies` |
| Curenje tajni | Commit `.env` | gitignore, gitleaks u CI-u i pre-commitu, tajne samo u Wrangleru i GitHub Secrets |
| Clickjacking | Iframe | `frame-ancestors 'none'` |
| Curenje informacija | Source mape, `/_dev`, stack trace | Bez source mapa u produkciji, `/_dev` se ne builda, generičke greške |
| DoS | Flood na `/api` | Cloudflare (DDoS, WAF), rate limit, limit veličine tijela, statični sajt bez Workera |
| Preuzimanje naloga | GitHub, Cloudflare, Resend, Hostinger | 2FA svuda, API tokeni s minimalnim pravima, rotacija |
| Email spoofing | Lažni emailovi s domene | SPF, DKIM, DMARC → `reject` |
| DNS hijack | Registrar | DNSSEC, 2FA na Hostingeru, registrar lock |

### 13.2 HTTP headeri (`public/_headers` za statiku; isti headeri iz Workera za `/api`)
```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: <vidi 13.3>
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=(), accelerometer=(self), gyroscope=(self)
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-site
  X-DNS-Prefetch-Control: off
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```
> HSTS `preload` se dodaje tek u P3.SEC.04. Do tada se koristi `max-age=31536000; includeSubDomains`.

### 13.3 Content-Security-Policy (polazna; tačne hostove provjeriti pri implementaciji)
```
default-src 'self';
script-src 'self' 'sha256-<build hashevi>' https://challenges.cloudflare.com https://cloud.umami.is https://static.cloudflareinsights.com https://app.cal.com;
style-src 'self' 'sha256-<build hashevi>';
img-src 'self' data: blob: https://i.ytimg.com;
font-src 'self';
connect-src 'self' https://cloud.umami.is https://api-gateway.umami.dev https://cloudflareinsights.com;
frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://app.cal.com https://cal.com;
media-src 'self';
worker-src 'self' blob:;
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none';
manifest-src 'self';
upgrade-insecure-requests;
report-to csp-endpoint;
```
- Inline skripte i stilovi koje generiše Astro dobijaju hasheve pri buildu (Astro CSP podrška ako je stabilna u izabranoj verziji, inače `scripts/csp-hash.ts` koji upisuje hasheve u `_headers`).
- **Ne koristi se `'unsafe-inline'` za `script-src`.** Za `style-src` je privremeno dozvoljen samo ako GSAP inline `style` atributi to traže. Atributi `style=""` koje postavlja JS nisu pod `style-src` hash ograničenjem, ali se provjeravaju; svako odstupanje mora imati ADR.
- Trusted Types: `require-trusted-types-for 'script'` se uvodi samo ako nijedna biblioteka ne puca (test u P3.SEC.02).

### 13.4 Pravila za kod (obavezno)
- Nikad `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` ni `set:html` s podacima koji nisu statični sadržaj iz repoa.
- Svi spoljni linkovi: `rel="noopener noreferrer"` i `target="_blank"` samo uz vizuelnu oznaku.
- Nikad se ne loguju email, poruka, IP ni token. IP se loguje samo kao `sha256(ip + IP_HASH_SALT + YYYY-MM-DD)`, a i to samo za rate-limit događaje.
- Greške prema klijentu su generičke; detalji idu u Workers Logs bez PII.
- Nova treća strana = ažuriranje CSP-a + Privacy Policyja + §15 + ADR.

### 13.5 Plan pen testa (Faza 3)
1. **Automatski:** ZAP baseline (cijeli sajt), ZAP API scan s OpenAPI opisom `/api/*` na preview okruženju (Turnstile test ključ koji uvijek prolazi), nuclei (`-severity low,medium,high,critical`), testssl.sh, securityheaders, Observatory.
2. **Ručno** (checklista u `docs/security/pentest-report.md`):
   - XSS payloadi (polyglot, SVG, `javascript:`, unicode escapes) u svakom polju → provjera emaila u Gmailu i Outlooku, kao i svih odgovora API-ja.
   - CRLF u imenu i emailu; email s više `@`; IDN i homoglyph email; duga polja (granice + 1).
   - JSON: duplirani ključevi, `__proto__`, duboko ugniježđeni objekti, nizovi umjesto stringova, ogromni brojevi, `null`.
   - Content-Type zaobilaženje (`text/plain`, `multipart`), chunked tijelo preko limita.
   - Origin: odsutan, `null`, sličan domen (`lejliczijad.com.evil.com`).
   - Rate limit: rotacija `X-Forwarded-For` i `CF-Connecting-IP` headera iz klijenta (mora se ignorisati).
   - Turnstile: ponovna upotreba tokena, token s druge domene, prazan token.
   - Download token: izmijenjen payload, izmijenjen potpis, istekao, budući `exp` > 7 dana, `../` u parametrima.
   - Enumeracija: `/.env`, `/.git/`, `/_dev/ui`, `*.map`, `/content/intake/*`, `/wrangler.jsonc` moraju vratiti 404.
3. **Kriterij:** 0 High/Critical, 0 Medium bez dokumentovanog prihvatanja rizika od strane Zijada.

---

## 14. Performanse

| Budžet | Vrijednost |
|---|---|
| HTML (gzip) po stranici | ≤ 40 KB |
| Početni JS (gzip, bez FX-a) | ≤ 90 KB |
| FX chunk (three + sim + shaders, gzip) | ≤ 180 KB, učitava se lijeno |
| GSAP + ScrollTrigger + SplitText (gzip) | ≤ 55 KB, po stranici |
| CSS (gzip) | ≤ 35 KB |
| Fontovi (preload) | 2 fajla, ≤ 90 KB ukupno |
| `face.bin` | ≤ 300 KB (Brotli ≤ 200 KB) |
| Hero slika/poster | ≤ 60 KB AVIF |
| LCP / CLS / INP (p75 mobile) | < 2,0 s / < 0,05 / < 200 ms |

- Lighthouse CI budžeti (`lighthouserc.json`) ruše CI ako se pređu.
- `fetchpriority="high"` samo za LCP sliku (ako LCP nije tekst). Ostale slike `loading="lazy" decoding="async"`.
- Nema `@import` u CSS-u; kritični CSS je inline (Astro), ostatak `<link>`.
- `content-visibility: auto` za duge sekcije ispod prvog ekrana (uz `contain-intrinsic-size`).

---

## 15. Treće strane i privatnost

| Servis | Svrha | Kad se učitava | Podaci | Kolačići |
|---|---|---|---|---|
| Cloudflare | Hosting, CDN, WAF, Turnstile, Web Analytics | Uvijek (Turnstile na stranicama s formom) | IP, user agent (obrada) | Ne (Turnstile ne postavlja tracking kolačiće; provjeriti) |
| Umami Cloud | Analitika | `defer`, samo produkcija | Anonimni pageviewi i događaji | Ne |
| Resend | Slanje emailova | Server-side | Ime, email, poruka | – |
| Hostinger | Email sanduče | Server-side | Sadržaj emailova | – |
| Cal.com | Zakazivanje | **Na klik** | Ime, email, termin | Moguće (u iframeu, nakon klika) |
| YouTube (nocookie) | Video | **Na klik** | Standardno YouTube | Moguće nakon klika |
| R2 | Čuvanje PDF vodiča | Server-side | – | – |

Privacy Policy mora navesti svaki red iz ove tabele. Dodavanje reda zahtijeva ADR.

---

## 16. Testiranje

| Nivo | Alat | Šta | Kad |
|---|---|---|---|
| Statička analiza | `astro check`, `tsc`, ESLint, Stylelint | Tipovi, a11y lint, sigurnosna pravila | pre-commit + CI |
| Unit | Vitest | `pricing`, sheme, `escapeHtml`, tokeni, SEO builderi, FX state machine, capabilities | CI |
| API | `@cloudflare/vitest-plugin` (Vitest projekat `api`, `tests/api/**`) | Svaki status kod iz §9.1, sretan put, Resend mock, rate limit | CI |
| E2E | Playwright (chromium, webkit, firefox, Pixel 7, iPhone 15) | Navigacija, meni, filter, modal, forme, kalkulator, 404, redirecti | CI na preview okruženju |
| Vizuelni | Playwright `toHaveScreenshot` sa `?fx=off`, `reducedMotion: 'reduce'` | Sve stranice × 360/768/1280/1920 | CI |
| Overflow | Playwright skripta | `document.documentElement.scrollWidth <= innerWidth` + nijedan element s `getBoundingClientRect().right > innerWidth` (osim namjerno skrivenih), 11 širina | CI |
| A11y | `@axe-core/playwright` | Sve stranice, WCAG 2.2 AA tagovi | CI |
| Performanse | Lighthouse CI | Svi šabloni, mobile + desktop, budžeti | CI (PR) |
| Linkovi i HTML | linkinator, html-validate | `dist/` | CI |
| Sigurnost | gitleaks, CodeQL, audit, ZAP baseline | Repo i preview | CI + sedmično |
| Ručno | Checkliste | Tastatura, VoiceOver, pravi uređaji, FX vizual | Prije svakog lansiranja |

**Playwright (P1.ENV.09):** `playwright.config.ts`, projekti `chromium`, `firefox`, `webkit`, `pixel-7`, `iphone-15`. Specovi su u `tests/{e2e,visual,a11y,overflow}/**/*.spec.ts` i importuju `test` iz `tests/fixtures/stable.ts`: svaki `page.goto` dobija `?fx=off`, a kontekst radi s `reducedMotion: 'reduce'`, `en-US` i `Europe/Sarajevo`. FX specovi importuju `test` direktno iz `@playwright/test`. Lokalno se pokreće `pnpm build` + `astro preview` na portu 4322; ako je postavljen `PLAYWRIGHT_BASE_URL` (CI protiv preview deploya, P1.ENV.10), lokalni server se ne pokreće. Prva instalacija browsera: `pnpm test:e2e:install`. FX sloj mora poštovati `?fx=off` (P1.FX.01).

**Pravilo:** bug fix = prvo test koji reprodukuje bug, pa popravka.

---

## 17. CI/CD i okruženja

| Okruženje | URL | Trigger | Indeksiranje | Analitika |
|---|---|---|---|---|
| development | `localhost:4321` | `pnpm dev` | – | ne |
| preview | Workers preview URL po verziji | svaki PR (`wrangler versions upload`) | `noindex` | ne |
| production | `https://lejliczijad.com` | merge na `main` (`wrangler deploy`) | da | da |

**Workflowi:**
- `ci.yml` (PR + push): install (pnpm cache) → `lint` → `typecheck` → `test:unit` → `test:api` → `build` → upload preview → `test:e2e` + `test:visual` + `test:a11y` + `test:overflow` protiv preview URL-a.
- `lighthouse.yml` (PR): LHCI protiv preview URL-a.
- `security.yml` (PR + push na `main` + sedmično + ručno): gitleaks (CLI s provjerom SHA-256, cijela historija), `pnpm audit --audit-level=high`, CodeQL (JS/TS, `security-extended`). CodeQL se pokreće samo uz repo varijablu `CODEQL_ENABLED=true`, jer code scanning na privatnom repou traži GitHub Code Security (P1.ENV.11).
- `zap.yml` (sedmično + ručno): ZAP baseline na produkciji, API scan na preview okruženju.
- `deploy.yml` (push na `main`): build → `wrangler deploy` → smoke test (`/`, `/work`, `/api/health`) → IndexNow ping.
- **Rollback:** `wrangler rollback` na prethodnu verziju (opisano u `docs/runbook.md`).
- **Tajne u GitHubu:** `CLOUDFLARE_API_TOKEN` (samo Workers Scripts:Edit + Account Read za jedan nalog), `CLOUDFLARE_ACCOUNT_ID`.

---

## 18. DNS i email zapisi

> Konačna lista ide u `docs/dns-plan.md` nakon backupa (P0.DNS.01). **MX zapisi ostaju na Hostingeru.**

| Tip | Ime | Vrijednost | Proxy |
|---|---|---|---|
| (Worker custom domain) | `lejliczijad.com` | Worker `lejliczijad` | ✓ |
| CNAME / redirect rule | `www` | → 301 na apex | ✓ |
| MX | `@` | Hostinger MX (iz backupa) | DNS only |
| TXT | `@` | `v=spf1 include:<hostinger> ~all` (+ Resend ako traži root include) | – |
| TXT | `<hostinger dkim>._domainkey` | iz backupa | – |
| TXT | `resend._domainkey` | iz Resenda | – |
| MX + TXT | `send` | iz Resenda (return-path) | DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:support@lejliczijad.com; fo=1` (→ quarantine → reject) | – |
| TXT | `@` | `google-site-verification=…` | – |
| CAA | `@` | `0 issue "letsencrypt.org"`, `0 issue "pki.goog"`, `0 issue "digicert.com"`, `0 iodef "mailto:support@lejliczijad.com"` (CA-ove koje Cloudflare koristi provjeriti pri implementaciji) | – |
| ostali | – | sve ostalo iz backupa (autodiscover, webmail…) | prema backupu |

---

## 19. Monitoring i operacije

- **Uptime:** UptimeRobot (besplatno) ili Cloudflare Health Checks za `/` i `/api/health` svakih 5 min; alarm na `support@`.
- **Greške:** Workers Logs (observability uključen, sampling 100 % za `/api`); sedmični pregled.
- **CSP izvještaji:** `/api/csp-report` u Workers Logs; sedmični pregled.
- **Analitika:** Umami ciljevi + CF Web Analytics (Core Web Vitals RUM).
- **SEO:** Search Console email upozorenja uključena.
- **DMARC izvještaji:** na `support@` (kasnije, po želji, servis za parsiranje).
- **Backup:** Git (GitHub) je izvor istine za kod i sadržaj; sirovi materijali (`content/intake/_raw`) se drže i na Zijadovom disku i cloudu.

---

## 20. ADR: zapisi arhitektonskih odluka

Format: `ADR-NNN · Naslov · Status (Accepted/Superseded) · Datum · Kontekst · Odluka · Posljedice`.

| ADR | Odluka | Status |
|---|---|---|
| ADR-001 | Astro (static) + `@astrojs/cloudflare`; verzije pinovane pri scaffoldu ([docs/adr/001-astro-static.md](docs/adr/001-astro-static.md): Astro 7.4.13, Node 26.13.1, pnpm 12.23.0, TypeScript 6.0.3) | Accepted |
| ADR-002 | Cloudflare **Workers + Static Assets** umjesto klasičnog Pages projekta (Cloudflare ga preporučuje za nove projekte; zadržava "Pages" prednosti: CDN, preview, besplatno) | Accepted |
| ADR-003 | Bez baze; MDX content collections; forme bez skladištenja (samo email) | Accepted |
| ADR-004 | Svelte 5 za interaktivne islands, ostalo vanilla TS | Accepted |
| ADR-005 | Vanilla CSS s custom properties tokenima + Astro scoped stilovi; bez Tailwinda | Accepted |
| ADR-006 | three.js + GPGPU za vortex; jedan persistentni canvas kroz View Transitions | Accepted |
| ADR-007 | GSAP + Lenis za scroll animacije | Accepted |
| ADR-008 | Resend za transakcione emailove; MX ostaje na Hostingeru | Accepted |
| ADR-009 | Turnstile + Rate Limiting binding + KV dnevni limit | Accepted |
| ADR-010 | Umami Cloud + CF Web Analytics; bez kolačića | Accepted |
| ADR-011 | Lead magnet PDF u privatnom R2, download preko HMAC tokena | Accepted |
| ADR-012 | US English za sav sadržaj sajta | Accepted |
| ADR-013 | Clash Display i Satoshi se self-hostuju bez subsettinga (ITF FFL v2.0); JetBrains Mono (OFL) se smije subsetovati ([docs/adr/013-fonts-no-subset.md](docs/adr/013-fonts-no-subset.md)) | Accepted |

Nove ADR-ove agent dodaje u `docs/adr/NNN-naslov.md`, a ovu tabelu ažurira u istom PR-u.
