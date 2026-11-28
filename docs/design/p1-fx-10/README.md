# P1.FX.10: mouse field

Vortex on `/_dev/fx?scene=vortex&fx=high&panel=off` (headed Chromium, Apple M4, 1280×800 @2, minified
preview build). The particle look is the P1.FX.08 baseline on `main`; P1.FX.09 (PR #23) changes the
look, not the field.

| File | What it shows |
| --- | --- |
| `before.jpg` | No pointer: the field is parked. |
| `moving.jpg` | Right after a slow loop of the cursor around the core (~2.4 s). |
| `rest.jpg` | 1.5 s later, cursor resting on the right of the disk. |
| `after.jpg` | 3 s after the cursor left the window: the disk has closed again. |
| `mouse-field.gif` | The cursor (blue ring, drawn only for the recording) loops through the disk, then rests. |

Values: radius 0.6 world units, `MOUSE_PUSH` 3.5, resting amount 0.25, full amount at 1.5 viewport
heights per second, field follows the cursor at 7/s. A first pass with `MOUSE_PUSH` 6 and resting
amount 0.35 tore the strands apart and threw particles off the disk, so it was halved.

FPS on the high tier while the cursor moves: 59.4–60.0 (2 s average, sampled over 8 s).
