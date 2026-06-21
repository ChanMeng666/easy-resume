import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Verifies the race-safe path of useCreditsIdempotent: when a concurrent
 * request already inserted the usage txn, the partial UNIQUE index makes our
 * insert throw 23505. We must then return the winner's transaction WITHOUT
 * deducting the balance again (no double charge).
 */

// Mutable handle so the mocked getDb returns our per-test fake.
let fakeDb: Record<string, ReturnType<typeof vi.fn>>;

vi.mock('@/lib/db/client', () => ({
  getDb: () => fakeDb,
}));

// Import after the mock is registered.
const { creditService } = await import('./creditService');

/** A drizzle-like query chain whose terminal call resolves to `result`. */
function selectChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(result);
  return chain;
}

describe('useCreditsIdempotent — concurrent insert race', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the winner txn and does NOT deduct again on unique violation', async () => {
    // select() is called in order: prior-check, getOrCreate, winner-lookup.
    const selectResults = [
      [], // prior check: no existing usage txn
      [{ userId: 'u1', balance: 5, subscriptionTier: 'free' }], // getOrCreate
      [{ id: 'tx_winner' }], // winner lookup after 23505
    ];
    const select = vi.fn(() => selectChain(selectResults.shift()));

    const update = vi.fn(() => ({ set: () => ({ where: () => Promise.resolve() }) }));

    // insert().values().returning() rejects with a Postgres unique violation.
    const insert = vi.fn(() => ({
      values: () => ({
        returning: () => Promise.reject(Object.assign(new Error('dup'), { code: '23505' })),
      }),
    }));

    fakeDb = { select, update, insert } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-1'
    );

    expect(result).toEqual({ ok: true, transactionId: 'tx_winner' });
    // Critical: the balance update must NOT run when we lost the insert race.
    expect(update).not.toHaveBeenCalled();
  });

  it('returns the prior txn without inserting when already charged', async () => {
    const select = vi.fn(() => selectChain([{ id: 'tx_prior' }]));
    const update = vi.fn();
    const insert = vi.fn();
    fakeDb = { select, update, insert } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-1'
    );

    expect(result).toEqual({ ok: true, transactionId: 'tx_prior' });
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
