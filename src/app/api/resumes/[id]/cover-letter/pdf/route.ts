/**
 * Web history API — fetch the compiled cover-letter PDF for a generation.
 *
 *   GET /api/resumes/{id}/cover-letter/pdf
 *   (cookie session OR Bearer key, resolved by getCaller)
 *   -> application/pdf
 *
 * Cookie-authed + owner-checked. The pipeline compiles only the resume PDF, so
 * the cover-letter PDF is compiled from the stored `coverLetterTypst` on first
 * access (instant via the compile cache) and lazily backfilled to object storage
 * (R2) for subsequent requests. 404 when the job has no cover letter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { compileTypstToPdf } from '@/server/core/compile';
import { getBlobStore, coverLetterPdfKey } from '@/server/storage/blobStore';
import { UnauthenticatedError, NotFoundError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

/** Wrap PDF bytes in an ArrayBuffer-backed view satisfying BodyInit. */
function pdfResponse(bytes: Uint8Array, id: string, requestId: string, source: 'r2' | 'compiled') {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="cover-letter-${id}.pdf"`,
      'X-Request-Id': requestId,
      'X-Pdf-Source': source,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { id } = await params;
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);

    if (!job || job.userId !== caller.userId) throw new NotFoundError('Job not found');

    const coverLetterTypst = (job.result as { coverLetterTypst?: string } | null)?.coverLetterTypst;
    if (job.status !== 'succeeded' || !coverLetterTypst) {
      throw new NotFoundError('Cover letter is not available for this job');
    }

    // 1) Serve the stored copy from object storage when available.
    const store = getBlobStore();
    const key = coverLetterPdfKey(id);
    if (store.enabled) {
      const stored = await store.get(key);
      if (stored) return pdfResponse(stored, id, requestId, 'r2');
    }

    // 2) Otherwise compile on demand, then lazily backfill to storage.
    const { pdf } = await compileTypstToPdf(coverLetterTypst);
    if (store.enabled) void store.put(key, pdf, 'application/pdf');
    return pdfResponse(pdf, id, requestId, 'compiled');
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
