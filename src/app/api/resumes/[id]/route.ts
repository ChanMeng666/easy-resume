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
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { deleteJobPdfs } from '@/server/jobs/persist';
import { createLogger } from '@/server/log/logger';
import { versionLabelUpdateSchema } from '@/lib/validation/schema';
import {
  UnauthenticatedError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

// Renaming a version is a cheap write (no LLM); cap it per user as a basic guard.
const RESUME_WRITE_LIMIT = 60;
const RESUME_WRITE_WINDOW_SECONDS = 60;

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

    // Don't ship the (potentially large) pre-parsed `baseResume` back to the
    // client: only `jobDescription` + `background` are needed to re-open or
    // refine, and refine deliberately re-parses anyway.
    const inputForClient: Record<string, unknown> = { ...(job.input ?? {}) };
    delete inputForClient.baseResume;

    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
        title: job.title ?? undefined,
        input: inputForClient,
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

/**
 * PATCH /api/resumes/{id} — rename a version (set/clear version_label).
 * Owner-scoped: a non-owner row is never updated and surfaces as NotFound.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(
      `reswrite:${caller.userId}`,
      RESUME_WRITE_LIMIT,
      RESUME_WRITE_WINDOW_SECONDS
    );

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = versionLabelUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Invalid version label', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }

    // An empty label clears it (falls back to the derived title in the strip).
    const versionLabel = parsed.data.versionLabel.length > 0 ? parsed.data.versionLabel : null;

    // Owner-scoped conditional update; a non-owner/missing row updates nothing.
    const [updated] = await db
      .update(generationJobs)
      .set({ versionLabel, updatedAt: new Date() })
      .where(and(eq(generationJobs.id, id), eq(generationJobs.userId, caller.userId)))
      .returning({ id: generationJobs.id, versionLabel: generationJobs.versionLabel });
    if (!updated) throw new NotFoundError('Resume not found');

    return NextResponse.json(
      { id: updated.id, versionLabel: updated.versionLabel },
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

    // Atomic, conditional delete: owner-scoped AND only terminal (succeeded /
    // failed) rows. Doing the terminal-status check in the same statement avoids
    // a TOCTOU where a `failed` row is reclaimed to `running` between a separate
    // check and the delete — which would otherwise drop an in-flight reservation
    // the pipeline is about to charge on.
    const deleted = await db
      .delete(generationJobs)
      .where(
        and(
          eq(generationJobs.id, id),
          eq(generationJobs.userId, caller.userId),
          inArray(generationJobs.status, ['succeeded', 'failed'])
        )
      )
      .returning({ id: generationJobs.id });

    if (deleted.length === 0) {
      // Nothing deleted: distinguish "not yours / missing" from "in flight" for a
      // useful error. This read is only for messaging — the delete above already
      // committed (to nothing), so there's no race to lose.
      const [job] = await db
        .select({ userId: generationJobs.userId, status: generationJobs.status })
        .from(generationJobs)
        .where(eq(generationJobs.id, id))
        .limit(1);
      if (!job || job.userId !== caller.userId) throw new NotFoundError('Resume not found');
      throw new ConflictError('This generation is still in progress.', true);
    }

    // Best-effort: drop the stored PDFs so object storage doesn't keep orphans.
    await deleteJobPdfs(id, createLogger({ requestId, route: 'resumes.delete' }));

    return NextResponse.json({ deleted: true }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
