/**
 * Web history API — list the signed-in user's generated resumes.
 *
 *   GET /api/resumes
 *   (cookie session OR Bearer key, resolved by getCaller)
 *   -> { items: [{ id, title, status, atsScore?, templateId?, hasCoverLetter,
 *                  createdAt, pdfUrl? }] }
 *
 * This is the web-facing counterpart to the public v1 job API. Both read the
 * same `generationJobs` table, so a generation made in the browser and one made
 * by an agent show up in the same history. The list ships only the lightweight
 * summary fields — the full resume/typst/cover-letter payload is fetched per
 * item via GET /api/resumes/{id}.
 */

import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { UnauthenticatedError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

/** Newest-first cap for the history list (backed by idx_generation_jobs_user_created). */
const LIST_LIMIT = 50;

/** Narrow the persisted JSONB result to the summary fields the list needs. */
interface WireResultSummary {
  atsScore?: number;
  templateId?: string;
  coverLetter?: string;
  resumeData?: { basics?: { label?: string } };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rows = await db
      .select({
        id: generationJobs.id,
        title: generationJobs.title,
        status: generationJobs.status,
        result: generationJobs.result,
        pdfUrl: generationJobs.pdfUrl,
        createdAt: generationJobs.createdAt,
      })
      .from(generationJobs)
      .where(eq(generationJobs.userId, caller.userId))
      .orderBy(desc(generationJobs.createdAt))
      .limit(LIST_LIMIT);

    const items = rows.map((row) => {
      const result = (row.result ?? undefined) as WireResultSummary | undefined;
      return {
        id: row.id,
        // Client falls back to the same label heuristic for pre-migration NULLs.
        title: row.title ?? result?.resumeData?.basics?.label ?? 'Untitled resume',
        status: row.status,
        atsScore: result?.atsScore,
        templateId: result?.templateId,
        hasCoverLetter: Boolean(result?.coverLetter),
        createdAt: row.createdAt,
        pdfUrl: row.status === 'succeeded' ? `/api/v1/resumes/${row.id}/pdf` : undefined,
      };
    });

    return NextResponse.json({ items }, { headers: { 'X-Request-Id': requestId } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
