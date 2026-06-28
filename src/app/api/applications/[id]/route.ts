/**
 * Application detail API — fetch, update, delete a single application.
 *
 *   GET    /api/applications/{id}  -> full application row
 *   PATCH  /api/applications/{id}  -> updated row (company/position/status/notes)
 *   DELETE /api/applications/{id}  -> { deleted: true }
 *
 * Owner-scoped via the store: a non-owner (or missing) application surfaces as
 * NotFound, never Forbidden, so existence stays hidden.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { getApplication, updateApplication, deleteApplication } from '@/server/applications/store';
import { applicationUpdateSchema } from '@/lib/validation/schema';
import { NotFoundError, UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

const APP_WRITE_LIMIT = 60;
const APP_WRITE_WINDOW_SECONDS = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard a route id before it reaches a UUID column comparison. A non-UUID id
 * would otherwise raise a raw Postgres cast error (surfacing as 500 INTERNAL);
 * we map it to NotFound so the response shape is controlled and existence stays
 * hidden (the same outcome as a well-formed id the caller doesn't own).
 */
function assertUuid(id: string): void {
  if (!UUID_RE.test(id)) throw new NotFoundError('Application not found');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { id } = await params;
    assertUuid(id);
    const app = await getApplication(caller.userId, id);
    return NextResponse.json(app, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `appwrite:${caller.userId}`,
      APP_WRITE_LIMIT,
      APP_WRITE_WINDOW_SECONDS
    );

    const { id } = await params;
    assertUuid(id);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = applicationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid application update', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    if (
      parsed.data.company === undefined &&
      parsed.data.position === undefined &&
      parsed.data.status === undefined &&
      parsed.data.notes === undefined
    ) {
      throw new ValidationError('No fields to update');
    }

    const app = await updateApplication(caller.userId, id, parsed.data);
    return NextResponse.json(app, {
      headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `appwrite:${caller.userId}`,
      APP_WRITE_LIMIT,
      APP_WRITE_WINDOW_SECONDS
    );

    const { id } = await params;
    assertUuid(id);
    await deleteApplication(caller.userId, id);
    return NextResponse.json(
      { deleted: true },
      { headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
