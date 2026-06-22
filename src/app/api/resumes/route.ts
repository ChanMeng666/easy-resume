/**
 * Web history API — list the signed-in user's generated resumes.
 *
 *   GET /api/resumes?q=<search>&limit=<n>&offset=<n>
 *   (cookie session OR Bearer key, resolved by getCaller)
 *   -> { items: [...], total, limit, offset, hasMore }
 *
 * This is the web-facing counterpart to the public v1 job API. Both read the
 * same `generationJobs` table, so a generation made in the browser and one made
 * by an agent show up in the same history. The list ships only the lightweight
 * summary fields — the full resume/typst/cover-letter payload is fetched per
 * item via GET /api/resumes/{id}. `q` matches the derived title or the original
 * job-description text (case-insensitive).
 */

import { NextRequest, NextResponse } from 'next/server';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { UnauthenticatedError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Narrow the persisted JSONB result to the summary fields the list needs. */
interface WireResultSummary {
  atsScore?: number;
  templateId?: string;
  coverLetter?: string;
  resumeData?: { basics?: { label?: string } };
}

/** Parse a non-negative integer query param with a fallback and ceiling. */
function intParam(raw: string | null, fallback: number, max: number): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const { searchParams } = request.nextUrl;
    const q = (searchParams.get('q') ?? '').trim();
    const limit = Math.max(intParam(searchParams.get('limit'), DEFAULT_LIMIT, MAX_LIMIT), 1);
    const offset = intParam(searchParams.get('offset'), 0, Number.MAX_SAFE_INTEGER);

    const conditions: SQL[] = [eq(generationJobs.userId, caller.userId)];
    if (q) {
      const pattern = `%${q}%`;
      const search = or(
        ilike(generationJobs.title, pattern),
        sql`${generationJobs.input}->>'jobDescription' ILIKE ${pattern}`
      );
      if (search) conditions.push(search);
    }
    const where = and(...conditions);

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(generationJobs)
      .where(where);

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
      .where(where)
      .orderBy(desc(generationJobs.createdAt))
      .limit(limit)
      .offset(offset);

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

    return NextResponse.json(
      { items, total, limit, offset, hasMore: offset + rows.length < total },
      { headers: { 'X-Request-Id': requestId } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
