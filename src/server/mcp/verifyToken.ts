/**
 * MCP bearer-token verifier.
 *
 * The hosted MCP endpoint (`/api/mcp`) is an OAuth 2.1 protected resource. The
 * access token an MCP connector presents is a minted Vitex API key (PR1's OAuth
 * AS returns exactly that). So verification does ZERO new auth work: it delegates
 * to the existing `verifyApiKey` and adapts the result into the `AuthInfo` shape
 * `mcp-handler`'s `withMcpAuth` expects.
 *
 * `withMcpAuth` calls this with the parsed bearer token; returning `undefined`
 * (no/invalid token) makes it answer 401 with a `WWW-Authenticate` header that
 * points the client at the protected-resource metadata → the PR1 AS.
 */

import 'server-only';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { verifyApiKey } from '@/server/auth/apiKeys';
import { OAUTH_SCOPE } from '@/server/oauth/config';

/**
 * The userId a downstream MCP tool reads from its auth context. Stashed on
 * `AuthInfo.extra` (the SDK propagates `extra` to every tool call's
 * `RequestHandlerExtra.authInfo`), so a tool can rebuild the exact same `Caller`
 * the v1 REST routes resolve — same owner scoping, billing, and idempotency.
 */
export interface McpAuthExtra extends Record<string, unknown> {
  userId: string;
  apiKeyId: string;
}

/**
 * Verify a presented bearer token → `AuthInfo`, or `undefined` when absent or
 * invalid (revoked / malformed / unknown). Never throws for a bad token — an
 * `undefined` return is the lib's contract for "unauthenticated".
 */
export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const key = await verifyApiKey(bearerToken);
  if (!key) return undefined;

  const extra: McpAuthExtra = { userId: key.userId, apiKeyId: key.id };
  return {
    token: bearerToken,
    clientId: key.userId,
    scopes: [OAUTH_SCOPE],
    extra,
  };
}
