/**
 * Public v1 API — identity & balance probe.
 *
 * A cheap, read-only "who am I" endpoint for agents (and the vitex-cli `whoami`
 * command): validate an API key, learn the caller's user id, how they
 * authenticated, and their current credit balance/tier in one round trip —
 * without creating a job or spending any credits.
 *
 *   GET /api/v1/me
 *   Authorization: Bearer vitex_<prefix>_<secret>   (or a web cookie session)
 *   -> 200 { userId, via, credits, tier }
 *
 * "The API is the UI": the balance shown here is the exact same record the
 * dashboard reads (`creditService.getOrCreate`). This endpoint never charges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { creditService } from '@/lib/services/creditService';
import { UnauthenticatedError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Light per-user cap — this is a cheap identity probe, not a spend path.
const ME_LIMIT = 60;
const ME_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(`me:${caller.userId}`, ME_LIMIT, ME_WINDOW_SECONDS);

    // Read-only: `getOrCreate` is the same balance path the dashboard and
    // `/api/credits` use. It lazily initializes a new user's credit row (with
    // the signup bonus) exactly as those surfaces do — it never charges.
    const record = await creditService.getOrCreate(caller.userId);

    return NextResponse.json(
      {
        userId: caller.userId,
        via: caller.via,
        credits: record.balance,
        tier: record.subscriptionTier ?? 'free',
      },
      { headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
