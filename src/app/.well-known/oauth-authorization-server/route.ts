/**
 * OAuth 2.1 Authorization Server Metadata (RFC 8414).
 *
 * Public discovery document MCP connectors fetch to learn our endpoints. Served
 * with permissive CORS (it's public, non-secret metadata) so a browser-based
 * client can read it cross-origin.
 */

import { NextResponse } from 'next/server';
import { getBaseUrl, OAUTH_SCOPE } from '@/server/oauth/config';

export const runtime = 'nodejs';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function GET() {
  const base = getBaseUrl();
  const metadata = {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [OAUTH_SCOPE],
  };
  return NextResponse.json(metadata, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
