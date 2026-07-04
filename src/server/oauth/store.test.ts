import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

// store.ts top-level-imports the Neon client (module body runs neon(DATABASE_URL)).
// Stub it so the store can be imported and its DB interactions faked (same pattern
// as reserveJob.test / applications store.test).
let fakeDb: Record<string, (...args: unknown[]) => unknown>;
vi.mock('@/lib/db/client', () => ({
  db: {
    insert: (...a: unknown[]) => fakeDb.insert(...a),
    select: (...a: unknown[]) => fakeDb.select(...a),
    update: (...a: unknown[]) => fakeDb.update(...a),
    delete: (...a: unknown[]) => fakeDb.delete(...a),
  },
}));

const { registerClient, createAuthCode, consumeAuthCode, getClient } = await import('./store');

function sha256Hex(v: string): string {
  return createHash('sha256').update(v).digest('hex');
}

/** db.insert(...).values(v).returning() -> rows; records v into sink. */
function captureInsertReturning(rows: unknown[], sink: { values?: Record<string, unknown> }) {
  return () => ({
    values: (v: Record<string, unknown>) => {
      sink.values = v;
      return { returning: () => Promise.resolve(rows) };
    },
  });
}
/** db.insert(...).values(v) -> Promise (no returning); records v into sink. */
function captureInsert(sink: { values?: Record<string, unknown> }) {
  return () => ({
    values: (v: Record<string, unknown>) => {
      sink.values = v;
      return Promise.resolve(undefined);
    },
  });
}
/** db.select(...).from().where().limit() -> rows */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(rows);
  return () => chain;
}
/** db.update(...).set().where().returning() -> rows */
function updateReturning(rows: unknown[]) {
  return () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve(rows) }) }) });
}
/** db.delete(...).where() -> thenable with .catch (the best-effort GC sweep) */
function deleteNoop() {
  return () => ({ where: () => Promise.resolve(undefined) });
}

beforeEach(() => vi.clearAllMocks());

describe('registerClient', () => {
  it('generates a dcr_<24 hex> client_id and pins the public/PKCE profile', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsertReturning([{ clientId: 'ignored' }], sink),
      select: selectReturning([]),
      update: updateReturning([]),
      delete: deleteNoop(),
    };
    await registerClient({ clientName: 'ChatGPT', redirectUris: ['https://x/cb'] });

    const v = sink.values!;
    expect(v.clientId).toMatch(/^dcr_[0-9a-f]{24}$/);
    expect(v.clientName).toBe('ChatGPT');
    expect(v.redirectUris).toEqual(['https://x/cb']);
    expect(v.tokenEndpointAuthMethod).toBe('none');
    expect(v.grantTypes).toEqual(['authorization_code']);
  });

  it('stores null client_name when omitted', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsertReturning([{}], sink),
      select: selectReturning([]),
      update: updateReturning([]),
      delete: deleteNoop(),
    };
    await registerClient({ redirectUris: ['https://x/cb'] });
    expect(sink.values!.clientName).toBeNull();
  });
});

describe('getClient', () => {
  it('returns the row when found, null for empty id', async () => {
    fakeDb = {
      insert: captureInsert({}),
      select: selectReturning([{ clientId: 'dcr_abc' }]),
      update: updateReturning([]),
      delete: deleteNoop(),
    };
    expect(await getClient('dcr_abc')).toEqual({ clientId: 'dcr_abc' });
    expect(await getClient('')).toBeNull();
  });
});

describe('createAuthCode', () => {
  it('returns a base64url raw code and stores ONLY its sha256 hash', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsert(sink),
      select: selectReturning([]),
      update: updateReturning([]),
      delete: deleteNoop(),
    };
    const raw = await createAuthCode({
      clientId: 'dcr_abc',
      userId: 'u1',
      redirectUri: 'https://x/cb',
      codeChallenge: 'chal',
      scope: 'vitex',
    });

    // Raw code is base64url and NOT what's stored.
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    const stored = sink.values!;
    expect(stored.codeHash).toBe(sha256Hex(raw));
    expect(stored.codeHash).not.toBe(raw);
    expect(stored.clientId).toBe('dcr_abc');
    expect(stored.userId).toBe('u1');
    expect(stored.redirectUri).toBe('https://x/cb');
    expect(stored.codeChallenge).toBe('chal');
    expect(stored.scope).toBe('vitex');
    expect(stored.expiresAt).toBeInstanceOf(Date);
  });
});

describe('consumeAuthCode — atomic single use', () => {
  it('returns the row on the first valid redemption', async () => {
    const row = { codeHash: 'h', clientId: 'dcr_abc', userId: 'u1' };
    fakeDb = {
      insert: captureInsert({}),
      select: selectReturning([]),
      update: updateReturning([row]), // conditional UPDATE matched a row
      delete: deleteNoop(),
    };
    expect(await consumeAuthCode('rawcode')).toEqual(row);
  });

  it('returns null when the conditional UPDATE matches nothing (replayed/expired/unknown)', async () => {
    fakeDb = {
      insert: captureInsert({}),
      select: selectReturning([]),
      update: updateReturning([]), // consumed_at already set, expired, or no such code
      delete: deleteNoop(),
    };
    expect(await consumeAuthCode('rawcode')).toBeNull();
  });

  it('returns null for an empty code without touching the db', async () => {
    const update = vi.fn();
    fakeDb = {
      insert: captureInsert({}),
      select: selectReturning([]),
      update,
      delete: deleteNoop(),
    };
    expect(await consumeAuthCode('')).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
