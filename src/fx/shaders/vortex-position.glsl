// Vortex position pass (P1.FX.08, tech.md §7.3). GPUComputationRenderer variable
// `texturePosition`; one texel = one particle. Runs with vortex-common.glsl prepended. Samplers
// texturePosition and textureVelocity (previous step) are declared by GPUComputationRenderer.
//
// Turns each particle around the Y axis by the swirl (an exact rotation, so it keeps its radius),
// moves it by its drift velocity and ages it; a particle whose life ran out (or that left the
// scene) restarts on the rim with full life. Life ages in real time (uDelta), not scaled time, so
// a fast transition (uSpeed 3) does not burn through lifespans.
//
// Scroll (P1.FX.11): uScrollVel in [0, 1) speeds up both the time scale (drift and rotation) and
// the swirl; at 1 the disk turns (1 + SCROLL_SPEED_BOOST) × (1 + SCROLL_SWIRL_BOOST) times as fast
// (scrollRotationFactor() in scroll.ts). Only the rate changes, so the value may move quickly.
//
// Defines: SCROLL_SPEED_BOOST, SCROLL_SWIRL_BOOST (floats, from VORTEX in simulation.ts).
// Uniforms: uSpeed (time scale), uSwirl (FX state), uScrollVel (scroll.ts);
//           uDelta and uTime come from vortex-common.glsl.

uniform float uSpeed;
uniform float uSwirl;
uniform float uScrollVel;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 position = texture2D(texturePosition, uv);
  vec4 velocity = texture2D(textureVelocity, uv);

  if (needsRespawn(position, velocity.w)) {
    gl_FragColor = vec4(spawnPosition(uv), 1.0);
    return;
  }

  float dt = uDelta * uSpeed * (1.0 + SCROLL_SPEED_BOOST * uScrollVel);
  vec3 p = position.xyz;
  float angle = swirlAngularSpeed(p, uSwirl * (1.0 + SCROLL_SWIRL_BOOST * uScrollVel)) * dt;
  float c = cos(angle);
  float s = sin(angle);
  // Counter-clockwise seen from +Y.
  p.xz = vec2(c * p.x - s * p.z, s * p.x + c * p.z);
  gl_FragColor = vec4(p + velocity.xyz * dt, position.w - uDelta * velocity.w);
}
