/**
 * Output formatting for the CLI. Human mode is a terse single line per result;
 * `--json` prints the raw machine value. Errors are rendered to stderr. This is
 * the only module besides cli.ts allowed to touch stdout/stderr.
 */

import { ApiError, PollTimeoutError, type JobHandle, type JobRecord } from './client.js';

/** Print a value: raw JSON when `json`, else a terse human string. */
export function emit(json: boolean, value: unknown, human: string): void {
  if (json) {
    process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  } else {
    process.stdout.write(human + '\n');
  }
}

/** One-line summary of a freshly created job handle (generate / refine). */
export function humanJobHandle(handle: JobHandle): string {
  return `job ${handle.id} — ${handle.status}`;
}

/** One-line summary of a polled/fetched job record, surfacing the ATS score. */
export function humanJobRecord(job: JobRecord): string {
  if (job.status === 'succeeded') {
    const ats = (job.result?.atsScore as number | undefined) ?? undefined;
    const score = ats === undefined ? '' : ` — ATS ${ats}`;
    return `job ${job.id} — succeeded${score} — pdf: ${job.pdfUrl ?? 'n/a'}`;
  }
  if (job.status === 'failed') {
    const code = job.error?.code ?? 'UNKNOWN';
    return `job ${job.id} — failed (${code}: ${job.error?.message ?? ''})`;
  }
  return `job ${job.id} — ${job.status}`;
}

/**
 * Render an error to stderr in the documented terse shape and return the exit
 * code the process should use. Never prints the API key.
 */
export function reportError(err: unknown): number {
  if (err instanceof ApiError) {
    const rid = err.requestId ? ` (${err.requestId})` : '';
    process.stderr.write(`error ${err.code}: ${err.message}${rid}\n`);
    return 3;
  }
  if (err instanceof PollTimeoutError) {
    process.stderr.write(`error POLL_TIMEOUT: ${err.message}\n`);
    return 4;
  }
  // UsageError is handled by name to avoid a hard import cycle with args.ts.
  if (err instanceof Error && err.name === 'UsageError') {
    process.stderr.write(`error USAGE: ${err.message}\n`);
    return 2;
  }
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`error UNEXPECTED: ${message}\n`);
  return 1;
}
