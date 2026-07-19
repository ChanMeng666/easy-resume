/**
 * Signup ("new user first appears") analytics emit.
 *
 * Kept in its own module — separate from `track.ts` — because it depends on
 * `attribution.ts` (which imports `next/headers`). Keeping that dependency out of
 * `track.ts` lets the generic `trackEvent` stay importable from anywhere
 * (persist, billing) without pulling `next/headers` into those graphs.
 *
 * Emitted exactly once per user, from the atomic credits-row creation in
 * `creditService.getOrCreate` (guarded on winning the insert), so there is no
 * separate first_seen event. Best-effort: never throws.
 */

import 'server-only';
import { readAttribution } from './attribution';
import { trackEvent } from './track';

/** Record the `signup` event for a brand-new user, folding in UTM attribution. */
export async function trackSignup(userId: string): Promise<void> {
  const attribution = await readAttribution();
  await trackEvent({
    userId,
    event: 'signup',
    props: attribution ? { attribution } : {},
  });
}
