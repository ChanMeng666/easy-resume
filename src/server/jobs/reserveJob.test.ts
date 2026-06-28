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
    expect(r).toEqual({ mode: 'in_progress' });
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
    expect(r).toEqual({ mode: 'in_progress' });
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
