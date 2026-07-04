/**
 * Public career endpoint — machine JSON (`/p/{slug}/json`).
 *
 * Unauthenticated, per-IP rate limited. Serves the ALLOWLIST projection of a
 * PUBLISHED profile only; an unknown or unpublished slug returns the standard
 * NotFound envelope. "LinkedIn is for humans; a Vitex endpoint is for AIs."
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicProfileBySlug } from '@/server/profiles/store';
import { enforcePublicReadLimit } from '@/server/profiles/publicAccess';
import { NotFoundError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    await enforcePublicReadLimit(request);

    const { slug } = await params;
    const profile = await getPublicProfileBySlug(slug);
    if (!profile) throw new NotFoundError('Profile not found');

    return NextResponse.json(profile, {
      headers: {
        'X-Request-Id': requestId,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
