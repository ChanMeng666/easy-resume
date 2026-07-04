/**
 * Targeted refinement API route (web UI transport).
 *
 * Thin SSE adapter over the transport-agnostic refinement core
 * (src/server/core/refine.ts). It authenticates the caller, loads the parent
 * generation (owner-scoped), builds the refine artifacts, opens an SSE stream,
 * forwards `onProgress`, and emits the final result or a machine-readable error
 * envelope. The 4-step revise → score → render → compile pipeline — and its
 * (currently free) billing — all live in the core, shared with the future v1
 * refine endpoint.
 *
 * Mirrors /api/generate's SSE event shapes exactly (progress/result/saved/
 * error/done/heartbeat) so the editor consumes both with the same reader.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getCaller } from '@/server/auth/caller';
import { runRefinementPipeline, type RefineArtifacts } from '@/server/core/refine';
import { inferRefineScope } from '@/server/core/refineScope';
import { defaultRefineDeps } from '@/server/core/deps';
import { buildRefineArtifacts } from '@/server/jobs/refineArtifacts';
import { resolveRefineVoiceSample } from '@/server/jobs/refineVoice';
import { reserveJob, finalizeSucceededJob, failJob } from '@/server/jobs/persist';
import { generationJobs } from '@/lib/db/schema';
import type { GenerateInput } from '@/server/core/pipeline.types';
import {
  UnauthenticatedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '@/server/errors/AppError';
import { toErrorEnvelope, errorResponse } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import { enforceRateLimit, rateLimitHeaders, type RateLimitResult } from '@/server/ratelimit';

// Per-user refinement cap for the interactive web flow. Tighter than generation
// (15/min): a refine is cheaper but is one click, so this bounds abuse loops.
const REFINE_LIMIT = 10;
const REFINE_WINDOW_SECONDS = 60;

// Strict UUID for the parent job id — anything else never reaches the uuid-typed
// column comparison (mirrors /api/generate's parentJobId guard).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtime = 'nodejs';

/** Stored-input shape for a refine row: self-describing so a refine-of-refine
 *  carries full context and deriveJobTitle works off the inherited JD. */
type RefineJobInput = GenerateInput & {
  refineOfJobId: string;
  feedback: string;
  scope: 'resume' | 'cover_letter' | 'both';
};

const bodySchema = z.object({
  refineOfJobId: z.string().regex(UUID_RE, 'refineOfJobId must be a valid job id'),
  feedback: z.string().trim().min(1, 'feedback is required').max(8000, 'feedback is too long'),
  scope: z.enum(['resume', 'cover_letter', 'both']).optional(),
});

/** Send an SSE event to the stream. */
function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: object
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

/** POST — authenticate, load the parent, run the refine pipeline, stream via SSE. */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createLogger({ requestId, route: 'refine' });

  const caller = await getCaller(request);
  if (!caller) return errorResponse(new UnauthenticatedError(), requestId);

  let rl: RateLimitResult;
  try {
    rl = await enforceRateLimit(`refine:${caller.userId}`, REFINE_LIMIT, REFINE_WINDOW_SECONDS);
  } catch (error) {
    return errorResponse(error, requestId);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return errorResponse(new ValidationError('Invalid JSON body'), requestId);
  }

  const parsedBody = bodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return errorResponse(
      new ValidationError('Invalid refinement request', {
        issues: parsedBody.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      }),
      requestId
    );
  }
  const { refineOfJobId, feedback } = parsedBody.data;
  // `scope` is an optional explicit override (v1 API / old clients still send
  // it). When omitted — the converged web editor no longer asks — infer it
  // deterministically from the feedback text (no LLM, zero added latency).
  const scope = parsedBody.data.scope ?? inferRefineScope(feedback);

  // A stable client idempotency key dedupes a refine intent across retries /
  // reconnects (same semantics as /api/generate). It is the RESERVATION key; the
  // charge (when enabled) is keyed on the reserved job id below.
  const headerKey = request.headers.get('Idempotency-Key');
  const idempotencyKey =
    headerKey && /^[0-9a-f-]{36}$/i.test(headerKey) ? headerKey : crypto.randomUUID();

  // Load the parent generation up front (owner-scoped) so a NotFound surfaces as
  // a clean HTTP error rather than mid-stream. Existence is hidden on miss /
  // cross-user / not-ready — all map to NotFound.
  let artifacts: RefineArtifacts;
  let storedInput: RefineJobInput;
  try {
    const { db } = await import('@/lib/db/client');
    const [parent] = await db
      .select({
        userId: generationJobs.userId,
        status: generationJobs.status,
        input: generationJobs.input,
        result: generationJobs.result,
        rootJobId: generationJobs.rootJobId,
      })
      .from(generationJobs)
      .where(eq(generationJobs.id, refineOfJobId))
      .limit(1);

    if (
      !parent ||
      parent.userId !== caller.userId ||
      parent.status !== 'succeeded' ||
      !parent.result
    ) {
      return errorResponse(new NotFoundError('Resume not found'), requestId);
    }

    const parentInputObj = (parent.input ?? {}) as { jobDescription?: string; background?: string };
    const parentResult = parent.result as Parameters<typeof buildRefineArtifacts>[1];

    // Throws ValidationError when the parent has no resume data.
    artifacts = buildRefineArtifacts(parentInputObj, parentResult);

    // Re-fetch the originating profile's voice (owner-scoped, best-effort) so the
    // cover-letter revision keeps the candidate's voice. Never persisted into the
    // result — resolved fresh here. Any failure → undefined (no voice).
    artifacts.voiceSample = await resolveRefineVoiceSample(
      caller,
      parent.input as Parameters<typeof resolveRefineVoiceSample>[1],
      parent.rootJobId
    );

    // Self-describing input for the reserved row: full parent context + this
    // refine's request, so a refine-of-refine carries everything downstream.
    storedInput = {
      jobDescription: parentInputObj.jobDescription ?? '',
      background: parentInputObj.background ?? '',
      templateId: artifacts.templateId,
      refineOfJobId,
      feedback,
      scope,
    };
  } catch (error) {
    return errorResponse(error, requestId);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Reserve a refine slot up front (idempotency anchor), recording the parent
      // job so the new row joins the version chain. A replay streams the stored
      // result without re-running; a concurrent same-key request is refused.
      let jobId: string;
      try {
        const reservation = await reserveJob({
          caller,
          input: storedInput,
          idempotencyKey,
          parentJobId: refineOfJobId,
        });
        if (reservation.mode === 'replay') {
          sendEvent(controller, encoder, { type: 'result', data: reservation.result });
          sendEvent(controller, encoder, { type: 'saved', jobId: reservation.jobId });
          sendEvent(controller, encoder, { type: 'done' });
          controller.close();
          return;
        }
        if (reservation.mode === 'in_progress' || reservation.mode === 'conflict') {
          const err = new ConflictError(
            reservation.mode === 'in_progress'
              ? 'A refinement for this request is already in progress.'
              : 'This idempotency key is already in use.',
            reservation.mode === 'in_progress'
          );
          const envelope = toErrorEnvelope(err, requestId);
          sendEvent(controller, encoder, {
            type: 'error',
            message: envelope.error.message,
            error: envelope.error,
          });
          controller.close();
          return;
        }
        jobId = reservation.jobId;
      } catch (error) {
        const envelope = toErrorEnvelope(error, requestId);
        log.error('refine.reserve_failed', { code: envelope.error.code }, error);
        sendEvent(controller, encoder, {
          type: 'error',
          message: envelope.error.message,
          error: envelope.error,
        });
        controller.close();
        return;
      }

      // Heartbeat keeps proxies/mobile browsers from dropping the long stream.
      const heartbeatId = setInterval(() => {
        try {
          sendEvent(controller, encoder, { type: 'heartbeat' });
        } catch {
          /* stream closed */
        }
      }, 15_000);

      // Send that never throws into control flow — a closed stream (client
      // disconnect) must not abort post-success bookkeeping.
      const safeSend = (data: object) => {
        try {
          sendEvent(controller, encoder, data);
        } catch {
          /* stream closed */
        }
      };

      // Run the refinement in ITS OWN try. Only a genuine failure (no charge)
      // may mark the job failed.
      let result;
      try {
        result = await runRefinementPipeline(
          artifacts,
          { feedback, scope },
          caller,
          defaultRefineDeps({
            requestId,
            onProgress: (e) =>
              safeSend({
                type: 'progress',
                step: e.index,
                total: e.total,
                message: e.message,
                stepName: e.step,
              }),
          }),
          // Charge (when enabled) is keyed on the reserved jobId — per-user and
          // per-job, so a deleted job's key can never replay an old charge.
          { idempotencyKey: jobId }
        );
      } catch (error) {
        const envelope = toErrorEnvelope(error, requestId);
        log.error('refine.failed', { code: envelope.error.code, step: envelope.error.step }, error);
        // Mark the reserved job failed so it isn't stuck in `running` and the key
        // can be reclaimed by a retry.
        await failJob(jobId, envelope.error, log);
        safeSend({ type: 'error', message: envelope.error.message, error: envelope.error });
        clearInterval(heartbeatId);
        controller.close();
        return;
      }

      // Past this point the refinement SUCCEEDED. A delivery/persist error here
      // must NEVER mark the job failed (a retry would reclaim and re-run it), so
      // all sends are best-effort and finalize swallows its own errors.
      clearInterval(heartbeatId);
      safeSend({
        type: 'result',
        data: {
          resumeData: result.resumeData,
          typstCode: result.typstCode,
          atsScore: result.atsScore,
          matchAnalysis: result.matchAnalysis,
          coverLetter: result.coverLetter,
          coverLetterTypst: result.coverLetterTypst,
          templateId: result.templateId,
          usage: result.usage,
        },
      });

      // Finalize the reserved row to `succeeded` + store the PDF. The `saved`
      // event (only on a successful write) lets the client deep-link
      // /editor?job=<id> and refresh the version strip.
      const finalized = await finalizeSucceededJob({ jobId, input: storedInput, result, logger: log });
      if (finalized) safeSend({ type: 'saved', jobId });
      safeSend({ type: 'done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Request-Id': requestId,
      ...rateLimitHeaders(rl),
    },
  });
}
