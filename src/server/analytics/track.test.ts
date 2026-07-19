import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * trackEvent is the single best-effort analytics write. It must: insert the
 * event with a normalized shape (null userId when anonymous, `{}` props by
 * default) AND swallow any DB failure so a telemetry error can never propagate
 * into the caller's (money) path.
 */

let fakeDb: { insert: (...a: unknown[]) => unknown };

vi.mock('@/lib/db/client', () => ({
  db: { insert: (...a: unknown[]) => fakeDb.insert(...a) },
}));

const { trackEvent } = await import('./track');

/** db.insert(table).values(payload) -> resolves; records the payload. */
function captureInsert(sink: { values?: Record<string, unknown> }, opts: { reject?: boolean } = {}) {
  return () => ({
    values: (v: Record<string, unknown>) => {
      sink.values = v;
      return opts.reject ? Promise.reject(new Error('analytics db down')) : Promise.resolve(undefined);
    },
  });
}

describe('trackEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts the event with userId, event, and props', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = { insert: captureInsert(sink) };
    await trackEvent({ userId: 'u1', event: 'generation_succeeded', props: { jobId: 'j1', charged: true } });
    expect(sink.values).toEqual({
      userId: 'u1',
      event: 'generation_succeeded',
      props: { jobId: 'j1', charged: true },
    });
  });

  it('normalizes an anonymous event to a null userId and empty props', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = { insert: captureInsert(sink) };
    await trackEvent({ event: 'first_seen' });
    expect(sink.values).toEqual({ userId: null, event: 'first_seen', props: {} });
  });

  it('swallows DB errors (best-effort — never throws)', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = { insert: captureInsert(sink, { reject: true }) };
    await expect(trackEvent({ userId: 'u1', event: 'signup' })).resolves.toBeUndefined();
  });

  it('swallows a thrown db client (e.g. no connection string) — never throws', async () => {
    fakeDb = {
      insert: () => {
        throw new Error('No database connection string');
      },
    };
    await expect(trackEvent({ event: 'signup' })).resolves.toBeUndefined();
  });
});
