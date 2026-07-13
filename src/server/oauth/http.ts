/**
 * Small HTTP helpers shared by the OAuth routes.
 *
 * Rate limiting reuses the Postgres fixed-window limiter but renders an
 * OAuth-shaped 429 (not the AppError envelope), and keeps the limiter's fail-open
 * behavior: on a DB error the request is allowed rather than blocked.
 */

import type { NextResponse } from 'next/server';
import { checkRateLimit } from '@/server/ratelimit';
import { clientIp as resolveClientIp } from '@/server/http/clientIp';
import { oauthError } from './errors';

/**
 * Best-effort client IP for per-IP rate-limit keys. Delegates to the shared
 * trusted-proxy helper (Cloudflare -> Traefik) so the OAuth routes bucket by the
 * same real client address as every other per-IP limit.
 */
export function clientIp(req: Request): string {
  return resolveClientIp(req);
}

/**
 * Enforce a fixed-window limit, returning an OAuth-shaped 429 when exceeded or
 * null when the request may proceed. Fail-open (checkRateLimit swallows DB errors
 * and returns allowed).
 */
export async function oauthRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const result = await checkRateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    return oauthError(429, 'temporarily_unavailable', 'Too many requests, retry later');
  }
  return null;
}
