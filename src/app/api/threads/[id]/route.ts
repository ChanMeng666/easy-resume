/**
 * Conversational edit-agent thread detail API.
 *
 *   GET /api/threads/{id}  -> { thread, messages }
 *
 * Owner-scoped via the store: a non-owner (or missing) thread surfaces as
 * NotFound, never Forbidden, so existence stays hidden. The route id is
 * UUID-guarded so a malformed id maps to NotFound rather than a raw PG 500.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { getThread, loadHistory } from '@/server/agent/store';
import { NotFoundError, UnauthenticatedError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard a route id before it reaches a UUID column comparison. A non-UUID id
 * would otherwise raise a raw Postgres cast error (surfacing as 500 INTERNAL);
 * map it to NotFound so the response shape is controlled and existence stays
 * hidden (same outcome as a well-formed id the caller doesn't own).
 */
function assertUuid(id: string): void {
  if (!UUID_RE.test(id)) throw new NotFoundError('Conversation not found');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { id } = await params;
    assertUuid(id);
    const thread = await getThread(caller.userId, id);
    const messages = await loadHistory(caller.userId, id);
    return NextResponse.json({ thread, messages }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
