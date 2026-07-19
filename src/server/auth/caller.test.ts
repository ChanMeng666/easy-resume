import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * getCaller resolves either a Bearer API key or a Stack cookie session into a
 * Caller. These tests pin the security invariant that anonymous/restricted
 * Stack sessions must NEVER become a Caller (billing + the free-credit grant
 * key on Caller.userId), faking both the Stack app and verifyApiKey (no DB).
 */

const getUser = vi.fn();
vi.mock('@/lib/auth/stack', () => ({
  stackServerApp: { getUser: (...a: unknown[]) => getUser(...a) },
}));

const verifyApiKey = vi.fn();
vi.mock('@/server/auth/apiKeys', () => ({
  verifyApiKey: (...a: unknown[]) => verifyApiKey(...a),
}));

const { getCaller } = await import('./caller');

/** Build a minimal fake Stack user with the auth-state flags getCaller checks. */
function fakeUser(overrides: { isAnonymous?: boolean; isRestricted?: boolean; id?: string } = {}) {
  return {
    id: 'user_1',
    isAnonymous: false,
    isRestricted: false,
    ...overrides,
  };
}

describe('getCaller (cookie session)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves a real (non-anonymous, non-restricted) session to a Caller', async () => {
    getUser.mockResolvedValue(fakeUser({ id: 'user_real' }));

    const caller = await getCaller(new Request('https://x/api/generate'));

    expect(caller).toEqual({ userId: 'user_real', via: 'session' });
  });

  it('rejects an anonymous session (isAnonymous:true → unauthenticated)', async () => {
    getUser.mockResolvedValue(fakeUser({ isAnonymous: true }));

    const caller = await getCaller(new Request('https://x/api/generate'));

    expect(caller).toBeNull();
  });

  it('rejects a restricted session (isRestricted:true → unauthenticated)', async () => {
    getUser.mockResolvedValue(fakeUser({ isRestricted: true }));

    const caller = await getCaller(new Request('https://x/api/generate'));

    expect(caller).toBeNull();
  });

  it('returns null when there is no session', async () => {
    getUser.mockResolvedValue(null);

    const caller = await getCaller(new Request('https://x/api/generate'));

    expect(caller).toBeNull();
  });

  it('does not consult the Stack session on the Bearer API-key path', async () => {
    verifyApiKey.mockResolvedValue({ id: 'key_1', userId: 'user_key' });

    const caller = await getCaller(
      new Request('https://x/api/v1/resumes', {
        headers: { authorization: 'Bearer vitex_test_placeholder-not-a-key' },
      }),
    );

    expect(caller).toEqual({ userId: 'user_key', via: 'api_key', apiKeyId: 'key_1' });
    expect(getUser).not.toHaveBeenCalled();
  });
});
