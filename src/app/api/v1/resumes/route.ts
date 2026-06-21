/**
 * Public v1 API — create a resume generation job.
 *
 * "The API is the UI": an AI agent authenticates with a Bearer API key (no
 * browser, cookie, 2FA, or CAPTCHA), POSTs a job description + background, and
 * receives a job handle to poll. The web UI and this endpoint run the exact
 * same pipeline core.
 *
 *   POST /api/v1/resumes
 *   Authorization: Bearer vitex_<prefix>_<secret>
 *   { "jobDescription": "...", "background": "...", "templateId": "two-column" }
 *   -> 202 { id, status, _links: { self, pdf } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCaller } from '@/server/auth/caller';
import { createJob } from '@/server/jobs/runner';
import { UnauthenticatedError, ValidationError } from '@/server/errors/AppError';
import { errorResponse } from '@/server/errors/envelope';
import { enforceRateLimit, rateLimitHeaders } from '@/server/ratelimit';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Per-user cap for the public agent API.
const API_LIMIT = 30;
const API_WINDOW_SECONDS = 60;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const caller = await getCaller(request);
    if (!caller) throw new UnauthenticatedError();

    const rl = await enforceRateLimit(`v1gen:${caller.userId}`, API_LIMIT, API_WINDOW_SECONDS);

    let body: { jobDescription?: unknown; background?: unknown; templateId?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    if (typeof body.jobDescription !== 'string' || !body.jobDescription.trim()) {
      throw new ValidationError('jobDescription is required');
    }
    if (typeof body.background !== 'string' || !body.background.trim()) {
      throw new ValidationError('background is required');
    }
    if (body.templateId != null && typeof body.templateId !== 'string') {
      throw new ValidationError('templateId must be a string');
    }

    // Idempotency-Key must be a UUID; otherwise we generate one server-side.
    const headerKey = request.headers.get('Idempotency-Key');
    const idempotencyKey = headerKey && UUID_RE.test(headerKey) ? headerKey : crypto.randomUUID();

    const job = await createJob(
      caller,
      {
        jobDescription: body.jobDescription,
        background: body.background,
        templateId: body.templateId as string | undefined,
      },
      idempotencyKey
    );

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
