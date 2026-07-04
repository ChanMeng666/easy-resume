/**
 * OAuth error responses.
 *
 * DELIBERATE EXCEPTION to the AppError envelope used everywhere else in this
 * backend: OAuth clients (the ChatGPT / Claude MCP connectors) expect the RFC 6749
 * §5.2 shape `{ error, error_description }`, NOT our machine-readable
 * `{ error: { code, ... } }` envelope. These endpoints therefore render errors in
 * spec form. Token/register/error responses also carry `Cache-Control: no-store`
 * (RFC 6749 §5.1) so a raw code or key can never be cached by an intermediary.
 */

import { NextResponse } from 'next/server';

/** Response headers that forbid caching of sensitive OAuth payloads. */
export const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

/**
 * Build an RFC 6749 §5.2 error response. `error` is a spec error code
 * (e.g. `invalid_grant`, `invalid_request`, `invalid_client_metadata`);
 * `description` is optional human-readable detail.
 */
export function oauthError(status: number, error: string, description?: string): NextResponse {
  const body = description ? { error, error_description: description } : { error };
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}
