/**
 * API key management (cookie-session protected).
 *
 * Logged-in users mint, list, and revoke the API keys their agents use to call
 * the public v1 API. The raw token is returned exactly once on creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth/stack';
import { mintApiKey, listApiKeys, revokeApiKey } from '@/server/auth/apiKeys';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit } from '@/server/ratelimit';
import { trackEvent } from '@/server/analytics/track';

export const runtime = 'nodejs';

// Key mint/revoke are cheap but security-sensitive; cap per user to blunt
// scripted abuse. Listing (GET) is unlimited.
const KEYS_MUTATE_LIMIT = 10;
const KEYS_MUTATE_WINDOW_SECONDS = 60;

/** GET /api/keys — list the caller's API keys (metadata only, no secrets). */
export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await stackServerApp.getUser();
    if (!user) throw new UnauthenticatedError();
    return NextResponse.json({ keys: await listApiKeys(user.id) });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

/** POST /api/keys — mint a new API key. Returns the raw token once. */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const user = await stackServerApp.getUser();
    if (!user) throw new UnauthenticatedError();
    await enforceRateLimit(`keys:${user.id}`, KEYS_MUTATE_LIMIT, KEYS_MUTATE_WINDOW_SECONDS);

    let name = 'default';
    try {
      const body = await request.json();
      if (body?.name != null) {
        if (typeof body.name !== 'string' || body.name.length > 120) {
          throw new ValidationError('name must be a string up to 120 chars');
        }
        name = body.name;
      }
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      // Empty/invalid body is fine — use the default name.
    }

    const minted = await mintApiKey(user.id, name);
    // Funnel telemetry (best-effort): minting a key signals agent-channel adoption.
    await trackEvent({ userId: user.id, event: 'api_key_created', props: {} });
    return NextResponse.json(minted, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

/** DELETE /api/keys?id=<keyId> — revoke a key the caller owns. */
export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const user = await stackServerApp.getUser();
    if (!user) throw new UnauthenticatedError();
    await enforceRateLimit(`keys:${user.id}`, KEYS_MUTATE_LIMIT, KEYS_MUTATE_WINDOW_SECONDS);

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new ValidationError('query param "id" is required');

    const revoked = await revokeApiKey(user.id, id);
    return NextResponse.json({ revoked });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
