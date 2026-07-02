/**
 * Conversational edit-agent turn API (SSE).
 *
 *   POST /api/threads/{id}/messages   body: { message }
 *
 * Streams a single edit turn: the model edits the thread's working resume via the
 * controlled tools, and the route forwards assistant text + tool calls + the
 * re-rendered resume over SSE (mirroring /api/generate's encoder), then persists
 * the turn (user + tool + assistant messages) via the owner-scoped store.
 *
 * FREE — no billing on this path. The only re-render is the deterministic Typst
 * generator (no LLM re-tailor, no compile here; the client recompiles the streamed
 * Typst via the free /api/compile). Owner-scoped + UUID-guarded.
 */

import { NextRequest } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { loadHistory, latestResumeSnapshot, threadMaxSequence, appendTurn, tailHistoryWindow, type TurnMessageInput } from '@/server/agent/store';
import { runEditTurn, defaultEditAgentDeps } from '@/server/agent/editAgent';
import type { HistoryMessage } from '@/server/agent/editAgent.types';
import { threadMessageSchema, type ResumeData } from '@/lib/validation/schema';
import { NotFoundError, UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { toErrorEnvelope, errorResponse } from '@/server/errors/envelope';
import { createLogger } from '@/server/log/logger';
import { enforceRateLimit, rateLimitHeaders, type RateLimitResult } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Per-user cap on edit turns. Each turn is a bounded tool-loop (free), but the LLM
// still costs us tokens, so rate-limit per user as the primary abuse guard.
const CHAT_LIMIT = 30;
const CHAT_WINDOW_SECONDS = 60;
// Hard cap on the request body (a message is at most 8k chars + small JSON
// overhead); rejected before parsing so a huge body can't be buffered first.
const MAX_BODY_BYTES = 32_000;
// Replay only the most recent text turns to the model. The system prompt carries
// the LIVE resume/letter state, so older turns are conversational color, not
// state — a long thread otherwise grows the prompt monotonically.
const HISTORY_WINDOW = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Send an SSE event. */
function sendEvent(controller: ReadableStreamDefaultController, encoder: TextEncoder, data: object): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const log = createLogger({ requestId, route: 'thread.messages' });

  const caller = await getCaller(request);
  if (!caller) return errorResponse(new UnauthenticatedError(), requestId);

  const { id: threadId } = await params;
  if (!UUID_RE.test(threadId)) return errorResponse(new NotFoundError('Conversation not found'), requestId);

  let rl: RateLimitResult;
  try {
    rl = await enforceRateLimit(`chat:${caller.userId}`, CHAT_LIMIT, CHAT_WINDOW_SECONDS);
  } catch (error) {
    return errorResponse(error, requestId);
  }

  // Reject an oversized (or unmeasurable) body BEFORE reading/parsing it (the zod
  // 8k cap only fires after the full body is buffered). Our client always sends a
  // string JSON body, so a finite Content-Length within the cap is required; a
  // missing/non-finite length is refused so a chunked/no-length body can't bypass
  // the guard and be buffered first. A real edit message is a sentence or two.
  const rawLen = request.headers.get('content-length');
  const contentLength = rawLen === null ? Number.NaN : Number(rawLen);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return errorResponse(new ValidationError('Message body is missing a valid length or is too large'), requestId);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(new ValidationError('Invalid JSON body'), requestId);
  }
  const parsed = threadMessageSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      new ValidationError('Invalid message', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      }),
      requestId
    );
  }
  const userMessage = parsed.data.message;

  // Resolve the thread + its working resume up front (owner-scoped → NotFound for
  // non-owners) so an error surfaces cleanly before the stream opens.
  let templateId: string;
  let history: HistoryMessage[];
  let baseResume: ResumeData;
  // The thread's current working cover letter ('' when the anchored resume has
  // none), seeded into the agent so a letter edit builds on prior letter edits.
  let baseCoverLetter = '';
  let baseCoverLetterTypst = '';
  // The thread's max sequence at load time — passed to appendTurn for optimistic
  // concurrency so a turn racing another on the same thread can't silently drop edits.
  let baseSeq = 0;
  try {
    // latestResumeSnapshot + threadMaxSequence + loadHistory are each owner-scoped
    // (→ NotFound for a non-owner), so resolving them is the owner-check.
    //
    // Read the baseline sequence FIRST, then the snapshot/history. This ordering
    // closes the lost-update window: if a concurrent turn persists after this read,
    // baseSeq is stale-low and appendTurn(expectedBaseSeq) will ConflictError; the
    // snapshot we then read reflects state >= baseSeq, so we never persist edits
    // built on data older than the sequence we claim to extend.
    baseSeq = await threadMaxSequence(caller.userId, threadId);
    const snapshot = await latestResumeSnapshot(caller.userId, threadId);
    baseResume = snapshot.resumeData;
    templateId = snapshot.templateId;
    baseCoverLetter = snapshot.coverLetter ?? '';
    baseCoverLetterTypst = snapshot.coverLetterTypst ?? '';
    const prior = await loadHistory(caller.userId, threadId);
    // Replay only user + assistant TEXT turns (the live resume is injected fresh),
    // windowed to the most recent HISTORY_WINDOW: old turns add token cost without
    // adding state (the system prompt carries the live resume/letter). A dropped
    // prefix is flagged with a static one-liner so the model knows there's a gap.
    const allText = prior
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const windowed = tailHistoryWindow(allText, HISTORY_WINDOW);
    history = windowed.truncated
      ? [{ role: 'assistant' as const, content: 'Earlier conversation omitted.' }, ...windowed.items]
      : windowed.items;
  } catch (error) {
    return errorResponse(error, requestId);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const safeSend = (data: object) => {
        try {
          sendEvent(controller, encoder, data);
        } catch {
          /* stream closed */
        }
      };
      const heartbeatId = setInterval(() => safeSend({ type: 'heartbeat' }), 15_000);

      try {
        const result = await runEditTurn(
          { baseResume, templateId, baseCoverLetter, baseCoverLetterTypst, history, userMessage, signal: request.signal },
          defaultEditAgentDeps({ onEvent: (e) => safeSend(e), logger: log })
        );

        // Persist the turn (free, owner-scoped). The assistant message carries the
        // resume snapshot when the resume OR the cover letter changed, so a reopen
        // restores both edits. The snapshot always records the CURRENT working
        // letter (not only when it changed this turn) so a resume-only turn can't
        // drop a letter edited in a prior turn.
        const messages: TurnMessageInput[] = [{ role: 'user', content: userMessage }];
        for (const call of result.toolCalls) {
          messages.push({ role: 'tool', content: '', toolName: call.toolName, toolArgs: call.args, toolResult: call.result });
        }
        const changedSomething = result.changed || result.coverLetterChanged;
        messages.push({
          role: 'assistant',
          content: result.assistantText,
          toolResult: changedSomething
            ? {
                resumeData: result.resumeData,
                typstCode: result.typstCode,
                templateId,
                // Include the letter fields only when a letter exists, so a
                // resume-only thread keeps writing the pre-letter snapshot shape.
                ...(result.coverLetter
                  ? { coverLetter: result.coverLetter, coverLetterTypst: result.coverLetterTypst }
                  : {}),
              }
            : null,
        });

        // Persist the turn. If this fails (e.g. a concurrent turn won the optimistic
        // base-sequence check, or a DB error), the turn was NOT saved — tell the
        // client via the error envelope and do NOT emit `saved`/`done`, so it can
        // surface "not saved, please retry" instead of silently losing the edit.
        try {
          await appendTurn(caller.userId, threadId, messages, { expectedBaseSeq: baseSeq });
        } catch (persistErr) {
          const envelope = toErrorEnvelope(persistErr, requestId);
          log.error('thread.persist_failed', { code: envelope.error.code }, persistErr);
          safeSend({ type: 'error', message: envelope.error.message, error: envelope.error });
          return; // finally{} clears the heartbeat + closes the stream
        }
        safeSend({ type: 'saved' });
        safeSend({ type: 'done' });
      } catch (error) {
        const envelope = toErrorEnvelope(error, requestId);
        log.error('thread.turn_failed', { code: envelope.error.code }, error);
        safeSend({ type: 'error', message: envelope.error.message, error: envelope.error });
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
