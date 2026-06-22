/**
 * Shared persistence helpers for completed generations.
 *
 * Both transports persist a finished generation the same way: the public v1 job
 * runner (which inserts a `queued` row up front, then updates it) and the web UI
 * SSE route (which runs the pipeline synchronously, then writes one terminal
 * row). This module is the single source of truth for the persisted wire shape,
 * the human-friendly title, and the best-effort insert — so "the API is the UI"
 * holds at the storage layer too.
 */

import 'server-only';
import { eq } from 'drizzle-orm';
import { generationJobs } from '@/lib/db/schema';
import type { runGenerationPipeline } from '@/server/core/pipeline';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';
import type { Logger } from '@/server/log/logger';

type PipelineResult = Awaited<ReturnType<typeof runGenerationPipeline>>;

/** Max length of a derived title (keeps list rows tidy and the column small). */
const MAX_TITLE_LEN = 80;

/**
 * Wire-shaped result persisted on the job. Drops the raw PDF bytes (recompiled
 * on demand via /api/v1/resumes/{id}/pdf) and keeps everything an agent or the
 * web UI needs to re-render the result, including the billing `usage`.
 */
export function toWireResult(r: PipelineResult) {
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
 * Derive a human-friendly title for the "My Resumes" list. Prefers the
 * candidate's professional title from the tailored resume, falls back to the
 * first line of the job description, then a generic label. Pure + testable.
 */
export function deriveJobTitle(input: GenerateInput, result?: PipelineResult): string {
  const label = result?.resumeData?.basics?.label?.trim();
  if (label) return truncate(label);

  const firstLine = input.jobDescription
    ?.split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine) return truncate(firstLine);

  return 'Untitled resume';
}

/** Trim a string to MAX_TITLE_LEN, appending an ellipsis when cut. */
function truncate(s: string): string {
  return s.length > MAX_TITLE_LEN ? `${s.slice(0, MAX_TITLE_LEN - 1).trimEnd()}…` : s;
}

export interface PersistCompletedJobArgs {
  caller: Caller;
  input: GenerateInput;
  idempotencyKey: string;
  result: PipelineResult;
  logger: Logger;
}

/**
 * Best-effort insert of a terminal (`succeeded`) job row for a generation that
 * already ran and (if applicable) already charged. This NEVER re-runs the
 * pipeline or touches billing — it only records the computed result so the web
 * UI gains the same history the v1 API already has.
 *
 * Safety: any DB error is logged and swallowed (returns null) so persistence
 * can never block delivery of the SSE result. On an idempotency-key collision
 * (e.g. an SSE reconnect after the first run already persisted) it returns the
 * existing row's id instead of erroring.
 */
export async function persistCompletedJob(
  args: PersistCompletedJobArgs
): Promise<{ jobId: string } | null> {
  const { caller, input, idempotencyKey, result, logger } = args;
  try {
    // Imported lazily so the pure helpers above stay unit-testable without a DB
    // connection (the Neon client initializes at import time).
    const { db } = await import('@/lib/db/client');
    const [inserted] = await db
      .insert(generationJobs)
      .values({
        userId: caller.userId,
        status: 'succeeded',
        title: deriveJobTitle(input, result),
        input,
        result: toWireResult(result),
        charged: result.usage.charged,
        idempotencyKey,
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: generationJobs.idempotencyKey })
      .returning({ id: generationJobs.id });

    if (inserted) {
      // Backfill the pdfUrl now that we know the row id (mirrors the v1 runner).
      await db
        .update(generationJobs)
        .set({ pdfUrl: `/api/v1/resumes/${inserted.id}/pdf` })
        .where(eq(generationJobs.id, inserted.id));
      return { jobId: inserted.id };
    }

    // Conflict: a row for this idempotency key already exists — reuse its id.
    const [existing] = await db
      .select({ id: generationJobs.id })
      .from(generationJobs)
      .where(eq(generationJobs.idempotencyKey, idempotencyKey))
      .limit(1);
    return existing ? { jobId: existing.id } : null;
  } catch (err) {
    logger.error('persist.failed', { userId: caller.userId }, err);
    return null;
  }
}
