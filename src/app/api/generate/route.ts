/**
 * Resume generation pipeline API route (web UI transport).
 *
 * Thin SSE adapter over the transport-agnostic core
 * (src/server/core/pipeline.ts). It only: authenticates the caller, opens an
 * SSE stream, forwards `onProgress` events, and emits the final result or a
 * machine-readable error envelope. The actual 8-step pipeline + server-side
 * compilation + outcome-based billing all live in the core, shared with the
 * public v1 API.
 */

import { NextRequest } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { runGenerationPipeline } from '@/server/core/pipeline';
import { defaultDeps } from '@/server/core/deps';
import { getProfile } from '@/server/profiles/store';
import { reserveJob, finalizeSucceededJob, failJob } from '@/server/jobs/persist';
import type { GenerateInput } from '@/server/core/pipeline.types';
import { UnauthenticatedError, ValidationError, ConflictError } from '@/server/errors/AppError';
import { toErrorEnvelope, errorResponse } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import { enforceRateLimit, rateLimitHeaders, type RateLimitResult } from '@/server/ratelimit';

// Per-user generation cap for the interactive web flow.
const GEN_LIMIT = 15;
const GEN_WINDOW_SECONDS = 60;

export const runtime = 'nodejs';

/** Send an SSE event to the stream. */
function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: object
): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

/** POST — authenticate, run the pipeline, stream progress + result via SSE. */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createLogger({ requestId, route: 'generate' });

  const caller = await getCaller(request);
  if (!caller) return errorResponse(new UnauthenticatedError(), requestId);

  let rl: RateLimitResult;
  try {
    rl = await enforceRateLimit(`gen:${caller.userId}`, GEN_LIMIT, GEN_WINDOW_SECONDS);
  } catch (error) {
    return errorResponse(error, requestId);
  }

  let body: {
    jobDescription?: string;
    background?: string;
    templateId?: string;
    profileId?: string;
    parentJobId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse(new ValidationError('Invalid JSON body'), requestId);
  }

  // A refine carries the job it refines, so the new generation records the
  // version chain. Ownership is verified inside reserveJob; anything that isn't a
  // strict UUID is dropped here (no chain link) so a malformed value never
  // reaches the uuid-typed column comparison.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const parentJobId =
    typeof body.parentJobId === 'string' && UUID_RE.test(body.parentJobId)
      ? body.parentJobId
      : undefined;

  // A stable client idempotency key dedupes a generation intent across retries /
  // reconnects. It is the RESERVATION key (not the charge key): the charge is
  // keyed on the reserved job id below.
  const headerKey = request.headers.get('Idempotency-Key');
  const idempotencyKey =
    headerKey && /^[0-9a-f-]{36}$/i.test(headerKey) ? headerKey : crypto.randomUUID();

  // Resolve a saved profile (owner-checked) up front so a NotFound surfaces as a
  // clean error response rather than mid-stream. When present, the profile's raw
  // background fills `background` and its parsed data seeds `baseResume`, letting
  // the pipeline skip the parse_background LLM step ("enter once, reuse many").
  const input: GenerateInput = {
    jobDescription: body.jobDescription ?? '',
    background: body.background ?? '',
    templateId: body.templateId,
  };
  if (typeof body.profileId === 'string' && body.profileId.trim()) {
    try {
      const profile = await getProfile(caller.userId, body.profileId.trim());
      input.background = profile.rawBackground;
      input.baseResume = profile.data;
      input.profileId = profile.id;
      input.voiceSample = profile.voiceSample ?? undefined;
    } catch (error) {
      return errorResponse(error, requestId);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Reserve a generation slot up front. This is the idempotency anchor that
      // makes "one credit, at most one delivered result" hold even under
      // concurrent same-key requests, key reuse after a delete, or a cross-user
      // key — see reserveJob. A reservation failure (DB down) surfaces as an
      // error rather than running unguarded.
      let jobId: string;
      try {
        const reservation = await reserveJob({ caller, input, idempotencyKey, parentJobId });
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
              ? 'A generation for this request is already in progress.'
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
        log.error('generate.reserve_failed', { code: envelope.error.code }, error);
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

      // Run the pipeline in ITS OWN try. Only a genuine pipeline failure (no
      // charge, or a charged:false race that throws) may mark the job failed.
      let result;
      try {
        result = await runGenerationPipeline(
          input,
          caller,
          defaultDeps({
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
          // Charge is keyed on the reserved jobId — per-user and per-job, so a
          // deleted job's key can never replay an old charge.
          { idempotencyKey: jobId }
        );
      } catch (error) {
        const envelope = toErrorEnvelope(error, requestId);
        log.error('generate.failed', { code: envelope.error.code, step: envelope.error.step }, error);
        // Mark the reserved job failed so it isn't stuck in `running` and the key
        // can be reclaimed by a retry.
        await failJob(jobId, envelope.error, log);
        safeSend({ type: 'error', message: envelope.error.message, error: envelope.error });
        clearInterval(heartbeatId);
        controller.close();
        return;
      }

      // Past this point the pipeline SUCCEEDED and the credit is charged (keyed on
      // jobId). A delivery/persist error here must NEVER mark the job failed —
      // doing so would let a retry reclaim and re-run it for free. So all sends
      // are best-effort and finalize swallows its own errors.
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
      // /editor?job=<id> and survive a refresh.
      const finalized = await finalizeSucceededJob({ jobId, input, result, logger: log });
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
