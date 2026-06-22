/**
 * Object storage seam for compiled PDFs.
 *
 * The pipeline already compiles the billable PDF once; persisting those bytes to
 * an object store (Cloudflare R2, S3-compatible) lets the PDF routes serve a
 * stored copy instead of recompiling every time. When R2 is not configured we
 * fall back to a no-op `NullBlobStore`, and callers transparently recompile from
 * the stored Typst source — so the feature is purely additive and dev/test runs
 * need no storage credentials.
 *
 * This is the deliberate seam (mirroring `compile.ts`) where the storage backend
 * can change without touching callers.
 */

import 'server-only';
import { createR2Store } from './r2';

/** A minimal blob store: best-effort put, optional get. Never throws. */
export interface BlobStore {
  /** Whether this store actually persists (false for the no-op store). */
  readonly enabled: boolean;
  /** Store bytes at `key`. Returns true on success, false on any failure. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<boolean>;
  /** Fetch bytes at `key`, or null if absent / on any failure. */
  get(key: string): Promise<Uint8Array | null>;
}

/** No-op store used when R2 is unconfigured. Callers recompile instead. */
const nullStore: BlobStore = {
  enabled: false,
  async put() {
    return false;
  },
  async get() {
    return null;
  },
};

let cached: BlobStore | undefined;

/**
 * Resolve the process-wide blob store. Returns an R2-backed store when all
 * R2_* env vars are present, otherwise the no-op store. Memoized.
 */
export function getBlobStore(): BlobStore {
  if (cached) return cached;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (accountId && accessKeyId && secretAccessKey && bucket) {
    cached = createR2Store({ accountId, accessKeyId, secretAccessKey, bucket });
  } else {
    cached = nullStore;
  }
  return cached;
}

/** Stable R2 key for a job's compiled resume PDF. */
export function resumePdfKey(jobId: string): string {
  return `resumes/${jobId}.pdf`;
}

/** Stable R2 key for a job's compiled cover-letter PDF. */
export function coverLetterPdfKey(jobId: string): string {
  return `cover-letters/${jobId}.pdf`;
}
