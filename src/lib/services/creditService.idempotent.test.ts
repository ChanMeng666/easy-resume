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

/**
 * insert mock for the getOrCreate that useCreditsIdempotent calls internally:
 * the credits insert hits onConflictDoNothing (row already exists in these
 * tests) and returns no row, so getOrCreate falls through to its read-back.
 */
function existingRowInsert() {
  return vi.fn(() => ({
    values: () => ({ onConflictDoNothing: () => ({ returning: () => Promise.resolve([]) }) }),
  }));
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
    fakeDb = { select, execute, insert: existingRowInsert() } as never;

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

describe('getOrCreate — race-safe creation', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Mock db.insert so it supports BOTH usages in getOrCreate:
   *  - credits: .values().onConflictDoNothing().returning() -> `returningRows`
   *  - bonus txn: `await .values()` (awaited directly) -> resolves undefined
   */
  function insertMock(returningRows: unknown[]) {
    return vi.fn(() => ({
      values: () => ({
        onConflictDoNothing: () => ({ returning: () => Promise.resolve(returningRows) }),
        then: (resolve: (v: unknown) => void) => resolve(undefined),
      }),
    }));
  }

  it('creates the row and grants the signup bonus exactly once when it wins the insert', async () => {
    // Capture every values() payload so we can assert the bonus txn itself.
    const payloads: unknown[] = [];
    const insert = vi.fn(() => ({
      values: (v: unknown) => {
        payloads.push(v);
        return {
          onConflictDoNothing: () => ({
            returning: () => Promise.resolve([{ userId: 'u1', balance: 3 }]),
          }),
          then: (resolve: (val: unknown) => void) => resolve(undefined),
        };
      },
    }));
    const select = vi.fn(() => selectChain([]));
    fakeDb = { insert, select } as never;

    const row = await creditService.getOrCreate('u1');

    expect(row).toEqual({ userId: 'u1', balance: 3 });
    // Two inserts: the credits row + exactly one signup_bonus txn (right payload).
    expect(insert).toHaveBeenCalledTimes(2);
    const bonusTxns = payloads.filter(
      (p) => (p as { type?: string }).type === 'signup_bonus'
    );
    expect(bonusTxns).toHaveLength(1);
    expect(bonusTxns[0]).toMatchObject({ userId: 'u1', type: 'signup_bonus', amount: 3 });
    // We won the insert, so no read-back was needed.
    expect(select).not.toHaveBeenCalled();
  });

  it('reads back the existing row and grants NO bonus when the insert conflicts', async () => {
    // onConflictDoNothing returns no row → the row already existed or a
    // concurrent request won. We must NOT insert a second signup bonus.
    const insert = insertMock([]);
    const existing = { userId: 'u1', balance: 7 };
    const select = vi.fn(() => selectChain([existing]));
    fakeDb = { insert, select } as never;

    const row = await creditService.getOrCreate('u1');

    expect(row).toEqual(existing);
    expect(insert).toHaveBeenCalledTimes(1); // only the (no-op) credits insert
    expect(select).toHaveBeenCalledTimes(1); // read-back
  });
});

describe('useCreditsIdempotent — atomic conditional deduction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('debits and returns the new txn when the balance covers the charge', async () => {
    const selectResults = [[], [FREE]]; // prior-check, getOrCreate
    const select = vi.fn(() => selectChain(selectResults.shift()));
    // CTE matched a row → one usage txn inserted.
    const execute = vi.fn(() => Promise.resolve({ rows: [{ id: 'tx_new' }] }));
    fakeDb = { select, execute, insert: existingRowInsert() } as never;

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
    fakeDb = { select, execute, insert: existingRowInsert() } as never;

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
    fakeDb = { select, execute, insert: existingRowInsert() } as never;

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
