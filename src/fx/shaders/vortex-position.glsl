// Vortex position pass (P1.FX.08, tech.md §7.3). GPUComputationRenderer variable
// `texturePosition`; one texel = one particle. Runs with vortex-common.glsl prepended. Samplers
// texturePosition and textureVelocity (previous step) are declared by GPUComputationRenderer.
//
// Turns each particle around the Y axis by the swirl (an exact rotation, so it keeps its radius),
// moves it by its drift velocity and ages it; a particle whose life ran out (or that left the
// scene) restarts on the rim with full life. Life ages in real time (uDelta), not scaled time, so
// a fast transition (uSpeed 3) does not burn through lifespans.
//
// Uniforms: uSpeed (time scale), uSwirl (FX state), uScrollVel (scroll → extra swirl);
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

  float dt = uDelta * uSpeed;
  vec3 p = position.xyz;
  float angle = swirlAngularSpeed(p, uSwirl * (1.0 + uScrollVel)) * dt;
  float c = cos(angle);
  float s = sin(angle);
  // Counter-clockwise seen from +Y.
  p.xz = vec2(c * p.x - s * p.z, s * p.x + c * p.z);
  gl_FragColor = vec4(p + velocity.xyz * dt, position.w - uDelta * velocity.w);
}
