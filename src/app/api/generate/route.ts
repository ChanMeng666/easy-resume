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
import { persistCompletedJob, findCompletedJobByKey } from '@/server/jobs/persist';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
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

  let body: { jobDescription?: string; background?: string; templateId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse(new ValidationError('Invalid JSON body'), requestId);
  }

  // A stable idempotency key lets a reconnecting client avoid double-charging.
  const headerKey = request.headers.get('Idempotency-Key');
  const idempotencyKey =
    headerKey && /^[0-9a-f-]{36}$/i.test(headerKey) ? headerKey : crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Idempotency replay: if this key already produced a result, stream THAT
      // stored result instead of re-running the pipeline. Re-running would
      // deliver a fresh result under the already-settled (deduped) charge — i.e.
      // one credit buying multiple PDFs when a key is reused (a real abuse
      // vector with attacker-controlled inputs). It also makes a reconnect/retry
      // of a completed run free. Done before any heavy work or heartbeat.
      const prior = await findCompletedJobByKey(caller.userId, idempotencyKey);
      if (prior) {
        sendEvent(controller, encoder, { type: 'result', data: prior.result });
        sendEvent(controller, encoder, { type: 'saved', jobId: prior.jobId });
        sendEvent(controller, encoder, { type: 'done' });
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

      try {
        const result = await runGenerationPipeline(
          {
            jobDescription: body.jobDescription ?? '',
            background: body.background ?? '',
            templateId: body.templateId,
          },
          caller,
          defaultDeps({
            requestId,
            onProgress: (e) =>
              sendEvent(controller, encoder, {
                type: 'progress',
                step: e.index,
                total: e.total,
                message: e.message,
                stepName: e.step,
              }),
          }),
          { idempotencyKey }
        );

        sendEvent(controller, encoder, {
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

        // Persist the finished generation so the web user keeps a history entry
        // (same `generationJobs` model the v1 API uses). Best-effort and off the
        // delivery critical path: the result is already streamed above, and a DB
        // failure is swallowed inside persistCompletedJob. A `saved` event lets
        // the client deep-link /editor?job=<id> and survive a refresh.
        const saved = await persistCompletedJob({
          caller,
          input: {
            jobDescription: body.jobDescription ?? '',
            background: body.background ?? '',
            templateId: body.templateId,
          },
          idempotencyKey,
          result,
          logger: log,
        });
        if (saved) sendEvent(controller, encoder, { type: 'saved', jobId: saved.jobId });

        sendEvent(controller, encoder, { type: 'done' });
      } catch (error) {
        const envelope = toErrorEnvelope(error, requestId);
        log.error('generate.failed', { code: envelope.error.code, step: envelope.error.step }, error);
        // Send both the envelope and a flat `message` for client back-compat.
        sendEvent(controller, encoder, {
          type: 'error',
          message: envelope.error.message,
          error: envelope.error,
        });
      } finally {
        clearInterval(heartbeatId);
        controller.close();
      }
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
