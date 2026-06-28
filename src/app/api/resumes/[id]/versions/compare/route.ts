/**
 * Web history API — compare two versions of a resume side by side (read-only).
 *
 *   GET /api/resumes/{id}/versions/compare?against={otherId}
 *   -> { a: VersionDetail, b: VersionDetail }
 *
 * Both jobs are resolved owner-scoped (a non-owner/missing job → NotFound, never
 * leaked). This is purely a read of two persisted results — no LLM, no charge.
 * `a` is {id}, `b` is {otherId}.
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { UnauthenticatedError, NotFoundError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CompareResultShape {
  atsScore?: number;
  matchAnalysis?: { matchedSkills?: string[]; missingSkills?: string[] };
  resumeData?: { basics?: { summary?: string } };
}

/** Resolve one owner-scoped job into the comparable summary. Throws NotFound otherwise. */
async function loadVersionDetail(userId: string, id: string) {
  const [job] = await db
    .select({
      id: generationJobs.id,
      userId: generationJobs.userId,
      title: generationJobs.title,
      versionLabel: generationJobs.versionLabel,
      result: generationJobs.result,
      createdAt: generationJobs.createdAt,
    })
    .from(generationJobs)
    .where(eq(generationJobs.id, id))
    .limit(1);
  if (!job || job.userId !== userId) throw new NotFoundError('Resume not found');

  const result = (job.result ?? {}) as CompareResultShape;
  return {
    id: job.id,
    title: job.title ?? 'Untitled resume',
    versionLabel: job.versionLabel ?? undefined,
    atsScore: result.atsScore,
    matchedSkills: result.matchAnalysis?.matchedSkills ?? [],
    missingSkills: result.matchAnalysis?.missingSkills ?? [],
    summary: result.resumeData?.basics?.summary ?? '',
    createdAt: job.createdAt,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { id } = await params;
    const against = request.nextUrl.searchParams.get('against');
    if (!against || !UUID_RE.test(against)) {
      throw new ValidationError('A valid `against` version id is required');
    }
    if (!UUID_RE.test(id)) throw new NotFoundError('Resume not found');

    const [a, b] = await Promise.all([
      loadVersionDetail(caller.userId, id),
      loadVersionDetail(caller.userId, against),
    ]);

    return NextResponse.json({ a, b }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
