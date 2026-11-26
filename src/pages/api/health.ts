import type { APIRoute } from 'astro';

import { healthResponse } from '@/server/health';

// Rendered by the Worker on every request, unlike the rest of the site (tech.md §4).
export const prerender = false;

export const GET: APIRoute = () => healthResponse(__APP_VERSION__);
