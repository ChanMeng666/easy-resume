/**
 * Shared rate limiting for the unauthenticated public career endpoints
 * (`/p/{slug}/json` and `/p/{slug}/md`).
 *
 * These have no caller identity, so we bucket by client IP (resolved via the
 * shared trusted-proxy helper). Fail-open is inherited from `enforceRateLimit` —
 * a DB error never blocks a public read.
 */

import 'server-only';
import { enforceRateLimit } from '@/server/ratelimit';
import { clientIp as resolveClientIp } from '@/server/http/clientIp';

const PUBLIC_READ_LIMIT = 60;
const PUBLIC_READ_WINDOW_SECONDS = 60;

/** Real client IP behind the trusted proxy chain, else a stable fallback. */
export function clientIp(request: Request): string {
  return resolveClientIp(request);
}

/**
 * Enforce the per-IP public read limit. Throws RateLimitedError (429) when
 * exceeded; fails open on infrastructure error (see enforceRateLimit).
 */
export async function enforcePublicReadLimit(request: Request): Promise<void> {
  await enforceRateLimit(`pub:${clientIp(request)}`, PUBLIC_READ_LIMIT, PUBLIC_READ_WINDOW_SECONDS);
}
