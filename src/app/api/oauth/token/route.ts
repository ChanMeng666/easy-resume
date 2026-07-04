/**
 * Token endpoint — POST /api/oauth/token.
 *
 * Exchanges an authorization_code for an access token. The access token IS a
 * freshly minted first-class vitex API key (raw shown once) — there is no refresh
 * token and no `expires_in` (long-lived; revocation is dashboard key deletion).
 * All logic lives in the pure `exchangeCode` helper; this route only parses the
 * request, wires real deps, and renders the spec-shaped response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { consumeAuthCode, getClient } from '@/server/oauth/store';
import { verifyChallenge } from '@/server/oauth/pkce';
import { exchangeCode, type ExchangeParams } from '@/server/oauth/exchange';
import { oauthError, NO_STORE_HEADERS } from '@/server/oauth/errors';
import { clientIp, oauthRateLimit } from '@/server/oauth/http';
import { mintApiKey } from '@/server/auth/apiKeys';

export const runtime = 'nodejs';

const TOKEN_LIMIT = 20;
const TOKEN_WINDOW_SECONDS = 60;

/** Read token params from a form-encoded body, falling back to JSON defensively. */
async function readParams(request: NextRequest): Promise<ExchangeParams> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      grantType: str(body.grant_type),
      code: str(body.code),
      redirectUri: str(body.redirect_uri),
      clientId: str(body.client_id),
      codeVerifier: str(body.code_verifier),
    };
  }
  const form = await request.formData();
  return {
    grantType: str(form.get('grant_type')),
    code: str(form.get('code')),
    redirectUri: str(form.get('redirect_uri')),
    clientId: str(form.get('client_id')),
    codeVerifier: str(form.get('code_verifier')),
  };
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function POST(request: NextRequest) {
  const limited = await oauthRateLimit(`oauthtoken:${clientIp(request)}`, TOKEN_LIMIT, TOKEN_WINDOW_SECONDS);
  if (limited) return limited;

  let params: ExchangeParams;
  try {
    params = await readParams(request);
  } catch {
    return oauthError(400, 'invalid_request', 'Malformed token request body');
  }

  const result = await exchangeCode(
    { consumeAuthCode, getClient, verifyChallenge, mintApiKey },
    params
  );

  if (!result.ok) {
    return oauthError(result.status, result.error, result.description);
  }

  // The raw key is deliberately NEVER logged.
  return NextResponse.json(
    {
      access_token: result.accessToken,
      token_type: 'Bearer',
      scope: result.scope,
    },
    { status: 200, headers: NO_STORE_HEADERS }
  );
}
