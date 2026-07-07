/**
 * Machine-readable error envelope.
 *
 * Both transports — the internal SSE route and the public REST API — render
 * failures through this single shape so that an AI agent (or the web client)
 * never has to parse free-form prose. The envelope is intentionally flat and
 * stable.
 */

import { NextResponse } from 'next/server';
import { AppError, toAppError, type ErrorCode, type PipelineStep } from './AppError';

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    retriable: boolean;
    step?: PipelineStep;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Serialize an Error's `cause` chain into a plain, JSON-safe object.
 *
 * Our pipeline wraps every failing step in a `PipelineStepError` whose `cause`
 * holds the ACTUAL underlying error (e.g. the OpenAI API error, a zod schema
 * violation). That root cause is the useful diagnostic, but it lives only on
 * `Error.cause` and would otherwise never reach a transport. This mirrors the
 * logger's `serializeError` so the same detail the server logs also travels in
 * the error envelope — letting the web UI surface a copyable debug log.
 *
 * Common diagnostic fields on AI-SDK / HTTP errors (`statusCode`, `code`,
 * `url`, `responseBody`) are pulled through when present.
 */
function serializeCause(err: unknown, depth = 0): Record<string, unknown> | undefined {
  if (depth > 5 || err === undefined || err === null) return undefined;
  if (!(err instanceof Error)) return { value: String(err) };

  const out: Record<string, unknown> = { name: err.name, message: err.message };
  const e = err as unknown as Record<string, unknown>;
  for (const key of ['code', 'statusCode', 'status', 'url', 'responseBody', 'isRetryable']) {
    if (typeof e[key] !== 'undefined') out[key] = e[key];
  }
  const nested = serializeCause((err as { cause?: unknown }).cause, depth + 1);
  if (nested) out.cause = nested;
  return out;
}

/** Convert any thrown value into the canonical error envelope. */
export function toErrorEnvelope(err: unknown, requestId?: string): ErrorEnvelope {
  const appError: AppError = toAppError(err);
  // Fold the underlying cause chain into details so the true failure reason
  // (not just "Pipeline step X failed") reaches the caller and the web UI.
  const cause = serializeCause(appError.cause);
  const details =
    appError.details || cause
      ? { ...(appError.details ?? {}), ...(cause ? { cause } : {}) }
      : undefined;
  return {
    error: {
      code: appError.code,
      message: appError.message,
      retriable: appError.retriable,
      step: appError.step,
      requestId,
      details,
    },
  };
}

/** Build a Next.js JSON response carrying the error envelope and correct status. */
export function errorResponse(err: unknown, requestId?: string): NextResponse {
  const appError: AppError = toAppError(err);
  const headers: Record<string, string> = { ...(appError.headers ?? {}) };
  if (requestId) headers['X-Request-Id'] = requestId;
  return NextResponse.json(toErrorEnvelope(appError, requestId), {
    status: appError.httpStatus,
    headers: Object.keys(headers).length ? headers : undefined,
  });
}
