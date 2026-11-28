// Vortex points, vertex stage (P1.FX.08 baseline; the final look is P1.FX.09). Reads each
// particle's position from the simulation texture and sizes the point by depth.
//
// Attributes: reference (uv of the particle's texel; `position` is unused, three needs it to count).
// Uniforms: texturePosition (simulation output: xyz, w = life), uPointSize (px at depth 1, before
//           DPR), uPixelRatio, uDim (0 = full brightness, 1 = black).
// Varyings: vAlpha (life fade × brightness), vTint (grey level per particle).

uniform sampler2D texturePosition;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uDim;

attribute vec2 reference;

varying float vAlpha;
varying float vTint;

// Fades over the first and last part of a particle's life, so respawns never pop.
const float FADE = 0.08;
const float MIN_POINT_PX = 1.0;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 particle = texture2D(texturePosition, reference);
  vec4 mvPosition = modelViewMatrix * vec4(particle.xyz, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float life = particle.w;
  float fade = smoothstep(0.0, FADE, life) * (1.0 - smoothstep(1.0 - FADE, 1.0, life));
  vAlpha = fade * (1.0 - uDim);
  vTint = mix(0.55, 1.0, hash12(reference * 4096.0));

  gl_PointSize = max(uPointSize * uPixelRatio / -mvPosition.z, MIN_POINT_PX);
}
