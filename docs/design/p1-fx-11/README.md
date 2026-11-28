# P1.FX.11: scroll reaction

Vortex on `/_dev/fx?scene=vortex&fx=high&panel=off` (headed Chromium, Apple M4, 1280×800 @2, minified
preview build). The particle look is the P1.FX.08 baseline on `main`; P1.FX.09 and P1.FX.10 (open
PRs) change the look and add the mouse field, not the scroll reaction.

| File | What it shows |
| --- | --- |
| `rest.jpg` | Page at rest: `uScrollVel` 0, the disk turns at its idle rate. |
| `scrolling.jpg` | During a hard wheel scroll (~1 s in): the disk turns ~3× as fast. |
| `settled.jpg` | 3 s after the scroll stopped: back to the idle rate. |
| `scroll-reaction.gif` | Rest → hard scroll down → eases back → gentle reading scroll up (10 fps, 480 px). |

Values: full speed 4 viewport heights per second (tanh(1) ≈ 0.76), rise 0.12 s, fall 0.6 s,
value changes at most 4/s up and 2/s down, frames faster than 25 viewport heights per second are
jumps and ignored. At `uScrollVel` 1 the time scale is × 1.5 and the swirl × 2, so the disk turns
3× as fast.

Measured in the recording: FPS 59.5 during the hard scroll and 59.9 during the gentle one (2 s
average), peak 0.988, largest change between two frames 0.071, no tier change, no GL error.
