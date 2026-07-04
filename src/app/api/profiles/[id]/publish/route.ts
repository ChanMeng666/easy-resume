/**
 * Publish / unpublish a candidate profile at its public career endpoint.
 *
 *   POST   /api/profiles/{id}/publish  -> 200 { slug, url, publishedAt }
 *   DELETE /api/profiles/{id}/publish  -> 200 { unpublished: true }
 *
 * Opt-in per profile. Publishing exposes an ALLOWLIST projection (never contact
 * PII or raw free text) at `/p/{slug}`; unpublishing closes the visibility gate
 * but keeps the slug so republishing restores the same URL. Owner-scoped via the
 * store: a non-owner (or missing) profile surfaces as NotFound, never Forbidden.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { publishProfile, unpublishProfile } from '@/server/profiles/store';
import { UnauthenticatedError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Toggling visibility is cheap, but reuse the profile-write limit/key so a caller
// can't hammer the toggle endpoint (mirrors the other profile mutation routes).
const PROFILE_WRITE_LIMIT = 20;
const PROFILE_WRITE_WINDOW_SECONDS = 60;

/** Best-effort absolute origin from proxy-forwarded headers (nginx sets these). */
function requestOrigin(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `profilewrite:${caller.userId}`,
      PROFILE_WRITE_LIMIT,
      PROFILE_WRITE_WINDOW_SECONDS
    );

    const { id } = await params;
    const { slug, publishedAt } = await publishProfile(caller.userId, id);
    const url = `${requestOrigin(request)}/p/${slug}`;

    return NextResponse.json(
      { slug, url, publishedAt },
      { headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `profilewrite:${caller.userId}`,
      PROFILE_WRITE_LIMIT,
      PROFILE_WRITE_WINDOW_SECONDS
    );

    const { id } = await params;
    await unpublishProfile(caller.userId, id);

    return NextResponse.json(
      { unpublished: true },
      { headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
