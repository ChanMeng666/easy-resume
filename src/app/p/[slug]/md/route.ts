/**
 * Public career endpoint — machine Markdown (`/p/{slug}/md`).
 *
 * Unauthenticated, per-IP rate limited. Renders the ALLOWLIST projection of a
 * PUBLISHED profile as clean, agent-readable Markdown; an unknown or unpublished
 * slug returns the standard NotFound envelope.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicProfileBySlug } from '@/server/profiles/store';
import { renderPublicProfileMarkdown } from '@/server/profiles/publicMarkdown';
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

    const markdown = renderPublicProfileMarkdown(profile);
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'X-Request-Id': requestId,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
