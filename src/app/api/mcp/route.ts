/**
 * Hosted remote MCP endpoint — Streamable HTTP (RFC: MCP 2025-03-26).
 *
 * ChatGPT / Claude connectors POST JSON-RPC here to drive Vitex as tools. It is
 * an OAuth 2.1 protected resource: the Bearer access token is a minted Vitex API
 * key, verified by the SAME `verifyApiKey` the REST API uses (via `verifyMcpToken`).
 * A 401 carries a `WWW-Authenticate` header pointing at
 * `/.well-known/oauth-protected-resource`, which points at PR1's Authorization
 * Server — so a connector can complete the OAuth dance and obtain a key.
 *
 * The 9 tools run IN-PROCESS against the backend core (see `tools.ts`), so
 * billing / idempotency / concurrency are identical to the v1 REST routes. This
 * is the hosted twin of the stdio `vitex mcp` CLI.
 *
 * Stateless JSON mode: `mcp-handler` builds a fresh `WebStandardStreamableHTTPServerTransport`
 * per request with `sessionIdGenerator: undefined` — no session store, no Redis.
 * `basePath: '/api'` makes the handler match this route's `/api/mcp` pathname.
 */

import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { registerVitexTools } from '@/server/mcp/tools';
import { verifyMcpToken } from '@/server/mcp/verifyToken';

export const runtime = 'nodejs';
// The tools block-poll a job for up to ~90s; give the handler headroom.
export const maxDuration = 120;

const handler = createMcpHandler(
  (server) => {
    registerVitexTools(server);
  },
  { serverInfo: { name: 'vitex', version: '0.2.0' } },
  { basePath: '/api', maxDuration: 120 }
);

// `required: true` → an unauthenticated request gets 401 + WWW-Authenticate
// (resource_metadata link), never anonymous tool access.
const authHandler = withMcpAuth(handler, verifyMcpToken, { required: true });

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
