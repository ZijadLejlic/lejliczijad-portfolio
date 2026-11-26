// GET /api/health contract (tech.md §9.6): `{ ok: true, version }` and nothing else, never cached.
// Used by the deploy smoke test (P1.ENV.14) and uptime monitoring (P1.LAUNCH.05).
export function healthResponse(version: string): Response {
  return new Response(JSON.stringify({ ok: true, version }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
