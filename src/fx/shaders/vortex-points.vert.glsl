// Vortex points, vertex stage (P1.FX.09). Reads each particle's position from the simulation
// texture, sizes the point by depth and gives it a look: white/grey by a slow spatial pattern and a
// per-particle hash, a few larger dust motes, and ~3 % accent (blue) particles picked by index hash.
//
// Attributes: reference (uv of the particle's texel; `position` is unused, three needs it to count).
// Uniforms: texturePosition (simulation output: xyz, w = life), uPointSize (px at depth 1, before
//           DPR), uPixelRatio, uMaxPointSize (px cap, before DPR), uDim (0 = full brightness,
//           1 = black), uDepthRef (view depth that gets full alpha; nearer stays at full alpha,
//           farther fades), uDepthMinAlpha (alpha floor of the depth fade), uAccentRatio (share of
//           accent particles), uAccentScale (their size factor), uMoteRatio (share of dust motes),
//           uMoteScale (their size factor), uMoteAlpha (their alpha factor).
// Varyings: vAlpha (life × depth × dim × sub-pixel energy), vColorMix (0 = grey, 1 = white),
//           vAccent (1 for accent particles).

uniform sampler2D texturePosition;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uMaxPointSize;
uniform float uDim;
uniform float uDepthRef;
uniform float uDepthMinAlpha;
uniform float uAccentRatio;
uniform float uAccentScale;
uniform float uMoteRatio;
uniform float uMoteScale;
uniform float uMoteAlpha;

attribute vec2 reference;

varying float vAlpha;
varying float vColorMix;
varying float vAccent;

// Fades over the first and last part of a particle's life, so respawns never pop.
const float FADE = 0.08;
// Points are never drawn smaller than this; smaller ones dim instead (see below).
const float MIN_POINT_PX = 1.0;
// Spatial frequency of the white/grey pattern (world units): a few bands across the disk.
const float TINT_FREQUENCY = 1.7;
// How much of the grey level comes from the spatial pattern; the rest is per particle.
const float TINT_PATTERN_WEIGHT = 0.45;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Cheap smooth 0..1 pattern in world space. Particles carry it with them as they swirl, so bands of
// brighter and greyer dust drift with the flow instead of flickering per frame.
float tintPattern(vec3 p) {
  vec3 q = p * TINT_FREQUENCY;
  float n = sin(q.x + sin(q.z * 1.3)) * sin(q.z - sin(q.x * 0.7) + q.y * 2.0);
  return 0.5 + 0.5 * n;
}

void main() {
  vec4 particle = texture2D(texturePosition, reference);
  vec4 mvPosition = modelViewMatrix * vec4(particle.xyz, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Independent hashes per particle: grey level, accent pick, mote pick.
  vec2 id = reference * 4096.0;
  float hTint = hash12(id);
  float hAccent = hash12(id + 17.31);
  float hMote = hash12(id + 91.7);

  float accent = step(hAccent, uAccentRatio);
  // Accent particles are never motes, so the blue stays crisp.
  float mote = (1.0 - accent) * step(hMote, uMoteRatio);

  float depth = max(-mvPosition.z, 0.001);
  float life = particle.w;
  float lifeFade = smoothstep(0.0, FADE, life) * (1.0 - smoothstep(1.0 - FADE, 1.0, life));
  float depthFade = clamp(pow(uDepthRef / depth, 2.0), uDepthMinAlpha, 1.0);

  float scale = mix(1.0, uAccentScale, accent) * mix(1.0, uMoteScale, mote);
  float size = min(uPointSize * scale / depth, uMaxPointSize) * uPixelRatio;
  // A point below one pixel is drawn at one pixel; scale its alpha by the area it should cover, so
  // distant dust does not turn into a bright, aliased carpet.
  float energy = clamp(size * size, 0.0, 1.0);

  gl_PointSize = max(size, MIN_POINT_PX);
  vAlpha = lifeFade * depthFade * energy * (1.0 - uDim) * mix(1.0, uMoteAlpha, mote);
  vColorMix = mix(hTint, tintPattern(particle.xyz), TINT_PATTERN_WEIGHT);
  vAccent = accent;
}
