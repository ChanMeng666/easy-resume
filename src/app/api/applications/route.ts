/**
 * Application tracker API — list and create job applications.
 *
 *   GET  /api/applications            -> { items: ApplicationSummary[] }
 *     optional ?status=draft|applied|interview|offer|rejected filter
 *   POST /api/applications            -> 201 { id, company, position, status, ... }
 *     body: { company, position, status?, notes?, generationJobId? }
 *
 * Cookie-session (or Bearer) authed via getCaller and owner-scoped. Errors are
 * rendered through the shared machine-readable envelope. Tracking is free — no
 * billing happens here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { listApplications, createApplication } from '@/server/applications/store';
import {
  applicationCreateSchema,
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from '@/lib/validation/schema';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Writes are cheap (no LLM), but cap them per user as a basic abuse guard,
// consistent with the other authenticated write endpoints.
const APP_WRITE_LIMIT = 60;
const APP_WRITE_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const statusParam = request.nextUrl.searchParams.get('status') ?? undefined;
    if (statusParam !== undefined && !(APPLICATION_STATUSES as readonly string[]).includes(statusParam)) {
      throw new ValidationError('Invalid status filter', {
        allowed: APPLICATION_STATUSES,
      });
    }
    const status = statusParam as ApplicationStatus | undefined;

    const items = await listApplications(caller.userId, { status });
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
      `appwrite:${caller.userId}`,
      APP_WRITE_LIMIT,
      APP_WRITE_WINDOW_SECONDS
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = applicationCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid application input', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const app = await createApplication(caller.userId, parsed.data);
    return NextResponse.json(app, {
      status: 201,
      headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
