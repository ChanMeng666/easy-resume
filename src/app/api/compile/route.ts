/**
 * Typst compilation API route.
 *
 * Thin transport wrapper over the `compileTypstToPdf` core
 * (src/server/core/compile.ts). Keeps the existing contract for the web client:
 * POST { typstCode } -> application/pdf, with X-Cache HIT/MISS. Errors are
 * rendered as the machine-readable envelope.
 *
 * Server-side Typst compilation spends CPU and disk, so the route is
 * authenticated (any valid caller) and per-user rate limited — it is not an open
 * compile endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { compileTypstToPdf } from '@/server/core/compile';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Per-user compile cap. Compilation is cheap (<100ms) but not free, so this
// bounds abuse loops while comfortably covering interactive editing.
const COMPILE_LIMIT = 30;
const COMPILE_WINDOW_SECONDS = 60;

/** POST handler for Typst compilation. */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `compile:${caller.userId}`,
      COMPILE_LIMIT,
      COMPILE_WINDOW_SECONDS
    );

    let typstCode: unknown;
    try {
      ({ typstCode } = await request.json());
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    if (typeof typstCode !== 'string') {
      throw new ValidationError('typstCode is required and must be a string');
    }

    const { pdf, cached } = await compileTypstToPdf(typstCode);

    // Re-wrap to an ArrayBuffer-backed view so it satisfies BodyInit.
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'X-Cache': cached ? 'HIT' : 'MISS',
        'X-Request-Id': requestId,
        'Cache-Control': 'private, max-age=3600',
        ...rateLimitHeaders(rl),
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
