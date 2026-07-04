/**
 * Shared rate limiting for the unauthenticated public career endpoints
 * (`/p/{slug}/json` and `/p/{slug}/md`).
 *
 * These have no caller identity, so we bucket by client IP (first hop of
 * `x-forwarded-for`). Fail-open is inherited from `enforceRateLimit` — a DB
 * error never blocks a public read.
 */

import 'server-only';
import { enforceRateLimit } from '@/server/ratelimit';

const PUBLIC_READ_LIMIT = 60;
const PUBLIC_READ_WINDOW_SECONDS = 60;

/** First hop of x-forwarded-for (the real client), else a stable fallback. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Enforce the per-IP public read limit. Throws RateLimitedError (429) when
 * exceeded; fails open on infrastructure error (see enforceRateLimit).
 */
export async function enforcePublicReadLimit(request: Request): Promise<void> {
  await enforceRateLimit(`pub:${clientIp(request)}`, PUBLIC_READ_LIMIT, PUBLIC_READ_WINDOW_SECONDS);
}
