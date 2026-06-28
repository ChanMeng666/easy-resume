/**
 * Candidate profiles API — list and create persistent backgrounds.
 *
 *   GET  /api/profiles            -> { items: ProfileSummary[] }
 *   POST /api/profiles            -> 201 { id, label, createdAt, updatedAt }
 *     body: { label?, rawBackground }  (background is always parsed server-side)
 *
 * Cookie-session (or Bearer) authed via getCaller and owner-scoped. Errors are
 * rendered through the shared machine-readable envelope. This is the same store
 * the public v1 API resolves `profile_id` against, so "the API is the UI" holds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { listProfiles, createProfile } from '@/server/profiles/store';
import { candidateProfileInputSchema } from '@/lib/validation/schema';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Creating a profile parses the background with an LLM, so cap it per user to
// stop an authenticated caller from burning model spend at scale (the same
// reason /api/generate and POST /api/v1/resumes are rate limited).
const PROFILE_WRITE_LIMIT = 20;
const PROFILE_WRITE_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const items = await listProfiles(caller.userId);
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
      `profilewrite:${caller.userId}`,
      PROFILE_WRITE_LIMIT,
      PROFILE_WRITE_WINDOW_SECONDS
    );

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = candidateProfileInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid profile input', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    const profile = await createProfile(caller.userId, parsed.data);
    return NextResponse.json(
      {
        id: profile.id,
        label: profile.label,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      { status: 201, headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
