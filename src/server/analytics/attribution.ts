/**
 * Channel-attribution capture (server-side, first-party cookie).
 *
 * `middleware.ts` persists inbound UTM / `ref` query params into a first-party
 * `vitex_attr` cookie on the visitor's first touch. This module reads that
 * cookie back (owner-only, server-side) so the signup emit can record where a
 * new user came from — no third-party analytics, no client JS.
 *
 * Reads are best-effort: outside a request context (e.g. a background job) or on
 * a malformed cookie, `readAttribution()` returns undefined rather than throwing.
 */

import 'server-only';
import { cookies } from 'next/headers';

/** First-party cookie name that carries captured attribution (see middleware.ts). */
export const ATTRIBUTION_COOKIE = 'vitex_attr';

/** The attribution params we capture. Kept small and allowlisted. */
export const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

/** Max stored length per attribution value (defensive bound). */
const MAX_VALUE_LEN = 200;

/**
 * Project an untrusted parsed object down to the allowlisted attribution keys,
 * coercing to trimmed, length-bounded strings. Returns undefined when nothing
 * usable is present. Shared by the middleware (capture) and the reader below.
 */
export function sanitizeAttribution(raw: unknown): Attribution | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim().slice(0, MAX_VALUE_LEN);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Read the captured attribution from the first-party cookie, or undefined if
 * absent/malformed/outside a request context. Best-effort — never throws.
 */
export async function readAttribution(): Promise<Attribution | undefined> {
  try {
    const store = await cookies();
    const raw = store.get(ATTRIBUTION_COOKIE)?.value;
    if (!raw) return undefined;
    return sanitizeAttribution(JSON.parse(raw));
  } catch {
    return undefined;
  }
}
