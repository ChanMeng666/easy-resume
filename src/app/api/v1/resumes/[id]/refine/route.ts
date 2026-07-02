/**
 * Public v1 API — refine an existing resume (async job).
 *
 * "The API is the UI": the same targeted refinement the web editor runs, exposed
 * to agents over HTTP with a Bearer API key. A refine builds on a previous
 * generation's stored artifacts, so the parent job id is the path param; the body
 * carries the natural-language feedback + optional scope. Like generation this is
 * asynchronous — POST creates a job (reusing the shared job runner, which
 * dispatches refine-shaped inputs to the refinement core) and returns a handle to
 * poll via GET /api/v1/resumes/{jobId}.
 *
 *   POST /api/v1/resumes/{id}/refine
 *   Authorization: Bearer vitex_<prefix>_<secret>
 *   Idempotency-Key: <uuid>            # optional; must be a UUID. Dedupes the job.
 *   { "feedback": "Tighten the summary ...", "scope": "resume" }
 *   -> 202 { id, status, _links: { self, pdf } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getCaller } from '@/server/auth/caller';
import { createJob, type RefineJobInput } from '@/server/jobs/runner';
import { buildRefineArtifacts } from '@/server/jobs/refineArtifacts';
import { UnauthenticatedError, ValidationError, NotFoundError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Per-user cap for the public refine API. Matches the web refine flow (10/min):
// a refine is cheaper than a generation but the abuse surface is the same.
const API_LIMIT = 10;
const API_WINDOW_SECONDS = 60;

const bodySchema = z.object({
  feedback: z.string().trim().min(1, 'feedback is required').max(8000, 'feedback is too long'),
  scope: z.enum(['resume', 'cover_letter', 'both']).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(`v1refine:${caller.userId}`, API_LIMIT, API_WINDOW_SECONDS);

    // The parent job id is the path param. A malformed id can never match a real
    // (uuid-typed) row, so treat it as not-found — the same hiding semantics the
    // owner check below uses (never leak existence).
    const { id: parentJobId } = await params;
    if (!UUID_RE.test(parentJobId)) throw new NotFoundError('Resume not found');

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Invalid refinement request', {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const { feedback } = parsed.data;
    const scope = parsed.data.scope ?? 'resume';

    // Idempotency-Key must be a UUID; otherwise we generate one server-side (same
    // handling as POST /api/v1/resumes). This is the RESERVATION key for the job.
    const headerKey = request.headers.get('Idempotency-Key');
    const idempotencyKey = headerKey && UUID_RE.test(headerKey) ? headerKey : crypto.randomUUID();

    // Validate the parent UP FRONT (owner-scoped, succeeded, has a result) so a
    // bad request never creates a job row. The runner re-validates at run time
    // (the parent could be deleted between now and the background run).
    const [parent] = await db
      .select({
        userId: generationJobs.userId,
        status: generationJobs.status,
        input: generationJobs.input,
        result: generationJobs.result,
      })
      .from(generationJobs)
      .where(eq(generationJobs.id, parentJobId))
      .limit(1);

    if (!parent || parent.userId !== caller.userId || parent.status !== 'succeeded' || !parent.result) {
      throw new NotFoundError('Resume not found');
    }

    const parentInputObj = (parent.input ?? {}) as { jobDescription?: string; background?: string };
    const parentResult = parent.result as Parameters<typeof buildRefineArtifacts>[1];
    // Throws ValidationError when the parent has no resume data to refine.
    const artifacts = buildRefineArtifacts(parentInputObj, parentResult);

    // Self-describing stored input (identical shape to the web refine route): full
    // parent context + this refine's request, so a refine-of-refine carries
    // everything downstream and the runner can dispatch it via isRefineInput.
    const storedInput: RefineJobInput = {
      jobDescription: parentInputObj.jobDescription ?? '',
      background: parentInputObj.background ?? '',
      templateId: artifacts.templateId,
      refineOfJobId: parentJobId,
      feedback,
      scope,
    };

    const job = await createJob(caller, storedInput, idempotencyKey);

    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
        _links: {
          self: `/api/v1/resumes/${job.id}`,
          pdf: `/api/v1/resumes/${job.id}/pdf`,
        },
      },
      { status: 202, headers: { 'X-Request-Id': requestId, ...rateLimitHeaders(rl) } }
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
