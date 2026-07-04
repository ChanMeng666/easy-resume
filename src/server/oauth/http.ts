/**
 * Small HTTP helpers shared by the OAuth routes.
 *
 * Rate limiting reuses the Postgres fixed-window limiter but renders an
 * OAuth-shaped 429 (not the AppError envelope), and keeps the limiter's fail-open
 * behavior: on a DB error the request is allowed rather than blocked.
 */

import type { NextResponse } from 'next/server';
import { checkRateLimit } from '@/server/ratelimit';
import { oauthError } from './errors';

/**
 * Best-effort client IP for per-IP rate-limit keys. Behind Traefik the real
 * client is the first `X-Forwarded-For` hop; falls back to `X-Real-IP`.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
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
