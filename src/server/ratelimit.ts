/**
 * Rate limiting on Neon Postgres.
 *
 * Generation costs real LLM tokens, and the public API is reachable with an API
 * key, so an abusive caller could burn money fast. This enforces a fixed window
 * per caller using one atomic upsert against a counter table.
 *
 * Why Postgres and not Redis: the DB is already a dependency and is always-on,
 * so it can't be idle-deleted the way a free-tier Redis was — one fewer moving
 * part, no extra secrets.
 *
 * Fail-open by design: if the DB call errors we allow the request rather than
 * block legitimate traffic — availability beats perfect enforcement.
 */

import 'server-only';
import { sql, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { rateLimits } from '@/lib/db/schema';
import { RateLimitedError } from '@/server/errors/AppError';
import { createLogger } from '@/server/log/logger';

const log = createLogger({ module: 'ratelimit' });

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

/**
 * Fixed-window rate limit. Returns the decision; does not throw.
 *
 * @param key    caller identity (e.g. `gen:user:<id>`)
 * @param limit  max requests allowed within the window
 * @param windowSeconds window length
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const nowSeconds = Date.now() / 1000;
  const bucket = Math.floor(nowSeconds / windowSeconds);
  // Seconds until the current fixed window rolls over — used for Retry-After.
  const resetSeconds = Math.max(1, Math.ceil((bucket + 1) * windowSeconds - nowSeconds));
  const bucketKey = `${key}:${bucket}`;
  const expiresAt = new Date((bucket + 1) * windowSeconds * 1000);

  try {
    // Atomic increment-or-create; RETURNING gives the post-increment count.
    const [row] = await db
      .insert(rateLimits)
      .values({ bucketKey, count: 1, expiresAt })
      .onConflictDoUpdate({
        target: rateLimits.bucketKey,
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning({ count: rateLimits.count });

    const count = row?.count ?? 1;

    // Opportunistic GC: once per new bucket, sweep expired rows so the table
    // can't grow unbounded. Fire-and-forget; never blocks the request.
    if (count === 1) {
      void db
        .delete(rateLimits)
        .where(lt(rateLimits.expiresAt, new Date()))
        .catch(() => {});
    }

    const remaining = Math.max(0, limit - count);
    return { allowed: count <= limit, remaining, limit, resetSeconds };
  } catch (err) {
    // Fail open — never block on infrastructure errors.
    log.warn('ratelimit.error_fail_open', { key }, err);
    return { allowed: true, remaining: limit, limit, resetSeconds };
  }
}

/** Build standard X-RateLimit-* headers from a result (for success responses). */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetSeconds),
  };
}

/**
 * Enforce a rate limit. Returns the result on success (so callers can attach
 * X-RateLimit-* headers); throws RateLimitedError (429) — carrying Retry-After
 * and X-RateLimit-* headers — when exceeded.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const result = await checkRateLimit(key, limit, windowSeconds);
  if (!result.allowed) {
    throw new RateLimitedError({
      limit: result.limit,
      remaining: result.remaining,
      resetSeconds: result.resetSeconds,
      message: `Rate limit exceeded: max ${limit} requests per ${windowSeconds}s`,
    });
  }
  return result;
}
