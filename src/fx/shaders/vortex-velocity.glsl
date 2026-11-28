// Vortex velocity pass (P1.FX.08, tech.md §7.3). GPUComputationRenderer variable
// `textureVelocity`; one texel = one particle. Runs with vortex-common.glsl and curl-noise.glsl
// prepended. Samplers texturePosition and textureVelocity (previous step) are declared by
// GPUComputationRenderer.
//
// The texture holds the drift on top of the swirl (the swirl itself is a rotation in the position
// pass). Forces, steered towards a desired drift (smooth, frame-rate independent):
//   inflow to the axis  +  weak pull to the torus of radius RING_RADIUS (flat disk)
//   +  curl noise  +  pull to the centre (uAttract, page transition)
// and the mouse field (repel inside uMouseRadius, P1.FX.10) as an impulse on top. Particles then
// steer back to the desired drift (RESPONSE), which gives the field its soft wake.
//
// Defines: RING_RADIUS, INFLOW, RING_PULL, HEIGHT_PULL, NOISE_SCALE, NOISE_DRIFT, NOISE_SPEED,
//          ATTRACT_PULL, RESPONSE, MOUSE_PUSH (floats).
// Uniforms: uSpeed (time scale), uNoiseAmp, uAttract, uMouseStrength (FX state),
//           uMouse (world position, particles' local space), uMouseRadius (world units),
//           uMouseAmount (0 … 1, pointer presence × motion, src/fx/vortex/mouse.ts).

uniform float uSpeed;
uniform float uNoiseAmp;
uniform float uAttract;
uniform float uMouseStrength;
uniform vec3 uMouse;
uniform float uMouseRadius;
uniform float uMouseAmount;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 position = texture2D(texturePosition, uv);
  vec4 velocity = texture2D(textureVelocity, uv);

  if (needsRespawn(position, velocity.w)) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, velocity.w);
    return;
  }

  vec3 p = position.xyz;
  float dt = uDelta * uSpeed;

  // Pull towards the closest point on the ring: flattens the cloud into a disk with a soft core.
  float r = max(length(p.xz), 1e-4);
  vec3 ring = vec3(p.x / r * RING_RADIUS, 0.0, p.z / r * RING_RADIUS);
  vec3 desired = (ring - p) * vec3(RING_PULL, HEIGHT_PULL, RING_PULL);
  desired -= vec3(p.x, 0.0, p.z) / r * INFLOW;

  desired +=
    curlNoise(p * NOISE_SCALE + vec3(0.0, uTime * NOISE_DRIFT, 0.0)) * NOISE_SPEED * uNoiseAmp;
  desired -= p * ATTRACT_PULL * uAttract;

  vec3 v = mix(velocity.xyz, desired, 1.0 - exp(-RESPONSE * dt));

  vec3 away = p - uMouse;
  float dist = length(away);
  if (dist < uMouseRadius && dist > 1e-4) {
    float falloff = 1.0 - dist / uMouseRadius;
    v += away / dist * falloff * falloff * MOUSE_PUSH * uMouseStrength * uMouseAmount * dt;
  }

  gl_FragColor = vec4(v, velocity.w);
}
