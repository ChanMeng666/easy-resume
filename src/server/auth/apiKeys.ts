/**
 * API key minting and verification.
 *
 * Tokens look like `vitex_<prefix>_<secret>`. We store only `sha256(secret)`;
 * the raw token is returned exactly once, at creation. Verification looks the
 * key up by `prefix`, then does a constant-time hash comparison.
 *
 * This is the credential that lets AI agents operate the product without a
 * browser, cookie, 2FA, or CAPTCHA — "the API is the UI".
 */

import 'server-only';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { apiKeys, type ApiKey } from '@/lib/db/schema';

const TOKEN_NS = 'vitex';

/** Hex SHA-256 of a secret. */
function sha256Hex(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export interface MintedKey {
  id: string;
  /** The full token — shown to the user once and never recoverable. */
  token: string;
  prefix: string;
  name: string;
}

/** Create a new API key for a user. Returns the raw token once. */
export async function mintApiKey(userId: string, name = 'default'): Promise<MintedKey> {
  const prefix = `${TOKEN_NS}_${randomBytes(4).toString('hex')}`; // e.g. vitex_ab12cd34
  const secret = randomBytes(24).toString('base64url');
  const token = `${prefix}_${secret}`;

  const [row] = await db
    .insert(apiKeys)
    .values({ userId, name, prefix, keyHash: sha256Hex(secret) })
    .returning();

  return { id: row.id, token, prefix, name };
}

/**
 * Verify a presented token and return the owning key record, or null.
 * Rejects revoked keys. Updates `lastUsedAt` opportunistically.
 */
export async function verifyApiKey(token: string): Promise<ApiKey | null> {
  // Expected shape: vitex_<prefix4hex>_<secret>
  const parts = token.split('_');
  if (parts.length !== 3 || parts[0] !== TOKEN_NS) return null;
  const prefix = `${parts[0]}_${parts[1]}`;
  const secret = parts[2];
  if (!secret) return null;

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.prefix, prefix), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) return null;

  const presented = Buffer.from(sha256Hex(secret), 'hex');
  const stored = Buffer.from(row.keyHash, 'hex');
  if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) {
    return null;
  }

  // Fire-and-forget last-used update; never block auth on it.
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {});

  return row;
}

/** List a user's non-secret key metadata. */
export async function listApiKeys(userId: string) {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));
  return rows;
}

/** Revoke a key the caller owns. Returns true if a key was revoked. */
export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .returning({ id: apiKeys.id });
  return Boolean(row);
}
