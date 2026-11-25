/*
 * P1.DS.01 mockup helper (preview only, not production FX).
 *
 * A 2D canvas sketch that hints at the dot head (tech.md §7.4) and the particle vortex (§7.3):
 * a procedural head (no scan yet), mouse-follow with a damped spring (yaw ±25°, pitch ±12°),
 * hover scatter, a short intro where dots fly in from the vortex, and a dimming mask behind text
 * so contrast holds (§6.1, P1.FX.12). The real thing is three.js + GPGPU in P1.FX / P1.FACE.
 *
 * Classic script on purpose: ES modules do not load from file:// in Chromium.
 * Query flags: ?fx=off (poster only), ?fx=static (one frame, no loop).
 */
(function () {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const MAX_YAW = 25 * DEG;
  const MAX_PITCH = 12 * DEG;
  const SPRING_K = 120;
  const SPRING_C = 18;
  const MAX_DT = 1 / 30;
  const INTRO_SECONDS = 2.2;
  const ACCENT_SHARE = 0.03;
  const GRAY_LEVELS = 24;
  const DIM_FEATHER_PX = 48;
  const DPR_CAP = 2;
  const CAMERA_DISTANCE = 4.2;
  const ACCENT_RGB = [77, 124, 255];

  const params = new URLSearchParams(window.location.search);
  const fxParam = params.get('fx');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Deterministic random so screenshots are repeatable.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const gauss2 = (a, b) => Math.exp(-(a * a + b * b));
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const smooth = (v) => v * v * (3 - 2 * v);
  const easeOutCubic = (v) => 1 - Math.pow(1 - v, 3);

  /* ---------- Procedural head (placeholder until the scan, P1.FACE.02) ---------- */
  // Surface of a stylised head: deformed ellipsoid plus nose, brows, sockets, lips and chin.
  function headSurface(y, phi) {
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const x = rr * Math.cos(phi);
    const z = rr * Math.sin(phi);
    const jaw = y < -0.15 ? 1 - 0.3 * Math.pow((-0.15 - y) / 0.85, 1.4) : 1;
    const crown = y > 0.55 ? 1 - 0.08 * ((y - 0.55) / 0.45) : 1;
    const wx = 0.7 * jaw * crown;
    const wz = 0.84 * (z < 0 ? 1 + 0.12 * (y + 1) * 0.5 : 1) * (y < -0.3 && z > 0 ? 0.94 : 1);
    const X = x * wx;
    const Y = y;
    let Z = z * wz;
    const front = smooth(clamp01(z * 1.8));
    const ax = Math.abs(X);
    Z +=
      front *
      (0.22 * gauss2(X / 0.075, (Y + 0.12) / 0.2) +
        0.07 * gauss2(X / 0.06, (Y + 0.3) / 0.06) +
        0.04 * gauss2((ax - 0.07) / 0.035, (Y + 0.32) / 0.04) -
        0.14 * gauss2((ax - 0.24) / 0.1, (Y - 0.06) / 0.065) +
        0.07 * gauss2((ax - 0.23) / 0.17, (Y - 0.19) / 0.045) +
        0.05 * gauss2(X / 0.15, (Y + 0.48) / 0.045) +
        0.035 * gauss2(X / 0.13, (Y + 0.57) / 0.04) -
        0.02 * gauss2(X / 0.12, (Y + 0.52) / 0.012) +
        0.06 * gauss2(X / 0.14, (Y + 0.8) / 0.09) +
        0.05 * gauss2((ax - 0.38) / 0.1, (Y + 0.06) / 0.1));
    // Ears
    const ear = gauss2((ax - 0.68) / 0.05, (Y - 0.0) / 0.16) * gauss2(z / 0.25, 0);
    return [X + Math.sign(X) * 0.06 * ear, Y, Z];
  }

  function buildHead(count, rand) {
    const pts = [];
    const light = normalize([-0.5, 0.45, 0.75]);
    const eps = 0.004;
    let guard = 0;
    while (pts.length < count && guard < count * 8) {
      guard += 1;
      const isNeck = rand() < 0.07;
      let X;
      let Y;
      let Z;
      let n;
      if (isNeck) {
        const a = rand() * TAU;
        const h = rand();
        const r = 0.33 + 0.06 * h;
        X = Math.cos(a) * r;
        Z = Math.sin(a) * r * 0.9 - 0.1;
        Y = -0.82 - h * 0.6;
        if (Math.sin(a) < -0.2 && rand() < 0.75) continue;
        n = [Math.cos(a), 0, Math.sin(a)];
      } else {
        const y = rand() * 2 - 1;
        const phi = rand() * TAU;
        // The camera rarely sees the back, so keep fewer dots there; the face gets the most.
        const zs = Math.sin(phi);
        if (zs < -0.1 && rand() < 0.7) continue;
        if (zs > 0.4 && y > -0.95 && y < 0.35 && rand() < 0.45) {
          // Oversample the face by keeping these and adding a twin nearby.
          const p2 = headSurface(y + (rand() - 0.5) * 0.01, phi + (rand() - 0.5) * 0.01);
          pts.push({ X: p2[0], Y: p2[1], Z: p2[2], lum: -1, accent: false, y, phi });
        }
        [X, Y, Z] = headSurface(y, phi);
        const a = headSurface(y + eps, phi);
        const b = headSurface(y, phi + eps);
        const du = [a[0] - X, a[1] - Y, a[2] - Z];
        const dv = [b[0] - X, b[1] - Y, b[2] - Z];
        n = normalize([du[2] * dv[1] - du[1] * dv[2], du[0] * dv[2] - du[2] * dv[0], du[1] * dv[0] - du[0] * dv[1]]);
        // Keep normals pointing outward.
        if (n[0] * X + n[1] * Y + n[2] * Z < 0) n = [-n[0], -n[1], -n[2]];
      }
      const lambert = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
      const rim = Math.pow(1 - Math.abs(n[2]), 4) * 0.2;
      const lum = clamp01(0.06 + 1.0 * Math.pow(lambert, 1.7) + rim);
      pts.push({ X, Y, Z, lum, accent: rand() < ACCENT_SHARE * 0.5 });
    }
    // Twins borrow the lighting of the point pushed right after them.
    for (let i = 0; i < pts.length; i += 1) {
      if (pts[i].lum === -1) pts[i].lum = pts[i + 1] ? pts[i + 1].lum : 0.5;
    }
    return pts;
  }

  function normalize(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  /* ---------- Vortex ---------- */
  function buildVortex(count, rand, cfg) {
    const pts = [];
    for (let i = 0; i < count; i += 1) {
      const r = cfg.inner + (cfg.outer - cfg.inner) * Math.pow(rand(), 0.75);
      const gaussian = (rand() + rand() + rand() - 1.5) / 1.5;
      pts.push({
        r,
        a: rand() * TAU,
        h: gaussian * cfg.thickness * r,
        w: cfg.speed / Math.pow(r, 1.25),
        lum: 0.25 + 0.75 * rand(),
        phase: rand() * TAU,
        accent: rand() < ACCENT_SHARE,
      });
    }
    return pts;
  }

  /* ---------- Dimming mask behind text (contrast) ---------- */
  function readDimRects() {
    return Array.from(document.querySelectorAll('[data-dim]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, level: Number(el.dataset.dim) };
    });
  }

  function dimAt(x, y, rects) {
    let f = 1;
    for (const q of rects) {
      const dx = Math.max(q.l - x, 0, x - q.r);
      const dy = Math.max(q.t - y, 0, y - q.b);
      const d = Math.hypot(dx, dy);
      if (d >= DIM_FEATHER_PX) continue;
      const m = q.level + (1 - q.level) * smooth(d / DIM_FEATHER_PX);
      if (m < f) f = m;
    }
    return f;
  }

  /* ---------- Sketch ---------- */
  function start(config) {
    if (fxParam === 'off') return;
    const canvas = document.querySelector('.fx-canvas');
    const anchor = document.querySelector(config.faceAnchor);
    if (!canvas || !anchor) return;
    // willReadFrequently only for ?measure=1, which reads pixels back (avoids a Chrome warning).
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: params.get('measure') === '1' });
    if (!ctx) return;

    const isSmall = window.matchMedia('(max-width: 47.99em)').matches;
    const rand = mulberry32(20261125);
    const head = buildHead(isSmall ? 6000 : 12000, rand);
    const vortexCfg = config.vortex;
    const vortex = buildVortex(isSmall ? 2200 : 5200, rand, vortexCfg);
    const disp = new Float32Array(head.length * 2);
    const start = head.map(() => ({ a: rand() * TAU, r: 0.8 + rand() * 1.4 }));
    const animate = !reducedMotion && fxParam !== 'static';

    let dpr = 1;
    let vw = 0;
    let vh = 0;
    let face = { x: 0, y: 0, s: 1 };
    let rects = [];
    const pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false };
    const spring = { yaw: 0, pitch: 0, vy: 0, vp: 0 };
    const buckets = Array.from({ length: GRAY_LEVELS }, () => []);
    const accentBucket = [];
    let t0 = performance.now();
    let last = t0;
    let raf = 0;

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      vw = window.innerWidth;
      vh = window.innerHeight;
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      const r = anchor.getBoundingClientRect();
      // Head (forehead to neck) spans about 2.6 units; fit it into the anchor height.
      face = {
        x: r.left + r.width / 2 + (config.faceOffsetX || 0) * r.width,
        y: r.top + r.height * 0.44,
        s: (r.height / 2.6) * (config.faceScale || 1),
      };
      rects = readDimRects();
      // Resizing the canvas clears it; without a running loop we must repaint here.
      if (!animate) draw(INTRO_SECONDS, 0);
    }

    function onPointer(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.nx = clamp(((e.clientX - face.x) / Math.max(vw * 0.5, 1)), -1, 1);
      pointer.ny = clamp(((e.clientY - face.y) / Math.max(vh * 0.5, 1)), -1, 1);
      pointer.active = e.pointerType === 'mouse';
    }

    function clamp(v, lo, hi) {
      return Math.min(hi, Math.max(lo, v));
    }

    function stepSpring(dt, time) {
      let ty;
      let tp;
      if (pointer.active) {
        ty = pointer.nx * MAX_YAW;
        tp = pointer.ny * MAX_PITCH;
      } else {
        ty = Math.sin(time * 0.35) * MAX_YAW * 0.35;
        tp = Math.sin(time * 0.27) * MAX_PITCH * 0.3;
      }
      const ay = SPRING_K * (ty - spring.yaw) - SPRING_C * spring.vy;
      const ap = SPRING_K * (tp - spring.pitch) - SPRING_C * spring.vp;
      spring.vy += ay * dt;
      spring.vp += ap * dt;
      spring.yaw += spring.vy * dt;
      spring.pitch += spring.vp * dt;
    }

    function push(x, y, size, lum, accent) {
      const f = dimAt(x, y, rects);
      const v = lum * f;
      if (v < 0.02) return;
      if (accent) {
        accentBucket.push(x, y, size, v);
        return;
      }
      const level = Math.min(GRAY_LEVELS - 1, Math.floor(v * GRAY_LEVELS));
      buckets[level].push(x, y, size);
    }

    function draw(time, dt) {
      for (const b of buckets) b.length = 0;
      accentBucket.length = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      const intro = animate ? clamp01(time / INTRO_SECONDS) : 1;
      const vx = face.x + (vortexCfg.offsetX || 0) * face.s;
      const vy = face.y + (vortexCfg.offsetY || 0) * face.s;
      const vScale = face.s * vortexCfg.scale;
      const cosR = Math.cos(vortexCfg.rotate * DEG);
      const sinR = Math.sin(vortexCfg.rotate * DEG);

      // Vortex
      for (const p of vortex) {
        if (animate) p.a += p.w * dt;
        const wobble = 1 + 0.025 * Math.sin(p.a * 3 + p.phase + time * 0.6);
        const x3 = Math.cos(p.a) * p.r * wobble;
        const z3 = Math.sin(p.a) * p.r * wobble;
        const lx = x3;
        const ly = z3 * vortexCfg.tilt + p.h;
        const sx = vx + (lx * cosR - ly * sinR) * vScale;
        const sy = vy + (lx * sinR + ly * cosR) * vScale;
        if (sx < -4 || sy < -4 || sx > vw + 4 || sy > vh + 4) continue;
        const depth = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.a));
        push(sx, sy, 1.1, p.lum * depth * vortexCfg.brightness, p.accent);
      }

      // Head
      const cy = Math.cos(spring.yaw);
      const sy0 = Math.sin(spring.yaw);
      const cp = Math.cos(spring.pitch);
      const sp = Math.sin(spring.pitch);
      const radius = 70;
      for (let i = 0; i < head.length; i += 1) {
        const p = head[i];
        const x1 = p.X * cy + p.Z * sy0;
        const z1 = -p.X * sy0 + p.Z * cy;
        const y2 = p.Y * cp - z1 * sp;
        const z2 = p.Y * sp + z1 * cp;
        if (z2 < -0.55) continue;
        const persp = CAMERA_DISTANCE / (CAMERA_DISTANCE - z2);
        let sx = face.x + x1 * persp * face.s;
        let syy = face.y - y2 * persp * face.s;

        // Intro: dots fly in from the vortex, staggered by height (top first).
        if (intro < 1) {
          const delay = ((1 - p.Y) / 2.6) * 0.45;
          const k = easeOutCubic(clamp01((intro - delay) / (1 - 0.45)));
          const st = start[i];
          const ox = vx + Math.cos(st.a + time) * st.r * vScale * 0.8;
          const oy = vy + Math.sin(st.a + time) * st.r * vScale * 0.8 * vortexCfg.tilt;
          sx = ox + (sx - ox) * k;
          syy = oy + (syy - oy) * k;
        }

        // Hover scatter around the cursor, then spring back.
        let tx = 0;
        let ty = 0;
        if (pointer.active && animate) {
          const dx = sx - pointer.x;
          const dy = syy - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < radius && d > 0.001) {
            const f = Math.pow(1 - d / radius, 2) * 26;
            tx = (dx / d) * f;
            ty = (dy / d) * f;
          }
        }
        disp[i * 2] += (tx - disp[i * 2]) * 0.18;
        disp[i * 2 + 1] += (ty - disp[i * 2 + 1]) * 0.18;
        sx += disp[i * 2];
        syy += disp[i * 2 + 1];

        const depthLum = 0.55 + 0.45 * clamp01((z2 + 0.6) / 1.6);
        push(sx, syy, 0.9 + 0.8 * (persp - 1) + 0.5, p.lum * depthLum * config.faceBrightness, p.accent);
      }

      for (let l = 0; l < GRAY_LEVELS; l += 1) {
        const arr = buckets[l];
        if (!arr.length) continue;
        const g = Math.round(((l + 0.5) / GRAY_LEVELS) * 255);
        ctx.fillStyle = `rgb(${g} ${g} ${g})`;
        ctx.beginPath();
        for (let j = 0; j < arr.length; j += 3) {
          const s = arr[j + 2];
          ctx.rect(arr[j] - s / 2, arr[j + 1] - s / 2, s, s);
        }
        ctx.fill();
      }
      for (let j = 0; j < accentBucket.length; j += 4) {
        const v = accentBucket[j + 3];
        ctx.fillStyle = `rgb(${Math.round(ACCENT_RGB[0] * v)} ${Math.round(ACCENT_RGB[1] * v)} ${Math.round(ACCENT_RGB[2] * v)})`;
        const s = accentBucket[j + 2] + 0.4;
        ctx.fillRect(accentBucket[j] - s / 2, accentBucket[j + 1] - s / 2, s, s);
      }
    }

    function frame(now) {
      const dt = Math.min((now - last) / 1000, MAX_DT);
      last = now;
      const time = (now - t0) / 1000;
      stepSpring(dt, time);
      draw(time, dt);
      raf = window.requestAnimationFrame(frame);
    }

    layout();
    canvas.hidden = false;
    window.addEventListener('resize', layout, { passive: true });
    window.addEventListener('scroll', () => (rects = readDimRects()), { passive: true });
    document.fonts?.ready.then(layout);

    if (animate) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          window.cancelAnimationFrame(raf);
        } else {
          last = performance.now();
          raf = window.requestAnimationFrame(frame);
        }
      });
      raf = window.requestAnimationFrame(frame);
    }
  }

  /* ---------- Contrast probe (used to fill the README table) ---------- */
  function luminance(r, g, b) {
    const f = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  function parseRgb(str) {
    const m = str.match(/[\d.]+/g) || ['0', '0', '0'];
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  }

  function measure(selectors) {
    const canvas = document.querySelector('.fx-canvas');
    const ctx = canvas && canvas.getContext('2d');
    const bg = [5, 5, 7];
    const scale = canvas ? canvas.width / window.innerWidth : 1;
    return selectors.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, missing: true };
      const r = el.getBoundingClientRect();
      const fg = parseRgb(getComputedStyle(el).color);
      let brightest = bg;
      let maxL = luminance(...bg);
      if (ctx && r.width > 0 && r.height > 0) {
        const x = Math.max(0, Math.floor(r.left * scale));
        const y = Math.max(0, Math.floor(r.top * scale));
        const w = Math.min(canvas.width - x, Math.ceil(r.width * scale));
        const h = Math.min(canvas.height - y, Math.ceil(r.height * scale));
        if (w > 0 && h > 0) {
          const data = ctx.getImageData(x, y, w, h).data;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3] / 255;
            const px = [0, 1, 2].map((k) => data[i + k] * a + bg[k] * (1 - a));
            const L = luminance(px[0], px[1], px[2]);
            if (L > maxL) {
              maxL = L;
              brightest = px.map(Math.round);
            }
          }
        }
      }
      const Lfg = luminance(...fg);
      const ratio = (Math.max(Lfg, maxL) + 0.05) / (Math.min(Lfg, maxL) + 0.05);
      return {
        sel,
        fg: `rgb(${fg.join(' ')})`,
        brightestBehind: `rgb(${brightest.join(' ')})`,
        ratio: Math.round(ratio * 100) / 100,
        fontPx: parseFloat(getComputedStyle(el).fontSize),
      };
    });
  }

  /* ---------- Page chrome: mobile menu + local time ---------- */
  function initPage() {
    const open = document.querySelector('[data-menu-open]');
    const close = document.querySelector('[data-menu-close]');
    const menu = document.getElementById('mobile-menu');
    if (open && close && menu) {
      const setOpen = (state) => {
        menu.hidden = !state;
        open.setAttribute('aria-expanded', String(state));
        document.body.style.overflow = state ? 'hidden' : '';
        (state ? close : open).focus();
      };
      open.addEventListener('click', () => setOpen(true));
      close.addEventListener('click', () => setOpen(false));
      menu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
        if (e.key !== 'Tab') return;
        const items = menu.querySelectorAll('a, button');
        const first = items[0];
        const lastItem = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          first.focus();
        }
      });
    }

    const clocks = document.querySelectorAll('[data-local-time]');
    if (clocks.length) {
      const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Sarajevo',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
      const tick = () => clocks.forEach((c) => (c.textContent = fmt.format(new Date())));
      tick();
      window.setInterval(tick, 30_000);
    }
  }

  /*
   * ?measure=1 (review tooling): after the intro, write overflow + contrast results as JSON text
   * into #measure-out so a headless browser can read them with --dump-dom. No console output.
   */
  const MEASURE_SELECTORS = [
    '.site-nav a',
    '.wordmark',
    '.hero .eyebrow',
    '.hero__index',
    '.hero__title',
    '.hero__title em',
    '.hero__lead',
    '.hero .badge',
    '.hero .btn--secondary',
    // .btn--primary is left out: its text sits on its own accent fill (5.47:1, see README).
    '.hero .btn-meet',
  ];

  function overflowReport() {
    const de = document.documentElement;
    const offenders = Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        if (el.closest('[hidden], .skip-link, .visually-hidden, [data-face-anchor], .fx-canvas, .fx-poster, .grid-lines')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 0.5 || r.left < -0.5);
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
    return { innerWidth: window.innerWidth, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders };
  }

  if (params.get('measure') === '1') {
    window.setTimeout(() => {
      const out = document.createElement('pre');
      out.id = 'measure-out';
      out.hidden = true;
      out.textContent = JSON.stringify({ overflow: overflowReport(), contrast: measure(MEASURE_SELECTORS) });
      document.body.append(out);
    }, (INTRO_SECONDS + 0.6) * 1000);
  }

  window.HeroSketch = { start, measure, initPage };
})();
