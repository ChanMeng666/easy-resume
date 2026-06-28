/**
 * Conversational edit-agent threads API — list and open conversations.
 *
 *   GET  /api/threads          -> { items: ThreadSummary[] }
 *   POST /api/threads          -> 201 created | 200 existing { thread, created }
 *     body: { generationJobId }  (a succeeded resume the caller owns)
 *
 * Cookie-session (or Bearer) authed via getCaller and owner-scoped. Opening a
 * thread is free — no billing happens here. POST is idempotent on the active
 * (user, job) conversation: it returns the existing thread instead of spawning
 * duplicates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { listThreads, getOrCreateThreadForJob } from '@/server/agent/store';
import { threadCreateSchema } from '@/lib/validation/schema';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Opening a thread is cheap (no LLM), but cap per user as a basic abuse guard,
// consistent with the other authenticated write endpoints.
const THREAD_WRITE_LIMIT = 60;
const THREAD_WRITE_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const items = await listThreads(caller.userId);
    return NextResponse.json({ items }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `threadwrite:${caller.userId}`,
      THREAD_WRITE_LIMIT,
      THREAD_WRITE_WINDOW_SECONDS
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = threadCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid thread input', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const { thread, created } = await getOrCreateThreadForJob(caller.userId, parsed.data.generationJobId);
    return NextResponse.json(
      { thread, created },
      { status: created ? 201 : 200, headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
