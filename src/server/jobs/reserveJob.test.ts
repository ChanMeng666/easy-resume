import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Caller } from '@/server/core/pipeline.types';

/**
 * reserveJob is the idempotency anchor that makes "one credit, at most one
 * delivered result" hold on the web path. These tests pin each resolution mode:
 * a fresh claim (created), a completed key (replay), a concurrent key
 * (in_progress), another user's key (conflict), and a failed attempt being
 * atomically reclaimed for retry (reclaimed / lost-the-reclaim-race).
 */

let fakeDb: Record<string, (...args: unknown[]) => unknown>;

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: (...a: unknown[]) => fakeDb.insert(...a),
    select: (...a: unknown[]) => fakeDb.select(...a),
    update: (...a: unknown[]) => fakeDb.update(...a),
  },
}));

const { reserveJob, sweepStaleRunningJobs } = await import('./persist');

const caller: Caller = { userId: 'u1', via: 'api_key', apiKeyId: 'k1' };
const input = { jobDescription: 'jd', background: 'bg' };

/** db.insert(...).values(...).onConflictDoNothing(...).returning() -> rows */
function insertReturning(rows: unknown[]) {
  return () => ({
    values: () => ({ onConflictDoNothing: () => ({ returning: () => Promise.resolve(rows) }) }),
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

describe('reserveJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('created: claims a fresh running slot when the key is unused', async () => {
    fakeDb = {
      insert: insertReturning([{ id: 'job_new' }]),
      select: selectReturning([]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'key-1' });
    expect(r).toEqual({ mode: 'created', jobId: 'job_new' });
  });

  it('replay: returns the stored result when the key already succeeded', async () => {
    const result = { resumeData: { basics: { name: 'A' } }, usage: { charged: true } };
    fakeDb = {
      insert: insertReturning([]), // conflict: key exists
      select: selectReturning([{ id: 'job_done', userId: 'u1', status: 'succeeded', result }]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'key-1' });
    expect(r).toEqual({ mode: 'replay', jobId: 'job_done', result });
  });

  it('in_progress: refuses to run a second time while a concurrent run owns the key', async () => {
    fakeDb = {
      insert: insertReturning([]),
      select: selectReturning([{ id: 'job_run', userId: 'u1', status: 'running', result: null }]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'key-1' });
    expect(r).toEqual({ mode: 'in_progress', jobId: 'job_run' });
  });

  it('conflict: refuses when the key belongs to another user', async () => {
    const result = { usage: { charged: true } };
    fakeDb = {
      insert: insertReturning([]),
      select: selectReturning([{ id: 'job_other', userId: 'someone_else', status: 'succeeded', result }]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'key-1' });
    expect(r).toEqual({ mode: 'conflict' });
  });

  it('reclaimed: atomically re-claims a failed attempt for retry', async () => {
    fakeDb = {
      insert: insertReturning([]),
      select: selectReturning([{ id: 'job_failed', userId: 'u1', status: 'failed', result: null }]),
      update: updateReturning([{ id: 'job_failed' }]), // we won the flip out of 'failed'
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'key-1' });
    expect(r).toEqual({ mode: 'reclaimed', jobId: 'job_failed' });
  });

  it('in_progress: lost the reclaim race (another retry already flipped it)', async () => {
    fakeDb = {
      insert: insertReturning([]),
      select: selectReturning([{ id: 'job_failed', userId: 'u1', status: 'failed', result: null }]),
      update: updateReturning([]), // conditional update matched nothing
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'key-1' });
    expect(r).toEqual({ mode: 'in_progress', jobId: 'job_failed' });
  });
});

describe('reserveJob initialStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Capturing insert: records the values() payload, then returns `rows`. */
  function captureInsert(rows: unknown[], sink: { values?: Record<string, unknown> }) {
    return () => ({
      values: (v: Record<string, unknown>) => {
        sink.values = v;
        return { onConflictDoNothing: () => ({ returning: () => Promise.resolve(rows) }) };
      },
    });
  }
  /** Capturing update: records the set() payload, then returns `rows`. */
  function captureUpdate(rows: unknown[], sink: { set?: Record<string, unknown> }) {
    return () => ({
      set: (v: Record<string, unknown>) => {
        sink.set = v;
        return { where: () => ({ returning: () => Promise.resolve(rows) }) };
      },
    });
  }

  it('defaults a fresh claim to a running row (web SSE behavior)', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsert([{ id: 'job_new' }], sink),
      select: selectReturning([]),
      update: updateReturning([]),
    };
    await reserveJob({ caller, input, idempotencyKey: 'k' });
    expect(sink.values).toMatchObject({ status: 'running' });
  });

  it('inserts a queued row when initialStatus=queued (v1 runner)', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsert([{ id: 'job_new' }], sink),
      select: selectReturning([]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'k', initialStatus: 'queued' });
    expect(r).toEqual({ mode: 'created', jobId: 'job_new' });
    expect(sink.values).toMatchObject({ status: 'queued' });
  });

  it('reclaims a failed attempt into the given initialStatus', async () => {
    const sink: { set?: Record<string, unknown> } = {};
    fakeDb = {
      insert: insertReturning([]),
      select: selectReturning([{ id: 'job_failed', userId: 'u1', status: 'failed', result: null }]),
      update: captureUpdate([{ id: 'job_failed' }], sink),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'k', initialStatus: 'queued' });
    expect(r).toEqual({ mode: 'reclaimed', jobId: 'job_failed' });
    expect(sink.set).toMatchObject({ status: 'queued' });
  });
});

describe('reserveJob refine chain', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Capturing insert: records the values() payload, then returns `rows`. */
  function captureInsert(rows: unknown[], sink: { values?: Record<string, unknown> }) {
    return () => ({
      values: (v: Record<string, unknown>) => {
        sink.values = v;
        return { onConflictDoNothing: () => ({ returning: () => Promise.resolve(rows) }) };
      },
    });
  }

  it('records parent_job_id + root_job_id from an owned first-gen parent', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsert([{ id: 'job_child' }], sink),
      // Parent is a first generation (rootJobId null) → it becomes the root.
      select: selectReturning([{ id: 'parent1', userId: 'u1', rootJobId: null }]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'k', parentJobId: 'parent1' });
    expect(r).toEqual({ mode: 'created', jobId: 'job_child' });
    expect(sink.values).toMatchObject({ parentJobId: 'parent1', rootJobId: 'parent1' });
  });

  it('inherits the parent’s existing root for a deeper chain', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsert([{ id: 'job_v3' }], sink),
      select: selectReturning([{ id: 'parent2', userId: 'u1', rootJobId: 'root0' }]),
      update: updateReturning([]),
    };
    await reserveJob({ caller, input, idempotencyKey: 'k', parentJobId: 'parent2' });
    expect(sink.values).toMatchObject({ parentJobId: 'parent2', rootJobId: 'root0' });
  });

  it('ignores a cross-user parent (no chain link, run still proceeds)', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = {
      insert: captureInsert([{ id: 'job_child' }], sink),
      select: selectReturning([{ id: 'parentX', userId: 'someone_else', rootJobId: null }]),
      update: updateReturning([]),
    };
    const r = await reserveJob({ caller, input, idempotencyKey: 'k', parentJobId: 'parentX' });
    expect(r).toEqual({ mode: 'created', jobId: 'job_child' });
    expect(sink.values).toMatchObject({ parentJobId: null, rootJobId: null });
  });
});

describe('sweepStaleRunningJobs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('issues a single UPDATE to fail abandoned jobs and never throws', async () => {
    const update = vi.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }));
    fakeDb = { update } as never;
    await expect(sweepStaleRunningJobs()).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('swallows DB errors (best-effort)', async () => {
    const update = vi.fn(() => ({
      set: () => ({ where: () => Promise.reject(new Error('db down')) }),
    }));
    fakeDb = { update } as never;
    await expect(sweepStaleRunningJobs()).resolves.toBeUndefined();
  });
});
