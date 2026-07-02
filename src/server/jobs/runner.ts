/**
 * In-process generation job runner.
 *
 * The public v1 API is asynchronous: a POST creates a job row, then the
 * pipeline runs in the background of the same Node process (this deploys as a
 * long-lived container on a VPS — one monolith, no external queue or worker
 * service). Agents poll the job until it succeeds or fails.
 *
 * Limitation (acceptable for now): a process restart mid-run leaves a job in
 * `running`. A future sweep can requeue stale `running` jobs.
 */

import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs, type GenerationJob } from '@/lib/db/schema';
import { runGenerationPipeline } from '@/server/core/pipeline';
import { runRefinementPipeline, type RefineScope } from '@/server/core/refine';
import { defaultDeps, defaultRefineDeps } from '@/server/core/deps';
import { buildRefineArtifacts } from '@/server/jobs/refineArtifacts';
import { ConflictError, NotFoundError } from '@/server/errors/AppError';
import { toErrorEnvelope } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import { reserveJob, finalizeSucceededJob, failJob } from '@/server/jobs/persist';
import { createSemaphore } from '@/server/jobs/concurrency';
import type { Caller, GenerateInput, GenerateResult } from '@/server/core/pipeline.types';

/**
 * Stored-input shape for a refine job (mirrors the row `/api/refine` reserves): a
 * generation input plus refine provenance. Self-describing so a refine-of-refine
 * carries full context and `deriveJobTitle` still works off the inherited JD.
 */
export type RefineJobInput = GenerateInput & {
  refineOfJobId: string;
  feedback: string;
  scope: RefineScope;
};

/**
 * True when a stored job input carries refine provenance (a non-empty
 * `refineOfJobId`), meaning `runJob` must take the refine path instead of the
 * generation pipeline. Pure — safe to unit test and to call on any stored input.
 */
export function isRefineInput(input: GenerateInput): input is RefineJobInput {
  const candidate = input as Partial<RefineJobInput> | null | undefined;
  return (
    typeof candidate?.refineOfJobId === 'string' && candidate.refineOfJobId.trim().length > 0
  );
}

/** Signature of the background runner, injectable so createJob is unit-testable. */
type RunFn = (jobId: string, caller: Caller) => void | Promise<void>;

/**
 * Cap on concurrently EXECUTING background jobs (generation + refine share one
 * gate). Excess accepted jobs wait FIFO with their rows still `queued` — accurate
 * for pollers — and are dequeued as slots free. Tune via JOB_CONCURRENCY; the
 * default is deliberately small: each run is a chain of LLM calls plus a typst
 * subprocess on a single VPS.
 */
const JOB_CONCURRENCY = (() => {
  const raw = Number(process.env.JOB_CONCURRENCY);
  return Number.isInteger(raw) && raw >= 1 ? raw : 2;
})();

const jobGate = createSemaphore(JOB_CONCURRENCY);

/**
 * Schedule a background run through the concurrency gate, detached. Errors are
 * already handled inside runJob (failJob + structured log); a scheduling-level
 * failure is logged and swallowed — the stale-job sweeper reconciles the row.
 */
function scheduleRun(run: RunFn, jobId: string, caller: Caller): void {
  void jobGate
    .run(() => Promise.resolve(run(jobId, caller)))
    .catch((err) => {
      createLogger({ jobId, route: 'v1.jobs' }).error('job.schedule_failed', {}, err);
    });
}

/**
 * Create (or resolve) the job for an idempotency key, then kick off the pipeline
 * in the background. Returns the job row immediately.
 *
 * This is a thin adapter over `reserveJob` — the SAME idempotency anchor the web
 * SSE path uses — so both transports share one job-creation implementation
 * (failed-job reclaim, completed-key replay, cross-user conflict, concurrent-race
 * dedupe). v1 rows start `queued` (the runner flips them to `running`); reserveJob
 * sweeps stale jobs internally, so no separate sweep is needed here.
 *
 * `run` defaults to the real background runner; tests inject a fake to assert the
 * detached-run mapping without executing the pipeline.
 */
export async function createJob(
  caller: Caller,
  input: GenerateInput,
  idempotencyKey: string,
  run: RunFn = runJob
): Promise<GenerationJob> {
  // A refine job records its parent so the reserved row joins the version chain
  // (reserveJob owner-scopes the parent and silently ignores a missing/cross-user
  // one). A plain generation has no parent link.
  const parentJobId = isRefineInput(input) ? input.refineOfJobId : undefined;
  const reservation = await reserveJob({
    caller,
    input,
    idempotencyKey,
    initialStatus: 'queued',
    parentJobId,
  });

  // Cross-user key reuse: refuse rather than resume/leak another caller's job.
  if (reservation.mode === 'conflict') {
    throw new ConflictError('This idempotency key is already in use.');
  }

  // A fresh (created) or reclaimed-from-failed (reclaimed) slot: we own the run.
  // Detached — the long-lived VPS process keeps running this after POST returns.
  // The concurrency gate bounds how many execute at once; a queued job's row
  // stays `queued` until runJob dequeues and flips it to `running` (which also
  // touches updatedAt — the dequeue heartbeat for the stale-job sweeper).
  if (reservation.mode === 'created' || reservation.mode === 'reclaimed') {
    const job = await getJob(reservation.jobId);
    scheduleRun(run, job.id, caller);
    return job;
  }

  // replay (already succeeded) / in_progress (a concurrent run owns the key):
  // hand the caller its own row back to poll; never start a second run.
  return getJob(reservation.jobId);
}

/** Fetch a job row by id. The row exists — reserveJob just returned its id. */
async function getJob(jobId: string): Promise<GenerationJob> {
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  if (!job) throw new ConflictError('The generation job could not be resolved.');
  return job;
}

/**
 * How `runJob` executes a claimed job, split by input shape. Injectable so a test
 * can assert the dispatch (generation vs refine) without running a real pipeline
 * or loading the parent from the DB — the same seam pattern `createJob` uses for
 * its background `run`.
 */
export interface RunJobDeps {
  runGeneration: (job: GenerationJob, caller: Caller) => Promise<GenerateResult>;
  runRefine: (job: GenerationJob, caller: Caller) => Promise<GenerateResult>;
}

const defaultRunJobDeps: RunJobDeps = {
  runGeneration: (job, caller) =>
    runGenerationPipeline(
      job.input,
      caller,
      defaultDeps({ requestId: job.id }),
      // Charge keyed on the jobId (per-user, per-job) — not the client key — so a
      // deleted job's key can never replay an old charge, and a cross-user key
      // can never see another caller's usage txn.
      { idempotencyKey: job.id }
    ),
  runRefine: runRefineJob,
};

/**
 * Load and validate the parent generation a refine job builds on (owner-scoped,
 * succeeded, has a result — the same gate the web refine route applies), then map
 * it to the artifacts the refinement core consumes. A parent that was deleted or
 * invalidated between job creation and run throws `NotFoundError`, so the job
 * fails with a clean envelope (the failure is free and its key reclaimable).
 */
async function loadRefineContext(input: RefineJobInput, caller: Caller) {
  const [parent] = await db
    .select({
      userId: generationJobs.userId,
      status: generationJobs.status,
      input: generationJobs.input,
      result: generationJobs.result,
    })
    .from(generationJobs)
    .where(eq(generationJobs.id, input.refineOfJobId))
    .limit(1);

  // Hide existence on miss / cross-user / not-ready — all map to NotFound.
  if (!parent || parent.userId !== caller.userId || parent.status !== 'succeeded' || !parent.result) {
    throw new NotFoundError('Resume not found');
  }

  const parentInputObj = (parent.input ?? {}) as { jobDescription?: string; background?: string };
  const parentResult = parent.result as Parameters<typeof buildRefineArtifacts>[1];
  // Throws ValidationError when the parent has no resume data.
  return buildRefineArtifacts(parentInputObj, parentResult);
}

/** Execute the refine path for a refine-shaped job. */
async function runRefineJob(job: GenerationJob, caller: Caller): Promise<GenerateResult> {
  const input = job.input as RefineJobInput;
  const artifacts = await loadRefineContext(input, caller);
  return runRefinementPipeline(
    artifacts,
    { feedback: input.feedback, scope: input.scope },
    caller,
    defaultRefineDeps({ requestId: job.id }),
    // Charge (when enabled) keyed on the jobId, same rationale as generation.
    { idempotencyKey: job.id }
  );
}

/** Execute a job to completion, persisting status/result/error transitions. */
export async function runJob(
  jobId: string,
  caller: Caller,
  deps: RunJobDeps = defaultRunJobDeps
): Promise<void> {
  const log = createLogger({ jobId, route: 'v1.jobs', userId: caller.userId });
  try {
    await db
      .update(generationJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(generationJobs.id, jobId));

    const [job] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, jobId))
      .limit(1);
    if (!job) return;

    // A refine-shaped input runs the targeted refinement core; everything else is
    // a full generation. Both return the same GenerateResult shape, so the
    // terminal write below is identical.
    const refine = isRefineInput(job.input);
    const result = refine ? await deps.runRefine(job, caller) : await deps.runGeneration(job, caller);

    // Shared terminal write (identical row shape to the web SSE path): sets the
    // succeeded status/result/title/charged/pdfUrl/profileId AND uploads the PDF
    // to R2. Best-effort — a failure here never marks a succeeded+charged job
    // failed; the stale-job sweeper / a later poll reconciles a stuck row.
    await finalizeSucceededJob({ jobId, input: job.input, result, logger: log });

    log.info('job.succeeded', { charged: result.usage.charged, mode: refine ? 'refine' : 'generate' });
  } catch (err) {
    const envelope = toErrorEnvelope(err, jobId);
    log.error('job.failed', { code: envelope.error.code, step: envelope.error.step }, err);
    // Record the failure envelope (best-effort) so the row leaves `running` and
    // its key can be reclaimed by a retry.
    await failJob(jobId, envelope.error, log);
  }
}
