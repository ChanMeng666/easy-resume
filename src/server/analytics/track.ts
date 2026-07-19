/**
 * Server-side product analytics — best-effort funnel telemetry.
 *
 * The single place a product event is recorded. Deliberately minimal and
 * privacy-respecting: it runs ONLY server-side (no browser SDK, no third-party
 * origin — the CSP has none) and appends one row to `analytics_events`.
 *
 * Best-effort by construction (mirrors the blob-store / persist pattern): the DB
 * write is wrapped, any error is logged via the structured logger and swallowed,
 * and the function never throws. A telemetry failure must NEVER affect the money
 * path — so callers can `await` it inside a critical path without risk, or
 * fire-and-forget with `void trackEvent(...)`.
 *
 * `props` is a small, typed bag of event-specific fields — NEVER raw resume / JD
 * text or contact PII (that stays out of analytics entirely).
 */

import 'server-only';
import { analyticsEvents } from '@/lib/db/schema';
import { createLogger } from '@/server/log/logger';

const log = createLogger({ scope: 'analytics' });

/** A single product-analytics event to record. */
export interface TrackEventInput {
  /** Owner of the event, or null/undefined for an anonymous event. */
  userId?: string | null;
  /** Event name, e.g. `generation_succeeded`, `signup`, `credit_purchase`. */
  event: string;
  /** Small, typed, non-PII bag of event-specific fields. */
  props?: Record<string, unknown>;
}

/**
 * Record a product-analytics event. Best-effort and non-throwing: DB failures
 * are logged and swallowed so the caller's path (generation, billing, signup)
 * is never affected. The DB client is imported lazily so this module stays cheap
 * to import and easy to mock in tests.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    const { db } = await import('@/lib/db/client');
    await db.insert(analyticsEvents).values({
      userId: input.userId ?? null,
      event: input.event,
      props: input.props ?? {},
    });
  } catch (err) {
    log.warn('analytics.track_failed', { event: input.event }, err);
  }
}
