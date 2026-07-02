import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Caller } from '@/server/core/pipeline.types';

/**
 * createJob is now a thin adapter over reserveJob (the same idempotency anchor
 * the web SSE path uses). These tests pin the adapter mapping — the part unique
 * to the runner — without executing the pipeline:
 *  - created  → returns the row AND kicks the detached background run;
 *  - reclaimed→ same (a failed key is re-run, not returned as failed forever);
 *  - replay / in_progress → returns the caller's row WITHOUT running;
 *  - conflict → throws ConflictError.
 * The background run is injected as a fake so we assert scheduling, not the LLM.
 */

// reserveJob is mocked per-test to drive each reservation mode; the other persist
// exports are unused here (runJob, which calls them, is never executed).
const reserveJob = vi.fn();
vi.mock('@/server/jobs/persist', () => ({
  reserveJob: (...a: unknown[]) => reserveJob(...a),
  finalizeSucceededJob: vi.fn(),
  failJob: vi.fn(),
}));

// Keep the runner's pipeline/deps imports inert so the test loads no LLM wiring.
vi.mock('@/server/core/pipeline', () => ({ runGenerationPipeline: vi.fn() }));
vi.mock('@/server/core/deps', () => ({ defaultDeps: vi.fn() }));

let fakeDb: { select: (...args: unknown[]) => unknown };
vi.mock('@/lib/db/client', () => ({
  db: { select: (...a: unknown[]) => fakeDb.select(...a) },
}));

const { createJob } = await import('./runner');
const { ConflictError } = await import('@/server/errors/AppError');

const caller: Caller = { userId: 'u1', via: 'api_key', apiKeyId: 'k1' };
const input = { jobDescription: 'jd', background: 'bg' };

/** db.select().from().where().limit() -> rows */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(rows);
  return () => chain;
}

describe('createJob (reserveJob adapter)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('created: returns the row and kicks the detached run once', async () => {
    reserveJob.mockResolvedValue({ mode: 'created', jobId: 'job_new' });
    fakeDb = { select: selectReturning([{ id: 'job_new', status: 'queued' }]) };
    const run = vi.fn();

    const job = await createJob(caller, input, 'key-1', run);

    expect(job).toEqual({ id: 'job_new', status: 'queued' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith('job_new', caller);
    // The runner starts v1 rows queued.
    expect(reserveJob).toHaveBeenCalledWith(
      expect.objectContaining({ caller, input, idempotencyKey: 'key-1', initialStatus: 'queued' })
    );
  });

  it('reclaimed: re-runs a previously-failed key (does not return it failed)', async () => {
    reserveJob.mockResolvedValue({ mode: 'reclaimed', jobId: 'job_failed' });
    fakeDb = { select: selectReturning([{ id: 'job_failed', status: 'queued' }]) };
    const run = vi.fn();

    const job = await createJob(caller, input, 'key-1', run);

    expect(job).toEqual({ id: 'job_failed', status: 'queued' });
    expect(run).toHaveBeenCalledWith('job_failed', caller);
  });

  it('replay: returns the succeeded row without running', async () => {
    reserveJob.mockResolvedValue({ mode: 'replay', jobId: 'job_done', result: {} });
    fakeDb = { select: selectReturning([{ id: 'job_done', status: 'succeeded' }]) };
    const run = vi.fn();

    const job = await createJob(caller, input, 'key-1', run);

    expect(job).toEqual({ id: 'job_done', status: 'succeeded' });
    expect(run).not.toHaveBeenCalled();
  });

  it('in_progress: returns the running row without starting a second run', async () => {
    reserveJob.mockResolvedValue({ mode: 'in_progress', jobId: 'job_run' });
    fakeDb = { select: selectReturning([{ id: 'job_run', status: 'running' }]) };
    const run = vi.fn();

    const job = await createJob(caller, input, 'key-1', run);

    expect(job).toEqual({ id: 'job_run', status: 'running' });
    expect(run).not.toHaveBeenCalled();
  });

  it('conflict: throws ConflictError and never runs', async () => {
    reserveJob.mockResolvedValue({ mode: 'conflict' });
    fakeDb = { select: selectReturning([]) };
    const run = vi.fn();

    await expect(createJob(caller, input, 'key-1', run)).rejects.toBeInstanceOf(ConflictError);
    expect(run).not.toHaveBeenCalled();
  });
});
