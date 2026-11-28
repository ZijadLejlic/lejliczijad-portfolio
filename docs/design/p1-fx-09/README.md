# P1.FX.09: shader za čestice vortexa (screenshotovi za pregled)

> Status: **odobreno** (Zijad, 2026-11-28).
> Poređenje: bazno crtanje iz P1.FX.08 je u [`../p1-fx-08/`](../p1-fx-08/README.md). Mjesto i nagib diska na stranici određuju P1.FX.02 i hero (P1.FACE.10).

Snimljeno na `/_dev/fx?scene=vortex&fx=high&panel=off`, high tier (131.072 čestice), headed Chromium, Apple M4 (Metal), DPR 2 (slike smanjene na 1×), nakon ~10 s rada. Na 1280 px panel pokazuje 60 FPS i `GL error: none`.

| Širina | Slika |
|---|---|
| 375 | [vortex-375.jpg](vortex-375.jpg) |
| 768 | [vortex-768.jpg](vortex-768.jpg) |
| 1280 | [vortex-1280.jpg](vortex-1280.jpg) |
| 1920 | [vortex-1920.jpg](vortex-1920.jpg) |
| Kretanje (5 s, 640 px, 15 fps) | [vortex.gif](vortex.gif) |

## Šta se promijenilo u odnosu na P1.FX.08
- **Boje iz tokena:** bijela `--color-text`, siva `--color-text-muted`, akcent `--color-accent` (#4D7CFF). Bijelo/sivo se miješa po čestici i po sporom prostornom uzorku, pa svjetlije i sivlje trake putuju s vrtlogom (bez treperenja).
- **~3 % akcentnih čestica** (hash po indeksu); malo su veće (×1,5) i jače (×1,6), inače ih aditivna bijela proguta. Najbolje se vide u rjeđim dijelovima diska.
- **Dubina:** veličina ∝ 1/dubina (s gornjom granicom 6 px, da čestica blizu kamere ne postane mrlja) i alpha ∝ (6 / dubina)², najmanje 35 %, pa je stražnja strana diska tamnija.
- **Sub-pixel energija:** tačka manja od 1 px se crta kao 1 px, ali s alphom po površini koju bi trebala pokriti. Daleka prašina zato ne postaje svijetli, nazubljeni tepih.
- **~4 % "dust motes":** veće (×2,2), slabije (×0,45) čestice koje daju dubinu.
- **Mekane ivice:** Gaussov pad + malo oštrije jezgro, da je i čestica od 1–2 px čitljiva.
- Bez glow post efekta (tech.md §7.2 ga za high navodi kao opcionalan); može se dodati ako želiš jači sjaj.

Sve vrijednosti su u `PARTICLE_LOOK` u `src/fx/vortex/particles.ts`, pa se podešavaju bez diranja shadera. Lokalno: `pnpm dev`, pa `http://localhost:4321/_dev/fx?scene=vortex&fx=high&panel=off`.
