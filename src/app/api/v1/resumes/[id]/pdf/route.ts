/**
 * Public v1 API — fetch the compiled PDF for a succeeded job.
 *
 *   GET /api/v1/resumes/{id}/pdf
 *   Authorization: Bearer vitex_<prefix>_<secret>
 *   -> application/pdf
 *
 * The PDF bytes are not stored (R2 persistence is a later phase). Instead we
 * recompile the job's Typst source on demand; the compile cache makes this an
 * instant cache hit since the pipeline already compiled it once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { compileTypstToPdf } from '@/server/core/compile';
import { UnauthenticatedError, NotFoundError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

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

    const typstCode = (job.result as { typstCode?: string } | null)?.typstCode;
    if (job.status !== 'succeeded' || !typstCode) {
      throw new NotFoundError('PDF is not available for this job yet');
    }

    const { pdf } = await compileTypstToPdf(typstCode);
    // Re-wrap to an ArrayBuffer-backed view so it satisfies BodyInit.
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resume-${id}.pdf"`,
        'X-Request-Id': requestId,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
