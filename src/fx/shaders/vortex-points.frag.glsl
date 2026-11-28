// Vortex points, fragment stage (P1.FX.08 baseline; the final look, accent particles and glow are
// P1.FX.09). A soft round dot in white/grey, drawn with additive blending.
//
// Uniforms: uOpacity (peak alpha of one dot). Varyings: vAlpha, vTint (see the vertex stage).

uniform float uOpacity;

varying float vAlpha;
varying float vTint;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0; // 0 at the centre, 1 at the edge
  if (d > 1.0) discard;
  float soft = 1.0 - smoothstep(0.25, 1.0, d);
  gl_FragColor = vec4(vec3(vTint), soft * vAlpha * uOpacity);
}
