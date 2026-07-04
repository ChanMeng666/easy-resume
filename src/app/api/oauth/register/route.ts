/**
 * Dynamic Client Registration (RFC 7591) — POST /api/oauth/register.
 *
 * Open registration (no initial access token, per the AS design): any client can
 * self-register. The one hard gate is redirect_uri validation (each must be a
 * fragment-free https URI, or http on loopback). All clients are public / PKCE —
 * `token_endpoint_auth_method` is always `none`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerClient } from '@/server/oauth/store';
import { isValidRegistrationRedirectUri } from '@/server/oauth/redirect';
import { oauthError, NO_STORE_HEADERS } from '@/server/oauth/errors';
import { clientIp, oauthRateLimit } from '@/server/oauth/http';

export const runtime = 'nodejs';

const REGISTER_LIMIT = 10;
const REGISTER_WINDOW_SECONDS = 60;
const MAX_REDIRECT_URIS = 10;
const MAX_CLIENT_NAME_LEN = 255;

export async function POST(request: NextRequest) {
  const limited = await oauthRateLimit(`oauthreg:${clientIp(request)}`, REGISTER_LIMIT, REGISTER_WINDOW_SECONDS);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return oauthError(400, 'invalid_client_metadata', 'Request body must be JSON');
  }

  const meta = (body ?? {}) as Record<string, unknown>;

  const redirectUris = meta.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return oauthError(400, 'invalid_client_metadata', 'redirect_uris must be a non-empty array');
  }
  if (redirectUris.length > MAX_REDIRECT_URIS) {
    return oauthError(400, 'invalid_client_metadata', `At most ${MAX_REDIRECT_URIS} redirect_uris are allowed`);
  }
  for (const uri of redirectUris) {
    if (!isValidRegistrationRedirectUri(uri)) {
      return oauthError(
        400,
        'invalid_redirect_uri',
        'Each redirect_uri must be an https URI (or http on loopback) with no fragment'
      );
    }
  }

  let clientName: string | null = null;
  if (meta.client_name != null) {
    if (typeof meta.client_name !== 'string' || meta.client_name.length > MAX_CLIENT_NAME_LEN) {
      return oauthError(400, 'invalid_client_metadata', 'client_name must be a string up to 255 chars');
    }
    clientName = meta.client_name;
  }

  const client = await registerClient({ clientName, redirectUris: redirectUris as string[] });

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
    },
    { status: 201, headers: NO_STORE_HEADERS }
  );
}
