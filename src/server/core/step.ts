/**
 * Shared agent-step runner for the generation and refinement pipelines.
 *
 * Both pipelines wrap each LLM call in the same bounded-retry + typed-error
 * machinery: only RETRIABLE infrastructure blips (timeout/429/5xx/dropped
 * connection) are retried with exponential backoff; permanent/user errors fail
 * fast. Any failure (after retries) becomes a typed `PipelineStepError`. All of
 * this runs strictly PRE-compile, so it can never touch billing — a step that
 * exhausts its retries throws and the run is free.
 *
 * Extracted verbatim from the generation pipeline so both callers stay in
 * lockstep; behavior is identical.
 */

import 'server-only';
import { AppError, PipelineStepError, type PipelineStep } from '@/server/errors/AppError';
import type { Logger } from '@/server/log/logger';

// Bounded retry for transient infrastructure failures on the LLM steps. All
// retries happen BEFORE compile/charge, so they can never affect billing — a
// step that exhausts its retries throws PipelineStepError and the run is free.
const MAX_STEP_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;

/** Default backoff sleep; injectable via makeStepRunner so tests run instantly. */
export const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide whether a thrown error is a RETRIABLE infrastructure blip (timeout,
 * 429, 5xx, dropped connection) versus a permanent/user error (bad input,
 * 4xx, schema/validation) that retrying can't fix. Defaults to NOT retriable so
 * a deterministic logic bug fails fast instead of burning the retry budget.
 */
export function isRetriableInfraError(err: unknown): boolean {
  if (err instanceof AppError) return err.retriable;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    // Vercel AI SDK APICallError exposes an explicit retriability hint.
    if (typeof e.isRetryable === 'boolean') return e.isRetryable;
    const status = (e.statusCode ?? e.status) as number | undefined;
    if (typeof status === 'number') return status === 408 || status === 429 || status >= 500;
    const code = e.code as string | undefined;
    if (
      typeof code === 'string' &&
      ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'EPIPE'].includes(code)
    ) {
      return true;
    }
  }
  return false;
}

/** Run a single agent step with bounded retry; failures become PipelineStepError. */
export type StepRunner = <T>(step: PipelineStep, fn: () => Promise<T>) => Promise<T>;

/**
 * Build a step runner bound to a logger (and an optional injected sleep).
 *
 * Run a single agent step with bounded retry + exponential backoff. Only
 * RETRIABLE infrastructure errors (timeout/429/5xx/dropped connection) are
 * retried; permanent/user errors fail immediately. Any failure (after retries)
 * becomes a typed PipelineStepError. All of this is pre-compile, so it never
 * touches billing.
 */
export function makeStepRunner(
  log: Logger,
  sleep: (ms: number) => Promise<void> = defaultSleep
): StepRunner {
  return async <T>(step: PipelineStep, fn: () => Promise<T>): Promise<T> => {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_STEP_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof PipelineStepError) throw err;
        lastErr = err;
        if (attempt < MAX_STEP_ATTEMPTS && isRetriableInfraError(err)) {
          log.warn('pipeline.step.retry', { step, attempt, message: String(err) });
          await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
          continue;
        }
        throw new PipelineStepError(step, `Pipeline step "${step}" failed`, err);
      }
    }
    // Unreachable (the loop either returns or throws), but satisfies the type.
    throw new PipelineStepError(step, `Pipeline step "${step}" failed`, lastErr);
  };
}
