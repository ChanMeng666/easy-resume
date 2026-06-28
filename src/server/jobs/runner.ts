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
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs, type GenerationJob } from '@/lib/db/schema';
import { runGenerationPipeline } from '@/server/core/pipeline';
import { defaultDeps } from '@/server/core/deps';
import { ConflictError } from '@/server/errors/AppError';
import { toErrorEnvelope } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import { toWireResult, deriveJobTitle, storeResumePdf, sweepStaleRunningJobs } from '@/server/jobs/persist';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';

/**
 * Create (or return the existing) job for an idempotency key, then kick off the
 * pipeline in the background. Returns the job row immediately.
 */
export async function createJob(
  caller: Caller,
  input: GenerateInput,
  idempotencyKey: string
): Promise<GenerationJob> {
  // Reconcile abandoned jobs (crash/restart left them in queued/running) so the
  // history and same-key reclaim stay consistent.
  await sweepStaleRunningJobs();

  // Owner-scoped replay: an agent re-POSTing the same key gets its own job back.
  const [existing] = await db
    .select()
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.idempotencyKey, idempotencyKey),
        eq(generationJobs.userId, caller.userId)
      )
    )
    .limit(1);
  if (existing) return existing;

  // Race-safe insert: onConflictDoNothing on the unique idempotencyKey means two
  // concurrent identical POSTs can't both create a job (and thus can't both
  // charge). The loser gets no row back and returns the winner instead of
  // erroring — so a duplicate key is always idempotent, even under contention.
  const [job] = await db
    .insert(generationJobs)
    .values({ userId: caller.userId, status: 'queued', input, idempotencyKey })
    .onConflictDoNothing({ target: generationJobs.idempotencyKey })
    .returning();

  if (job) {
    // Detached: the long-lived VPS process keeps running this after the POST returns.
    void runJob(job.id, caller);
    return job;
  }

  // Conflict: the key already exists. Return it only if it's the caller's;
  // otherwise it belongs to another caller — refuse rather than resume/leak it.
  const [winner] = await db
    .select()
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.idempotencyKey, idempotencyKey),
        eq(generationJobs.userId, caller.userId)
      )
    )
    .limit(1);
  if (winner) return winner;
  throw new ConflictError('This idempotency key is already in use.');
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

    await db
      .update(generationJobs)
      .set({
        status: 'succeeded',
        title: deriveJobTitle(job.input, result),
        result: toWireResult(result),
        charged: result.usage.charged,
        pdfUrl: `/api/v1/resumes/${jobId}/pdf`,
        profileId: job.input.profileId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

    // Persist the compiled PDF bytes to object storage (best-effort, no-op if
    // R2 unconfigured). Mirrors the web SSE path via the shared helper.
    await storeResumePdf(jobId, result.pdf, log);

    log.info('job.succeeded', { charged: result.usage.charged });
  } catch (err) {
    const envelope = toErrorEnvelope(err, jobId);
    log.error('job.failed', { code: envelope.error.code, step: envelope.error.step }, err);
    await db
      .update(generationJobs)
      .set({ status: 'failed', error: envelope.error, updatedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
  }
}
