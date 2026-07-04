import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiKey } from '@/lib/db/schema';

/**
 * verifyMcpToken is a thin adapter over the existing verifyApiKey: a valid key
 * becomes the mcp-handler AuthInfo shape (userId on `extra`), everything else is
 * undefined ("unauthenticated"). It adds ZERO new auth logic — these tests pin
 * that adaptation and the delegation, faking verifyApiKey (no DB).
 */

const verifyApiKey = vi.fn();
vi.mock('@/server/auth/apiKeys', () => ({
  verifyApiKey: (...a: unknown[]) => verifyApiKey(...a),
}));

const { verifyMcpToken } = await import('./verifyToken');
const { OAUTH_SCOPE } = await import('@/server/oauth/config');

function fakeKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return { id: 'key_1', userId: 'user_1', ...overrides } as ApiKey;
}

describe('verifyMcpToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns AuthInfo carrying the userId for a valid minted key', async () => {
    verifyApiKey.mockResolvedValue(fakeKey({ id: 'key_abc', userId: 'user_xyz' }));

    const info = await verifyMcpToken(new Request('https://x/api/mcp'), 'vitex_ab12cd34_secret');

    expect(verifyApiKey).toHaveBeenCalledWith('vitex_ab12cd34_secret');
    expect(info).toBeDefined();
    expect(info?.clientId).toBe('user_xyz');
    expect(info?.token).toBe('vitex_ab12cd34_secret');
    expect(info?.scopes).toEqual([OAUTH_SCOPE]);
    expect(info?.extra).toEqual({ userId: 'user_xyz', apiKeyId: 'key_abc' });
  });

  it('returns undefined when no bearer token is present', async () => {
    const info = await verifyMcpToken(new Request('https://x/api/mcp'), undefined);
    expect(info).toBeUndefined();
    expect(verifyApiKey).not.toHaveBeenCalled();
  });

  it('returns undefined for a revoked / unknown / garbage token', async () => {
    verifyApiKey.mockResolvedValue(null);
    const info = await verifyMcpToken(new Request('https://x/api/mcp'), 'garbage');
    expect(info).toBeUndefined();
  });
});
