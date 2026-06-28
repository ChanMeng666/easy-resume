/**
 * Web history API — list every version in a refine chain.
 *
 *   GET /api/resumes/{id}/versions
 *   -> { items: [{ id, title, atsScore, createdAt, isCurrent }], rootId }
 *
 * A refine creates a NEW generation_jobs row that records its parent and the
 * chain root (see reserveJob). This returns all succeeded jobs sharing the same
 * root, oldest-first, so the editor can show a version strip and let the user
 * open any prior version for free. Owner-scoped: a job that isn't the caller's
 * (or any cross-user row in the chain) is never returned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq, or } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { UnauthenticatedError, NotFoundError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

interface VersionResultSummary {
  atsScore?: number;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { id } = await params;

    // Resolve the requested job owner-scoped, and derive the chain root.
    const [job] = await db
      .select({
        id: generationJobs.id,
        userId: generationJobs.userId,
        rootJobId: generationJobs.rootJobId,
      })
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);
    if (!job || job.userId !== caller.userId) throw new NotFoundError('Resume not found');

    const rootId = job.rootJobId ?? job.id;

    // All succeeded jobs in this chain: the root itself OR any row rooted at it.
    const rows = await db
      .select({
        id: generationJobs.id,
        title: generationJobs.title,
        result: generationJobs.result,
        createdAt: generationJobs.createdAt,
      })
      .from(generationJobs)
      .where(
        and(
          eq(generationJobs.userId, caller.userId),
          eq(generationJobs.status, 'succeeded'),
          or(eq(generationJobs.id, rootId), eq(generationJobs.rootJobId, rootId))
        )
      )
      .orderBy(asc(generationJobs.createdAt));

    const items = rows.map((row, index) => {
      const result = (row.result ?? undefined) as VersionResultSummary | undefined;
      return {
        id: row.id,
        title: row.title ?? 'Untitled resume',
        version: index + 1,
        atsScore: result?.atsScore,
        createdAt: row.createdAt,
        isCurrent: row.id === id,
      };
    });

    return NextResponse.json({ items, rootId }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
