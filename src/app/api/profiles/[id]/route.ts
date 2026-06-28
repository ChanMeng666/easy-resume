/**
 * Candidate profile detail API — fetch, update, delete a single profile.
 *
 *   GET    /api/profiles/{id}  -> { id, label, rawBackground, data, createdAt, updatedAt }
 *   PUT    /api/profiles/{id}  -> updated profile (label/rawBackground/data; re-parses on raw change)
 *   DELETE /api/profiles/{id}  -> { deleted: true }
 *
 * Owner-scoped via the store: a non-owner (or missing) profile surfaces as
 * NotFound, never Forbidden, so existence stays hidden.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { getProfile, updateProfile, deleteProfile } from '@/server/profiles/store';
import { candidateProfileUpdateSchema } from '@/lib/validation/schema';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// A profile update with a changed background re-parses (an LLM call), so cap it
// per user — mirrors the protection on the other LLM-bearing endpoints.
const PROFILE_WRITE_LIMIT = 20;
const PROFILE_WRITE_WINDOW_SECONDS = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { id } = await params;
    const profile = await getProfile(caller.userId, id);
    return NextResponse.json(
      {
        id: profile.id,
        label: profile.label,
        rawBackground: profile.rawBackground,
        data: profile.data,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `profilewrite:${caller.userId}`,
      PROFILE_WRITE_LIMIT,
      PROFILE_WRITE_WINDOW_SECONDS
    );

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = candidateProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid profile update', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    if (parsed.data.label === undefined && parsed.data.rawBackground === undefined) {
      throw new ValidationError('No fields to update');
    }

    const profile = await updateProfile(caller.userId, id, parsed.data);
    return NextResponse.json(
      {
        id: profile.id,
        label: profile.label,
        rawBackground: profile.rawBackground,
        data: profile.data,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      { headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
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

    const { id } = await params;
    await deleteProfile(caller.userId, id);
    return NextResponse.json({ deleted: true }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
