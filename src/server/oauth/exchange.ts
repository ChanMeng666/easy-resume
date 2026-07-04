/**
 * Token-endpoint orchestration (pure, dependency-injected).
 *
 * This is the security core of the `authorization_code` grant, extracted from the
 * HTTP route so every branch is unit-testable with fakes. It consumes the code
 * FIRST (single-use anti-replay), then binds it: the presented `client_id` and
 * `redirect_uri` must match the values captured at authorize time, and PKCE must
 * verify. Only then is exactly one API key minted — the access token IS a
 * first-class vitex key, labeled `MCP: <client name>`.
 */

import type { OAuthClient, OAuthCode } from '@/lib/db/schema';
import { OAUTH_SCOPE } from './config';

/** Injected collaborators — real impls in the route, fakes in tests. */
export interface ExchangeDeps {
  consumeAuthCode(rawCode: string): Promise<OAuthCode | null>;
  getClient(clientId: string): Promise<OAuthClient | null>;
  verifyChallenge(verifier: string, challenge: string): boolean;
  mintApiKey(userId: string, name: string): Promise<{ token: string }>;
}

/** Parsed token-request parameters (from form-encoded or JSON body). */
export interface ExchangeParams {
  grantType?: string;
  code?: string;
  redirectUri?: string;
  clientId?: string;
  codeVerifier?: string;
}

export type ExchangeResult =
  | { ok: true; accessToken: string; scope: string }
  | { ok: false; status: number; error: string; description: string };

function fail(status: number, error: string, description: string): ExchangeResult {
  return { ok: false, status, error, description };
}

/**
 * Run the authorization_code → access_token exchange. Returns a discriminated
 * result the route renders as either a `{ access_token, token_type, scope }`
 * success (Bearer, no refresh token, no expiry) or an RFC 6749 error.
 */
export async function exchangeCode(
  deps: ExchangeDeps,
  params: ExchangeParams
): Promise<ExchangeResult> {
  if (params.grantType !== 'authorization_code') {
    return fail(400, 'unsupported_grant_type', 'Only authorization_code is supported');
  }
  if (!params.code || !params.redirectUri || !params.clientId || !params.codeVerifier) {
    return fail(
      400,
      'invalid_request',
      'code, redirect_uri, client_id, and code_verifier are required'
    );
  }

  // Single-use consume FIRST: a replay or race resolves to null here.
  const row = await deps.consumeAuthCode(params.code);
  if (!row) {
    return fail(400, 'invalid_grant', 'Authorization code is invalid, expired, or already used');
  }

  // Bind the code to the presenting client and the exact redirect_uri it was
  // issued for, then prove possession of the PKCE verifier.
  if (row.clientId !== params.clientId) {
    return fail(400, 'invalid_grant', 'client_id does not match the authorization code');
  }
  if (row.redirectUri !== params.redirectUri) {
    return fail(400, 'invalid_grant', 'redirect_uri does not match the authorization code');
  }
  if (!deps.verifyChallenge(params.codeVerifier, row.codeChallenge)) {
    return fail(400, 'invalid_grant', 'PKCE verification failed');
  }

  // Mint exactly one key for the code's user. Label it by client for the user's
  // dashboard (where revocation lives). getClient may return null if the client
  // row was deleted between authorize and token — fall back to the id.
  const client = await deps.getClient(row.clientId);
  const label = `MCP: ${client?.clientName ?? row.clientId}`;
  const minted = await deps.mintApiKey(row.userId, label);

  return { ok: true, accessToken: minted.token, scope: row.scope ?? OAUTH_SCOPE };
}
