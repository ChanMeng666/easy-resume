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
import { toErrorEnvelope } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';

/** Wire-shaped result persisted on the job (PDF bytes are recompiled on demand). */
function toWireResult(r: Awaited<ReturnType<typeof runGenerationPipeline>>) {
  return {
    resumeData: r.resumeData,
    typstCode: r.typstCode,
    coverLetter: r.coverLetter,
    coverLetterTypst: r.coverLetterTypst,
    atsScore: r.atsScore,
    matchAnalysis: r.matchAnalysis,
    templateId: r.templateId,
    usage: r.usage,
  };
}

/**
 * Create (or return the existing) job for an idempotency key, then kick off the
 * pipeline in the background. Returns the job row immediately.
 */
export async function createJob(
  caller: Caller,
  input: GenerateInput,
  idempotencyKey: string
): Promise<GenerationJob> {
  const [existing] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existing) return existing;

  const [job] = await db
    .insert(generationJobs)
    .values({ userId: caller.userId, status: 'queued', input, idempotencyKey })
    .returning();

  // Detached: the long-lived VPS process keeps running this after the POST returns.
  void runJob(job.id, caller);
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
      { idempotencyKey: job.idempotencyKey }
    );

    await db
      .update(generationJobs)
      .set({
        status: 'succeeded',
        result: toWireResult(result),
        charged: result.usage.charged,
        pdfUrl: `/api/v1/resumes/${jobId}/pdf`,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

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
