/**
 * Public v1 API — poll a generation job.
 *
 *   GET /api/v1/resumes/{id}
 *   Authorization: Bearer vitex_<prefix>_<secret>
 *   -> { id, status, result?, error?, usage? }
 *
 * `status` is one of: queued | running | succeeded | failed.
 * On success, `result` carries the structured resume + cover letter and a
 * `pdfUrl` to fetch the compiled PDF. On failure, `error` is the canonical
 * machine-readable envelope.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
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

    // Hide existence from non-owners — return NotFound, not Forbidden.
    if (!job || job.userId !== caller.userId) throw new NotFoundError('Job not found');

    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
        result: job.result ?? undefined,
        error: job.error ?? undefined,
        pdfUrl: job.status === 'succeeded' ? `/api/v1/resumes/${job.id}/pdf` : undefined,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
