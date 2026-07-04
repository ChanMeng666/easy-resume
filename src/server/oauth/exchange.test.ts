import { describe, it, expect, vi } from 'vitest';
import { exchangeCode, type ExchangeDeps, type ExchangeParams } from './exchange';
import type { OAuthClient, OAuthCode } from '@/lib/db/schema';

/** A stored code row as consumeAuthCode would return it. */
function codeRow(overrides: Partial<OAuthCode> = {}): OAuthCode {
  return {
    codeHash: 'h',
    clientId: 'dcr_abc',
    userId: 'u1',
    redirectUri: 'https://app/cb',
    codeChallenge: 'CHAL',
    scope: 'vitex',
    consumedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  } as OAuthCode;
}

function client(overrides: Partial<OAuthClient> = {}): OAuthClient {
  return {
    clientId: 'dcr_abc',
    clientName: 'ChatGPT',
    redirectUris: ['https://app/cb'],
    tokenEndpointAuthMethod: 'none',
    grantTypes: ['authorization_code'],
    createdAt: new Date(),
    ...overrides,
  } as OAuthClient;
}

const VALID_PARAMS: ExchangeParams = {
  grantType: 'authorization_code',
  code: 'rawcode',
  redirectUri: 'https://app/cb',
  clientId: 'dcr_abc',
  codeVerifier: 'verifier',
};

/** Build deps with sensible passing defaults; override per test. */
function makeDeps(overrides: Partial<ExchangeDeps> = {}): ExchangeDeps {
  return {
    consumeAuthCode: vi.fn(async () => codeRow()),
    getClient: vi.fn(async () => client()),
    verifyChallenge: vi.fn(() => true),
    mintApiKey: vi.fn(async () => ({ token: 'vitex_p_secret' })),
    ...overrides,
  };
}

describe('exchangeCode — happy path', () => {
  it('mints exactly one key labeled "MCP: <client name>" and returns the scope', async () => {
    const mintApiKey = vi.fn(async () => ({ token: 'vitex_p_secret' }));
    const deps = makeDeps({ mintApiKey });

    const result = await exchangeCode(deps, VALID_PARAMS);

    expect(result).toEqual({ ok: true, accessToken: 'vitex_p_secret', scope: 'vitex' });
    expect(mintApiKey).toHaveBeenCalledTimes(1);
    expect(mintApiKey).toHaveBeenCalledWith('u1', 'MCP: ChatGPT');
  });

  it('falls back to the client_id in the label when the client row is gone', async () => {
    const mintApiKey = vi.fn(async () => ({ token: 'vitex_p_secret' }));
    const deps = makeDeps({ getClient: vi.fn(async () => null), mintApiKey });

    const result = await exchangeCode(deps, VALID_PARAMS);
    expect(result.ok).toBe(true);
    expect(mintApiKey).toHaveBeenCalledWith('u1', 'MCP: dcr_abc');
  });

  it('echoes a non-default stored scope', async () => {
    const deps = makeDeps({ consumeAuthCode: vi.fn(async () => codeRow({ scope: 'custom' })) });
    const result = await exchangeCode(deps, VALID_PARAMS);
    expect(result).toMatchObject({ ok: true, scope: 'custom' });
  });
});

describe('exchangeCode — error branches', () => {
  it('unsupported_grant_type for a non-authorization_code grant', async () => {
    const deps = makeDeps();
    const result = await exchangeCode(deps, { ...VALID_PARAMS, grantType: 'client_credentials' });
    expect(result).toMatchObject({ ok: false, status: 400, error: 'unsupported_grant_type' });
    expect(deps.consumeAuthCode).not.toHaveBeenCalled();
  });

  it('invalid_request when a required parameter is missing', async () => {
    const deps = makeDeps();
    for (const missing of ['code', 'redirectUri', 'clientId', 'codeVerifier'] as const) {
      const params = { ...VALID_PARAMS, [missing]: undefined };
      const result = await exchangeCode(makeDeps(), params);
      expect(result).toMatchObject({ ok: false, status: 400, error: 'invalid_request' });
    }
    expect(deps.consumeAuthCode).not.toHaveBeenCalled();
  });

  it('invalid_grant when the code cannot be consumed (unknown/expired/replayed)', async () => {
    const deps = makeDeps({ consumeAuthCode: vi.fn(async () => null) });
    const result = await exchangeCode(deps, VALID_PARAMS);
    expect(result).toMatchObject({ ok: false, status: 400, error: 'invalid_grant' });
    expect(deps.mintApiKey).not.toHaveBeenCalled();
  });

  it('invalid_grant when client_id does not match the code', async () => {
    const deps = makeDeps();
    const result = await exchangeCode(deps, { ...VALID_PARAMS, clientId: 'dcr_other' });
    expect(result).toMatchObject({ ok: false, status: 400, error: 'invalid_grant' });
    expect(deps.mintApiKey).not.toHaveBeenCalled();
  });

  it('invalid_grant when redirect_uri does not match the code', async () => {
    const deps = makeDeps();
    const result = await exchangeCode(deps, { ...VALID_PARAMS, redirectUri: 'https://app/other' });
    expect(result).toMatchObject({ ok: false, status: 400, error: 'invalid_grant' });
    expect(deps.mintApiKey).not.toHaveBeenCalled();
  });

  it('invalid_grant when PKCE verification fails — and no key is minted', async () => {
    const deps = makeDeps({ verifyChallenge: vi.fn(() => false) });
    const result = await exchangeCode(deps, VALID_PARAMS);
    expect(result).toMatchObject({ ok: false, status: 400, error: 'invalid_grant' });
    expect(deps.mintApiKey).not.toHaveBeenCalled();
  });

  it('consumes the code exactly once even when a later check fails (anti-replay)', async () => {
    const consumeAuthCode = vi.fn(async () => codeRow());
    const deps = makeDeps({ consumeAuthCode, verifyChallenge: vi.fn(() => false) });
    await exchangeCode(deps, VALID_PARAMS);
    expect(consumeAuthCode).toHaveBeenCalledTimes(1);
  });
});
