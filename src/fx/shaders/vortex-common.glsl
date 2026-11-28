// Shared by both vortex simulation passes (P1.FX.08, tech.md §7.3). A chunk, not a full shader:
// simulation.ts prepends it to vortex-velocity.glsl and vortex-position.glsl.
//
// Both passes read the same previous state, so they must agree on which particles respawn this
// step and where. needsRespawn() and spawnPosition() are deterministic in (texel, time, state), so
// the velocity pass and the position pass compute the same answer independently.
//
// Texel layout: texturePosition = (xyz position, w life 1 → 0),
//               textureVelocity = (xyz velocity, w life rate = 1 / lifespan in seconds).
// Defines: SPAWN_INNER, OUTER_RADIUS, THICKNESS, ESCAPE_RADIUS, SWIRL_SPEED, SWIRL_MAX,
//          SWIRL_MIN_RADIUS (floats, from VORTEX in simulation.ts; seeding uses the same values).
// Uniforms: uDelta (seconds of real time this step), uTime (loop time, seconds).

uniform float uDelta;
uniform float uTime;

const float TAU = 6.28318530718;

// Hash without sine (Dave Hoskins, MIT): stable across GPUs, unlike fract(sin(x)).
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yxx) * p3.zyx);
}

// A particle respawns when its life runs out or a force (the mouse field) threw it far away.
bool needsRespawn(vec4 position, float lifeRate) {
  return position.w - uDelta * lifeRate <= 0.0 ||
    dot(position.xyz, position.xyz) > ESCAPE_RADIUS * ESCAPE_RADIUS;
}

// A random point on the outer band of the disk: new particles enter at the rim and are pulled
// inwards, which keeps the density even instead of piling up where they were born.
vec3 spawnPosition(vec2 uv) {
  vec3 h = hash33(vec3(uv * resolution, uTime * 61.7));
  float angle = h.x * TAU;
  float radius = mix(SPAWN_INNER, OUTER_RADIUS, h.y);
  return vec3(cos(angle) * radius, (h.z - 0.5) * THICKNESS, sin(angle) * radius);
}

// Angular speed of the swirl around the Y axis (rad/s): tangential speed SWIRL_SPEED / r, capped
// at SWIRL_MAX so the core does not spin out. `swirl` scales it (state uSwirl, scroll).
//
// The swirl is applied to positions as an exact rotation, not through the velocity texture: a
// steered velocity lags behind a turning tangent, and that lag throws particles outwards and
// empties the core. Same function as swirlAngularSpeed() in simulation.ts.
float swirlAngularSpeed(vec3 p, float swirl) {
  float r = max(length(p.xz), SWIRL_MIN_RADIUS);
  return min(SWIRL_SPEED / r, SWIRL_MAX) / r * swirl;
}
