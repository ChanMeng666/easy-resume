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

// reserveJob is mocked per-test to drive each reservation mode; finalizeSucceededJob
// / failJob are hoisted so the runJob dispatch tests can assert the terminal write.
const reserveJob = vi.fn();
const finalizeSucceededJob = vi.fn();
const failJob = vi.fn();
vi.mock('@/server/jobs/persist', () => ({
  reserveJob: (...a: unknown[]) => reserveJob(...a),
  finalizeSucceededJob: (...a: unknown[]) => finalizeSucceededJob(...a),
  failJob: (...a: unknown[]) => failJob(...a),
}));

// Keep the runner's pipeline/refine/deps imports inert so the test loads no LLM
// wiring — runJob dispatch is asserted via injected RunJobDeps, not real runs.
vi.mock('@/server/core/pipeline', () => ({ runGenerationPipeline: vi.fn() }));
vi.mock('@/server/core/refine', () => ({ runRefinementPipeline: vi.fn() }));
vi.mock('@/server/jobs/refineArtifacts', () => ({ buildRefineArtifacts: vi.fn() }));
vi.mock('@/server/core/deps', () => ({ defaultDeps: vi.fn(), defaultRefineDeps: vi.fn() }));

let fakeDb: {
  select: (...args: unknown[]) => unknown;
  update?: (...args: unknown[]) => unknown;
};
vi.mock('@/lib/db/client', () => ({
  db: {
    select: (...a: unknown[]) => fakeDb.select(...a),
    update: (...a: unknown[]) => fakeDb.update!(...a),
  },
}));

const { createJob, runJob, isRefineInput } = await import('./runner');
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

/** db.update().set().where() -> resolves (the awaited status flip) */
function updateResolving() {
  const chain: Record<string, unknown> = {};
  chain.set = () => chain;
  chain.where = () => Promise.resolve(undefined);
  return () => chain;
}

const refineInput = {
  jobDescription: 'jd',
  background: 'bg',
  templateId: 'two-column',
  refineOfJobId: '11111111-1111-4111-8111-111111111111',
  feedback: 'tighten the summary',
  scope: 'resume' as const,
};

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

  it('refine input: forwards the parent id so the row joins the version chain', async () => {
    reserveJob.mockResolvedValue({ mode: 'created', jobId: 'job_refine' });
    fakeDb = { select: selectReturning([{ id: 'job_refine', status: 'queued' }]) };

    await createJob(caller, refineInput, 'key-1', vi.fn());

    expect(reserveJob).toHaveBeenCalledWith(
      expect.objectContaining({ parentJobId: refineInput.refineOfJobId, initialStatus: 'queued' })
    );
  });
});

describe('isRefineInput', () => {
  it('true when refineOfJobId is a non-empty string', () => {
    expect(isRefineInput(refineInput)).toBe(true);
  });

  it('false for a plain generation input', () => {
    expect(isRefineInput({ jobDescription: 'jd', background: 'bg' })).toBe(false);
  });

  it('false for an empty / blank refineOfJobId', () => {
    expect(isRefineInput({ ...refineInput, refineOfJobId: '' } as never)).toBe(false);
    expect(isRefineInput({ ...refineInput, refineOfJobId: '   ' } as never)).toBe(false);
  });

  it('false for garbage', () => {
    expect(isRefineInput({} as never)).toBe(false);
    expect(isRefineInput({ refineOfJobId: 123 } as never)).toBe(false);
    expect(isRefineInput(null as never)).toBe(false);
  });
});

describe('runJob dispatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refine-shaped input → refine path (not generation)', async () => {
    const job = { id: 'job_refine', input: refineInput };
    fakeDb = { select: selectReturning([job]), update: updateResolving() };
    const runGeneration = vi.fn();
    const runRefine = vi.fn().mockResolvedValue({ usage: { charged: false } });

    await runJob('job_refine', caller, { runGeneration, runRefine });

    expect(runRefine).toHaveBeenCalledWith(job, caller);
    expect(runGeneration).not.toHaveBeenCalled();
    expect(finalizeSucceededJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job_refine', input: refineInput })
    );
    expect(failJob).not.toHaveBeenCalled();
  });

  it('generation-shaped input → generation path (not refine)', async () => {
    const job = { id: 'job_gen', input: { jobDescription: 'jd', background: 'bg' } };
    fakeDb = { select: selectReturning([job]), update: updateResolving() };
    const runGeneration = vi.fn().mockResolvedValue({ usage: { charged: true } });
    const runRefine = vi.fn();

    await runJob('job_gen', caller, { runGeneration, runRefine });

    expect(runGeneration).toHaveBeenCalledWith(job, caller);
    expect(runRefine).not.toHaveBeenCalled();
    expect(finalizeSucceededJob).toHaveBeenCalled();
  });

  it('a failing run marks the job failed (free) and never finalizes', async () => {
    const job = { id: 'job_refine', input: refineInput };
    fakeDb = { select: selectReturning([job]), update: updateResolving() };
    const runGeneration = vi.fn();
    const runRefine = vi.fn().mockRejectedValue(new Error('parent gone'));

    await runJob('job_refine', caller, { runGeneration, runRefine });

    expect(finalizeSucceededJob).not.toHaveBeenCalled();
    expect(failJob).toHaveBeenCalled();
  });
});
