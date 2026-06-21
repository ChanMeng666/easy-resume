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

/** Convert any thrown value into the canonical error envelope. */
export function toErrorEnvelope(err: unknown, requestId?: string): ErrorEnvelope {
  const appError: AppError = toAppError(err);
  return {
    error: {
      code: appError.code,
      message: appError.message,
      retriable: appError.retriable,
      step: appError.step,
      requestId,
      details: appError.details,
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
