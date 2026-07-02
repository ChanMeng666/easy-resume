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
import { defaultDeps } from '@/server/core/deps';
import { ConflictError } from '@/server/errors/AppError';
import { toErrorEnvelope } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import { reserveJob, finalizeSucceededJob, failJob } from '@/server/jobs/persist';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';

/** Signature of the background runner, injectable so createJob is unit-testable. */
type RunFn = (jobId: string, caller: Caller) => void;

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
  const reservation = await reserveJob({ caller, input, idempotencyKey, initialStatus: 'queued' });

  // Cross-user key reuse: refuse rather than resume/leak another caller's job.
  if (reservation.mode === 'conflict') {
    throw new ConflictError('This idempotency key is already in use.');
  }

  // A fresh (created) or reclaimed-from-failed (reclaimed) slot: we own the run.
  // Detached — the long-lived VPS process keeps running this after POST returns.
  if (reservation.mode === 'created' || reservation.mode === 'reclaimed') {
    const job = await getJob(reservation.jobId);
    run(job.id, caller);
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

/** Execute a job to completion, persisting status/result/error transitions. */
async function runJob(jobId: string, caller: Caller): Promise<void> {
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

    const result = await runGenerationPipeline(
      job.input,
      caller,
      defaultDeps({ requestId: jobId }),
      // Charge keyed on the jobId (per-user, per-job) — not the client key — so a
      // deleted job's key can never replay an old charge, and a cross-user key
      // can never see another caller's usage txn.
      { idempotencyKey: jobId }
    );

    // Shared terminal write (identical row shape to the web SSE path): sets the
    // succeeded status/result/title/charged/pdfUrl/profileId AND uploads the PDF
    // to R2. Best-effort — a failure here never marks a succeeded+charged job
    // failed; the stale-job sweeper / a later poll reconciles a stuck row.
    await finalizeSucceededJob({ jobId, input: job.input, result, logger: log });

    log.info('job.succeeded', { charged: result.usage.charged });
  } catch (err) {
    const envelope = toErrorEnvelope(err, jobId);
    log.error('job.failed', { code: envelope.error.code, step: envelope.error.step }, err);
    // Record the failure envelope (best-effort) so the row leaves `running` and
    // its key can be reclaimed by a retry.
    await failJob(jobId, envelope.error, log);
  }
}
