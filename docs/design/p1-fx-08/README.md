# P1.FX.08: vortex simulacija (screenshotovi za pregled)

> Status: **čeka Zijadovo odobrenje izgleda** ("vizuelno odgovara Dust Vortex referenci").
> Ovo je simulacija s **baznim** crtanjem tačaka. Konačan izgled čestica (veličina po dubini, ~3 % plavih, glow) je P1.FX.09, a mjesto i nagib diska na stranici određuju P1.FX.02 i hero (P1.FACE.10).

Snimljeno na `/_dev/fx?scene=vortex&panel=off`, high tier (131.072 čestice), headed Chromium, Apple M4 (Metal), nakon ~10 s rada.

| Širina | Slika |
|---|---|
| 375 | [vortex-375.jpg](vortex-375.jpg) |
| 768 | [vortex-768.jpg](vortex-768.jpg) |
| 1280 | [vortex-1280.jpg](vortex-1280.jpg) |
| 1920 | [vortex-1920.jpg](vortex-1920.jpg) |
| Kretanje (5 s, 640 px, 15 fps) | [vortex.gif](vortex.gif) |
| Dev panel na 375 px (bez horizontalnog skrola) | [panel-375.jpg](panel-375.jpg) |

Lokalno: `pnpm dev`, pa `http://localhost:4321/_dev/fx?scene=vortex&panel=off`. Konstante oblika i sila su u `VORTEX` u `src/fx/vortex/simulation.ts`.
