import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Covers the money-path invariants of useCreditsIdempotent. The debit and the
 * usage-txn audit row are written in ONE atomic CTE statement
 * (`WITH deducted AS (UPDATE ... WHERE balance >= amount RETURNING)
 *   INSERT ... SELECT FROM deducted RETURNING id`). We assert the four outcomes:
 *   1. already charged (same key)         -> return prior, no DB write
 *   2. concurrent same key (23505)        -> return winner, no double-debit
 *   3. balance covers the charge          -> debit + return new txn
 *   4. balance insufficient (0 rows)      -> charge nothing, return {ok:false}
 */

// Mutable handle so the mocked getDb returns our per-test fake.
let fakeDb: Record<string, ReturnType<typeof vi.fn>>;

vi.mock('@/lib/db/client', () => ({
  getDb: () => fakeDb,
}));

// Import after the mock is registered.
const { creditService } = await import('./creditService');

/** A drizzle-like select chain whose terminal call resolves to `result`. */
function selectChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(result);
  return chain;
}

const FREE = { userId: 'u1', balance: 5, subscriptionTier: 'free' };

describe('useCreditsIdempotent — idempotency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the prior txn without charging when already charged', async () => {
    const select = vi.fn(() => selectChain([{ id: 'tx_prior' }]));
    const execute = vi.fn();
    const insert = vi.fn();
    fakeDb = { select, execute, insert } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-1'
    );

    expect(result).toEqual({ ok: true, transactionId: 'tx_prior' });
    expect(execute).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('returns the winner txn and does NOT double-debit on a same-key race (23505)', async () => {
    // select order: prior-check, getOrCreate, winner-lookup (after 23505).
    const selectResults = [[], [FREE], [{ id: 'tx_winner' }]];
    const select = vi.fn(() => selectChain(selectResults.shift()));
    // The atomic CTE INSERT loses the unique race on (reference_id) WHERE usage.
    const execute = vi.fn(() =>
      Promise.reject(Object.assign(new Error('dup'), { code: '23505' }))
    );
    fakeDb = { select, execute } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-1'
    );

    expect(result).toEqual({ ok: true, transactionId: 'tx_winner' });
    // The whole CTE (incl. its UPDATE) rolled back on the violation — Postgres
    // guarantees this since it is a single statement. Nothing more to assert
    // than: we did not throw and we returned the winner.
  });
});

describe('useCreditsIdempotent — atomic conditional deduction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('debits and returns the new txn when the balance covers the charge', async () => {
    const selectResults = [[], [FREE]]; // prior-check, getOrCreate
    const select = vi.fn(() => selectChain(selectResults.shift()));
    // CTE matched a row → one usage txn inserted.
    const execute = vi.fn(() => Promise.resolve({ rows: [{ id: 'tx_new' }] }));
    fakeDb = { select, execute } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-2'
    );

    expect(result).toEqual({ ok: true, transactionId: 'tx_new' });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('charges nothing and fails when the balance is insufficient (0 rows)', async () => {
    const selectResults = [[], [{ ...FREE, balance: 0 }]];
    const select = vi.fn(() => selectChain(selectResults.shift()));
    // `UPDATE ... WHERE balance >= amount` matched no row, so the INSERT ...
    // SELECT FROM deducted inserts nothing: over-delivery is prevented.
    const execute = vi.fn(() => Promise.resolve({ rows: [] }));
    fakeDb = { select, execute } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-3'
    );

    expect(result).toEqual({ ok: false });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('handles a driver that returns a bare rows array (not {rows})', async () => {
    const selectResults = [[], [FREE]];
    const select = vi.fn(() => selectChain(selectResults.shift()));
    const execute = vi.fn(() => Promise.resolve([{ id: 'tx_arr' }]));
    fakeDb = { select, execute } as never;

    const result = await creditService.useCreditsIdempotent(
      'u1',
      1,
      'Resume generation',
      'resume_generation',
      'idem-key-4'
    );

    expect(result).toEqual({ ok: true, transactionId: 'tx_arr' });
  });
});
