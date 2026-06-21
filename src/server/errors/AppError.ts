/**
 * Typed application errors.
 *
 * Every failure in the backend core is represented as an `AppError` subclass so
 * that transports (SSE route, public REST API) can render a single, stable,
 * machine-readable error envelope. The product principle is "errors must be
 * AI-readable, not human prose" — so each error carries a stable `code`, an
 * HTTP status, a `retriable` hint, and the pipeline `step` where it happened.
 */

export type PipelineStep =
  | 'validate'
  | 'parse_jd'
  | 'parse_background'
  | 'analyze_match'
  | 'tailor'
  | 'score_ats'
  | 'cover_letter'
  | 'render'
  | 'compile'
  | 'billing';

/** Stable, machine-readable error codes. Never reuse or repurpose a code. */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'INSUFFICIENT_CREDITS'
  | 'RATE_LIMITED'
  | 'PIPELINE_STEP_FAILED'
  | 'PIPELINE_COMPILATION_FAILED'
  | 'PIPELINE_TIMEOUT'
  | 'NOT_FOUND'
  | 'INTERNAL';

/**
 * Base class for all application errors.
 * Carries everything a caller (human or agent) needs to react programmatically.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly retriable: boolean;
  readonly step?: PipelineStep;
  readonly details?: Record<string, unknown>;
  /** Extra HTTP headers to attach to the error response (e.g. Retry-After). */
  readonly headers?: Record<string, string>;

  constructor(
    code: ErrorCode,
    message: string,
    opts: {
      httpStatus: number;
      retriable?: boolean;
      step?: PipelineStep;
      details?: Record<string, unknown>;
      headers?: Record<string, string>;
      cause?: unknown;
    }
  ) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = opts.httpStatus;
    this.retriable = opts.retriable ?? false;
    this.step = opts.step;
    this.details = opts.details;
    this.headers = opts.headers;
  }
}

/** Request body / arguments failed validation. */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_FAILED', message, { httpStatus: 400, step: 'validate', details });
  }
}

/** No valid session cookie or API key was presented. */
export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHENTICATED', message, { httpStatus: 401 });
  }
}

/** Caller is authenticated but has no credits left to produce a result. */
export class InsufficientCreditsError extends AppError {
  constructor(message = 'Insufficient credits to generate a result') {
    super('INSUFFICIENT_CREDITS', message, { httpStatus: 402, retriable: false, step: 'billing' });
  }
}

/** Rate limit exceeded. Carries Retry-After / X-RateLimit-* headers for agents. */
export class RateLimitedError extends AppError {
  constructor(opts?: {
    limit?: number;
    remaining?: number;
    resetSeconds?: number;
    message?: string;
  }) {
    const headers: Record<string, string> = {};
    if (opts?.limit !== undefined) headers['X-RateLimit-Limit'] = String(opts.limit);
    if (opts?.remaining !== undefined) headers['X-RateLimit-Remaining'] = String(opts.remaining);
    if (opts?.resetSeconds !== undefined) {
      headers['X-RateLimit-Reset'] = String(opts.resetSeconds);
      headers['Retry-After'] = String(opts.resetSeconds);
    }
    super('RATE_LIMITED', opts?.message ?? 'Rate limit exceeded', {
      httpStatus: 429,
      retriable: true,
      headers,
      details: {
        limit: opts?.limit,
        remaining: opts?.remaining,
        resetSeconds: opts?.resetSeconds,
      },
    });
  }
}

/** A non-compile pipeline step (an LLM agent call) failed. */
export class PipelineStepError extends AppError {
  constructor(step: PipelineStep, message: string, cause?: unknown) {
    super('PIPELINE_STEP_FAILED', message, { httpStatus: 502, retriable: true, step, cause });
  }
}

/** Typst -> PDF compilation produced an error. */
export class CompilationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PIPELINE_COMPILATION_FAILED', message, {
      httpStatus: 422,
      retriable: false,
      step: 'compile',
      details,
    });
  }
}

/** Typst compilation exceeded its time budget. */
export class CompilationTimeoutError extends AppError {
  constructor(message = 'Compilation timed out') {
    super('PIPELINE_TIMEOUT', message, { httpStatus: 504, retriable: true, step: 'compile' });
  }
}

/** Requested resource does not exist or is not visible to the caller. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super('NOT_FOUND', message, { httpStatus: 404 });
  }
}

/**
 * Wrap an unknown thrown value into an AppError.
 * Unknown errors become INTERNAL/500 and are treated as non-retriable.
 */
export function toAppError(err: unknown, step?: PipelineStep): AppError {
  if (err instanceof AppError) return err;
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  return new AppError('INTERNAL', message, { httpStatus: 500, retriable: false, step, cause: err });
}
