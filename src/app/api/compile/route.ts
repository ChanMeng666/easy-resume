/**
 * Typst compilation API route.
 *
 * Thin transport wrapper over the `compileTypstToPdf` core
 * (src/server/core/compile.ts). Keeps the existing contract for the web client:
 * POST { typstCode } -> application/pdf, with X-Cache HIT/MISS. Errors are
 * rendered as the machine-readable envelope.
 */

import { NextRequest, NextResponse } from 'next/server';
import { compileTypstToPdf } from '@/server/core/compile';
import { ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

/** POST handler for Typst compilation. */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
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
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

/** OPTIONS handler for CORS preflight. */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
