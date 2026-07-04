/**
 * OAuth client + authorization-code persistence.
 *
 * Clients are created via open Dynamic Client Registration; codes are single-use,
 * hashed (only sha256(rawCode) is stored), PKCE-bound, and expire in ~60s.
 * `consumeAuthCode` is the anti-replay heart of the flow: a single atomic
 * conditional UPDATE flips `consumed_at` and RETURNs the row, so two concurrent
 * redemptions of the same code can never both succeed.
 */

import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { oauthClients, oauthCodes, type OAuthClient, type OAuthCode } from '@/lib/db/schema';

/** Authorization codes live briefly — just long enough for the client round-trip. */
const CODE_TTL_SECONDS = 60;

/** Hex SHA-256 (same construction as api_keys — only the hash is ever stored). */
function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Register a new public client. Generates an opaque `client_id`
 * (`dcr_<24 hex>`), persists the exact registered redirect_uris, and pins the
 * client to the public/PKCE profile (auth method `none`, grant
 * `authorization_code`). Callers MUST validate redirect_uris first.
 */
export async function registerClient(input: {
  clientName?: string | null;
  redirectUris: string[];
}): Promise<OAuthClient> {
  const clientId = `dcr_${randomBytes(12).toString('hex')}`; // 24 hex chars
  const [row] = await db
    .insert(oauthClients)
    .values({
      clientId,
      clientName: input.clientName ?? null,
      redirectUris: input.redirectUris,
      tokenEndpointAuthMethod: 'none',
      grantTypes: ['authorization_code'],
    })
    .returning();
  return row;
}

/** Look up a registered client by id, or null when unknown. */
export async function getClient(clientId: string): Promise<OAuthClient | null> {
  if (!clientId) return null;
  const [row] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);
  return row ?? null;
}

/**
 * Mint an authorization code for a consented (client, user) pair. Returns the RAW
 * code (shown once, carried in the authorize redirect); only sha256(raw) is
 * stored. Opportunistically sweeps expired codes so the table can't grow
 * unbounded (fire-and-forget; never blocks the mint).
 */
export async function createAuthCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string | null;
}): Promise<string> {
  const rawCode = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  await db.insert(oauthCodes).values({
    codeHash: sha256Hex(rawCode),
    clientId: input.clientId,
    userId: input.userId,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    scope: input.scope ?? null,
    expiresAt,
  });

  // Best-effort GC of expired codes; never block the request on it.
  void db
    .delete(oauthCodes)
    .where(lt(oauthCodes.expiresAt, new Date()))
    .catch(() => {});

  return rawCode;
}

/**
 * Atomically consume an authorization code exactly once. Returns the code row on
 * the first, valid redemption; null when the code is unknown, already consumed,
 * or expired. Single use is enforced by the `consumed_at IS NULL` guard inside a
 * conditional UPDATE ... RETURNING, so replays and concurrent redemptions of the
 * same code resolve to null.
 */
export async function consumeAuthCode(rawCode: string): Promise<OAuthCode | null> {
  if (!rawCode) return null;
  const now = new Date();
  const [row] = await db
    .update(oauthCodes)
    .set({ consumedAt: now })
    .where(
      and(
        eq(oauthCodes.codeHash, sha256Hex(rawCode)),
        isNull(oauthCodes.consumedAt),
        gt(oauthCodes.expiresAt, now)
      )
    )
    .returning();
  return row ?? null;
}
