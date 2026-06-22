/**
 * Web history API — fetch or delete a single generated resume.
 *
 *   GET    /api/resumes/{id}  -> { id, status, title, input, result?, error?, pdfUrl?, createdAt }
 *   DELETE /api/resumes/{id}  -> { deleted: true }
 *
 * Cookie-session (or Bearer) authed via getCaller and owner-checked. GET returns
 * the full persisted result so the editor can re-open a past generation for free
 * (no pipeline re-run, no re-charge); `input` is included so the editor's Refine
 * can re-run with the original job description + background. Non-owners get
 * NotFound (never Forbidden) so a resume's existence stays hidden.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { deleteJobPdfs } from '@/server/jobs/persist';
import { createLogger } from '@/server/log/logger';
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

    if (!job || job.userId !== caller.userId) throw new NotFoundError('Resume not found');

    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
        title: job.title ?? undefined,
        input: job.input,
        result: job.result ?? undefined,
        error: job.error ?? undefined,
        pdfUrl: job.status === 'succeeded' ? `/api/v1/resumes/${job.id}/pdf` : undefined,
        createdAt: job.createdAt,
      },
      { headers: { 'X-Request-Id': requestId } }
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
    const [job] = await db
      .select({ userId: generationJobs.userId })
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);

    if (!job || job.userId !== caller.userId) throw new NotFoundError('Resume not found');

    await db.delete(generationJobs).where(eq(generationJobs.id, id));
    // Best-effort: drop the stored PDFs so object storage doesn't keep orphans.
    await deleteJobPdfs(id, createLogger({ requestId, route: 'resumes.delete' }));

    return NextResponse.json({ deleted: true }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
