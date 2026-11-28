// Vortex points, fragment stage (P1.FX.09). A soft round dot with a brighter core and a Gaussian
// falloff, white/grey or accent blue, drawn with additive blending (density builds where particles
// overlap). Colours arrive as sRGB values and are written as is, because this ShaderMaterial skips
// three's colour-space conversion.
//
// Uniforms: uOpacity (peak alpha of one dot), uColorWhite, uColorGrey, uColorAccent (sRGB, 0..1),
//           uAccentBoost (alpha factor for accent dots, so blue reads against white).
// Varyings: vAlpha, vColorMix, vAccent (see the vertex stage).

uniform float uOpacity;
uniform vec3 uColorWhite;
uniform vec3 uColorGrey;
uniform vec3 uColorAccent;
uniform float uAccentBoost;

varying float vAlpha;
varying float vColorMix;
varying float vAccent;

// Gaussian falloff: exp(-d * FALLOFF) is ~0.02 at the edge, so the disc fades out before the
// discard and never shows a hard rim.
const float FALLOFF = 4.0;
// A small, sharper core keeps single particles readable at 1–2 px.
const float CORE = 0.35;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0; // 0 at the centre, 1 at the edge
  if (d > 1.0) discard;
  float soft = exp(-d * FALLOFF);
  float core = 1.0 - smoothstep(0.0, CORE, d);
  float shape = mix(soft, 1.0, core * 0.5);

  vec3 neutral = mix(uColorGrey, uColorWhite, vColorMix);
  vec3 color = mix(neutral, uColorAccent, vAccent);
  float alpha = shape * vAlpha * uOpacity * mix(1.0, uAccentBoost, vAccent);
  gl_FragColor = vec4(color, alpha);
}
