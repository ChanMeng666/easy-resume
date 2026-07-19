/**
 * Shared persistence helpers for completed generations.
 *
 * Both transports persist a finished generation the same way: the public v1 job
 * runner (which inserts a `queued` row up front, then updates it) and the web UI
 * SSE route (which runs the pipeline synchronously, then writes one terminal
 * row). This module is the single source of truth for the persisted wire shape,
 * the human-friendly title, and the best-effort insert — so "the API is the UI"
 * holds at the storage layer too.
 */

import 'server-only';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { generationJobs } from '@/lib/db/schema';
import { generateTypstCode } from '@/lib/typst/generator';
import { generateCoverLetterTypst } from '@/lib/typst/cover-letter';
import { getTemplateById, renderTemplate } from '@/templates/registry';
import { DEFAULT_TOKENS, type DesignTokens } from '@/lib/design/tokens';
import { NotFoundError, ValidationError } from '@/server/errors/AppError';
import { trackEvent } from '@/server/analytics/track';
import type { ResumeData } from '@/lib/validation/schema';
import type { runGenerationPipeline } from '@/server/core/pipeline';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';
import type { Logger } from '@/server/log/logger';

type PipelineResult = Awaited<ReturnType<typeof runGenerationPipeline>>;

/** Max length of a derived title (keeps list rows tidy and the column small). */
const MAX_TITLE_LEN = 80;

/**
 * Wire-shaped result persisted on the job. Drops the raw PDF bytes (recompiled
 * on demand via /api/v1/resumes/{id}/pdf) and keeps everything an agent or the
 * web UI needs to re-render the result, including the billing `usage`.
 */
export function toWireResult(r: PipelineResult) {
  return {
    resumeData: r.resumeData,
    typstCode: r.typstCode,
    coverLetter: r.coverLetter,
    coverLetterTypst: r.coverLetterTypst,
    atsScore: r.atsScore,
    matchAnalysis: r.matchAnalysis,
    templateId: r.templateId,
    // Persist the design tokens so every re-render path (refine/edit/manual
    // version/preview) reproduces the exact palette. Old rows lack this → readers
    // fall back to DEFAULT_TOKENS (today's look).
    tokens: r.tokens,
    usage: r.usage,
    promptVersions: r.promptVersions,
    parsedJD: r.parsedJD,
  };
}

/**
 * Derive a human-friendly title for the "My Resumes" list. Prefers the
 * candidate's professional title from the tailored resume, falls back to the
 * first line of the job description, then a generic label. Pure + testable.
 */
export function deriveJobTitle(input: GenerateInput, result?: PipelineResult): string {
  const label = result?.resumeData?.basics?.label?.trim();
  if (label) return truncate(label);

  const firstLine = input.jobDescription
    ?.split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (firstLine) return truncate(firstLine);

  return 'Untitled resume';
}

/** Trim a string to MAX_TITLE_LEN, appending an ellipsis when cut. */
function truncate(s: string): string {
  return s.length > MAX_TITLE_LEN ? `${s.slice(0, MAX_TITLE_LEN - 1).trimEnd()}…` : s;
}

type WireResult = ReturnType<typeof toWireResult>;

/**
 * Outcome of reserving a generation slot for an idempotency key. The reservation
 * row (a `running` generation_job created up front) is the idempotency anchor for
 * the web SSE path — it makes the contract durable instead of charge-only:
 *
 *  - `created`/`reclaimed`: we own a fresh/retryable slot — run the pipeline and
 *    charge keyed on `jobId` (a per-job, per-user id that vanishes if the job is
 *    deleted, so a later key-reuse re-charges correctly).
 *  - `replay`: this key already produced a result — stream it, never re-run.
 *  - `in_progress`: a concurrent request owns the key — do not run a second time.
 *    Carries the `jobId` of the in-flight row so a polling caller (the v1 job
 *    runner) can hand its own row back; the web SSE path ignores it and 409s.
 *  - `conflict`: the key belongs to another user — refuse.
 */
export type ReserveResult =
  | { mode: 'created'; jobId: string }
  | { mode: 'reclaimed'; jobId: string }
  | { mode: 'replay'; jobId: string; result: WireResult }
  | { mode: 'in_progress'; jobId: string }
  | { mode: 'conflict' };

export interface ReserveJobArgs {
  caller: Caller;
  input: GenerateInput;
  idempotencyKey: string;
  /**
   * Refine lineage: the job this generation refines. When present and owned by
   * the caller, the new row records parent_job_id + root_job_id so the editor can
   * show a version chain. A missing/cross-user parent is silently ignored (the
   * generation still runs, just without a chain link).
   */
  parentJobId?: string;
  /**
   * Status a freshly-claimed (or reclaimed) row starts in. Defaults to
   * `'running'` for the web SSE callers, which run the pipeline synchronously
   * inside the request. The v1 job runner passes `'queued'`: its rows start
   * queued and `runJob` flips them to `'running'` when the background run begins.
   */
  initialStatus?: 'queued' | 'running';
}

/**
 * A job stuck in `queued`/`running` past this age is presumed dead — the
 * in-process runner died (VPS restart / crash) mid-generation. A real generation
 * takes seconds (worst case a few minutes under API slowness + the one corrective
 * re-tailor pass), so 30 minutes is a ~10x margin that cannot catch a healthy
 * in-flight run. Even if a pathologically slow run WERE swept, billing is keyed
 * on the jobId: a concurrent reclaim re-running the same jobId dedupes the charge
 * (charged:false → the pipeline refuses to deliver), so there is still no
 * over-delivery — only wasted compute.
 */
const STALE_JOB_MS = 30 * 60 * 1000;

/**
 * Sweep abandoned jobs: mark any `queued`/`running` row older than STALE_JOB_MS
 * as `failed` (retriable) so it stops blocking same-key retries with `in_progress`
 * and its key can be reclaimed. Best-effort and cheap (one indexed UPDATE that
 * matches nothing on a healthy system). Run opportunistically from the reserve
 * paths — no cron / external worker, consistent with the in-process job model.
 */
export async function sweepStaleRunningJobs(logger?: Logger): Promise<void> {
  try {
    const { db } = await import('@/lib/db/client');
    const cutoff = new Date(Date.now() - STALE_JOB_MS);
    await db
      .update(generationJobs)
      .set({
        status: 'failed',
        error: {
          code: 'INTERNAL',
          message: 'Generation did not complete (the server restarted or it timed out).',
          retriable: true,
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          inArray(generationJobs.status, ['queued', 'running']),
          lt(generationJobs.updatedAt, cutoff)
        )
      );
  } catch (err) {
    logger?.warn('job.sweep_failed', {}, err);
  }
}

/**
 * Reserve (or resolve) the generation slot for (caller, idempotencyKey).
 *
 * Closes the over-delivery vectors that a charge-only idempotency left open:
 * concurrent same-key requests (only one gets `created`, the rest `in_progress`/
 * `replay`), key-reuse after a delete (the old job id is gone, so a new slot is
 * created and re-charged), and cross-user key reuse (`conflict`). The `running`
 * row is claimed with an atomic onConflictDoNothing on the unique idempotency
 * key; a failed prior attempt is reclaimed atomically so two retries can't both
 * win.
 */
export async function reserveJob(args: ReserveJobArgs): Promise<ReserveResult> {
  const { caller, input, idempotencyKey, initialStatus = 'running' } = args;
  const { db } = await import('@/lib/db/client');

  // Reconcile abandoned jobs first, so a same-key row left `running` by a crash
  // is already `failed` here and gets reclaimed (rather than stuck `in_progress`).
  await sweepStaleRunningJobs();

  // Resolve the refine chain (owner-scoped). The new row's root is the parent's
  // root (or the parent itself if the parent is a first generation). A
  // missing/cross-user parent is ignored — no chain link, but the run proceeds.
  let parentJobId: string | null = null;
  let rootJobId: string | null = null;
  if (args.parentJobId) {
    const [parent] = await db
      .select({
        id: generationJobs.id,
        userId: generationJobs.userId,
        rootJobId: generationJobs.rootJobId,
      })
      .from(generationJobs)
      .where(eq(generationJobs.id, args.parentJobId))
      .limit(1);
    if (parent && parent.userId === caller.userId) {
      parentJobId = parent.id;
      rootJobId = parent.rootJobId ?? parent.id;
    }
  }

  // Claim the key with a fresh row. Only one concurrent caller wins. The status
  // is the caller's initialStatus (web: 'running'; v1 runner: 'queued').
  const [created] = await db
    .insert(generationJobs)
    .values({ userId: caller.userId, status: initialStatus, input, idempotencyKey, parentJobId, rootJobId })
    .onConflictDoNothing({ target: generationJobs.idempotencyKey })
    .returning({ id: generationJobs.id });
  if (created) return { mode: 'created', jobId: created.id };

  // Key already exists — resolve against the existing (owner-checked) row.
  const [existing] = await db
    .select({
      id: generationJobs.id,
      userId: generationJobs.userId,
      status: generationJobs.status,
      result: generationJobs.result,
    })
    .from(generationJobs)
    .where(eq(generationJobs.idempotencyKey, idempotencyKey))
    .limit(1);

  if (!existing || existing.userId !== caller.userId) return { mode: 'conflict' };
  if (existing.status === 'succeeded' && existing.result) {
    return { mode: 'replay', jobId: existing.id, result: existing.result as WireResult };
  }
  if (existing.status === 'failed') {
    // Atomically reclaim a failed attempt: only the request that flips it out of
    // 'failed' runs, so two concurrent retries can't both deliver. Reclaim means
    // "re-run it", so the row (re)starts in the caller's initialStatus.
    const [reclaimed] = await db
      .update(generationJobs)
      .set({ status: initialStatus, error: null, updatedAt: new Date() })
      .where(and(eq(generationJobs.id, existing.id), eq(generationJobs.status, 'failed')))
      .returning({ id: generationJobs.id });
    if (reclaimed) return { mode: 'reclaimed', jobId: reclaimed.id };
  }
  // queued / running (or someone else just reclaimed it): in flight.
  return { mode: 'in_progress', jobId: existing.id };
}

/**
 * Finalize a reserved job after a successful pipeline run: write the terminal
 * `succeeded` state + result and persist the PDF. The charge has already
 * happened inside the pipeline (keyed on this jobId) and the result has already
 * been streamed, so this is BEST-EFFORT: a failure here must never throw into
 * the caller's pipeline-error path (which would wrongly mark a succeeded+charged
 * job as failed). Returns true on success; on failure the row simply stays
 * `running` (the stale-job sweeper / a later retry reconciles it) and the caller
 * skips the `saved` deep-link event.
 */
export async function finalizeSucceededJob(args: {
  jobId: string;
  input: GenerateInput;
  result: PipelineResult;
  logger: Logger;
  /**
   * The parent job id when this is a REFINE (present on the refine transports),
   * otherwise null/undefined for a first-class generation. Drives the analytics
   * event name only (generation_succeeded vs refine_succeeded) — no other effect.
   */
  parentJobId?: string | null;
  /** Owner of the job — recorded on the analytics event. */
  userId?: string;
}): Promise<boolean> {
  const { jobId, input, result, logger, parentJobId } = args;
  try {
    const { db } = await import('@/lib/db/client');
    await db
      .update(generationJobs)
      .set({
        status: 'succeeded',
        title: deriveJobTitle(input, result),
        result: toWireResult(result),
        charged: result.usage.charged,
        pdfUrl: `/api/v1/resumes/${jobId}/pdf`,
        profileId: input.profileId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
    await storeResumePdf(jobId, result.pdf, logger);
    // Funnel telemetry (best-effort, never throws): one emit site covers BOTH the
    // web SSE path and the v1 runner. A user's first-ever generation_succeeded is
    // the activation query (no separate activation event needed).
    const isRefine = Boolean(parentJobId);
    await trackEvent({
      userId: args.userId,
      event: isRefine ? 'refine_succeeded' : 'generation_succeeded',
      props: { jobId, charged: result.usage.charged, ...(isRefine ? { parentJobId } : {}) },
    });
    return true;
  } catch (err) {
    logger.error('job.finalize_failed', { jobId }, err);
    return false;
  }
}

/**
 * Re-render the Typst source from resume data using the chosen template
 * (falling back to the base generator). Mirrors the pipeline's render step so a
 * persisted manual edit produces the same layout — server-side, so the client's
 * Typst is never trusted (defends against an injected/forged document).
 */
function renderTypst(
  data: ResumeData,
  templateId: string | undefined,
  tokens: DesignTokens = DEFAULT_TOKENS
): string {
  const template = templateId ? getTemplateById(templateId) : undefined;
  return template ? renderTemplate(template, data, tokens) : generateTypstCode(data, tokens);
}

/**
 * Persist a free, client-edited resume as a NEW version in the parent's refine
 * chain — WITHOUT running the pipeline and WITHOUT charging.
 *
 * This is the durable counterpart to the editor's in-memory structured edit: it
 * is pure user-owned storage (like "save as profile"), so it deliberately does
 * NOT touch the money path. There is no `meter`/credit/pipeline call anywhere in
 * here; the row is written `charged: false` with a fresh random idempotency key
 * that is never used to charge (the charge is keyed on a reserved jobId inside
 * the pipeline, which this never invokes). The Typst is re-rendered server-side
 * from the validated `resumeData`, and the ATS score / match analysis are
 * carried over from the parent (the parent's last AI run remains the
 * authoritative analysis — a manual edit doesn't re-score).
 *
 * The cover letter is carried over from the parent UNLESS the caller supplies an
 * edited `coverLetter` body, in which case its Typst is regenerated server-side
 * (client Typst is never trusted — the same principle applied to the resume).
 *
 * Owner-scoped: a missing/cross-user parent throws NotFound (existence hidden).
 */
export async function createManualVersion(args: {
  caller: Caller;
  parentJobId: string;
  resumeData: ResumeData;
  templateId?: string;
  versionLabel?: string;
  coverLetter?: string;
}): Promise<{ id: string }> {
  const { caller, parentJobId, resumeData, coverLetter } = args;
  const { db } = await import('@/lib/db/client');

  // Resolve the parent owner-scoped (hide existence on miss/cross-user) and
  // derive the chain root, exactly like reserveJob's refine path.
  const [parent] = await db
    .select({
      id: generationJobs.id,
      userId: generationJobs.userId,
      status: generationJobs.status,
      rootJobId: generationJobs.rootJobId,
      input: generationJobs.input,
      result: generationJobs.result,
      title: generationJobs.title,
    })
    .from(generationJobs)
    .where(eq(generationJobs.id, parentJobId))
    .limit(1);
  if (!parent || parent.userId !== caller.userId) throw new NotFoundError('Resume not found');
  // A version can only branch from a COMPLETED resume with a real persisted
  // result — never from a failed/running/queued job (which would otherwise seed
  // a free durable version off a non-artifact and corrupt the chain root).
  if (parent.status !== 'succeeded' || !parent.result) {
    throw new ValidationError('This resume is not ready to version yet.');
  }

  const rootJobId = parent.rootJobId ?? parent.id;
  const prev = (parent.result ?? {}) as Partial<WireResult> & { templateId?: string };
  const templateId = args.templateId ?? prev.templateId ?? 'two-column';
  // Carry the parent's tokens forward (DEFAULT_TOKENS for a pre-tokens parent) so
  // a manually-saved version keeps the same palette as what it branched from.
  const tokens = prev.tokens ?? DEFAULT_TOKENS;
  // Re-render server-side in one step so a render failure (resume OR cover
  // letter) surfaces here and aborts the version write, never trusting client
  // Typst. An edited cover letter regenerates its Typst; otherwise the parent's
  // letter + Typst are carried forward exactly as before.
  const typstCode = renderTypst(resumeData, templateId, tokens);
  const nextCoverLetter = coverLetter ?? prev.coverLetter ?? '';
  const nextCoverLetterTypst = coverLetter
    ? generateCoverLetterTypst(coverLetter, resumeData)
    : prev.coverLetterTypst ?? '';

  // Carry the parent's AI-derived analysis forward unchanged — a manual edit
  // doesn't re-run scoring. usage.charged is false: this never bills.
  const result = {
    resumeData,
    typstCode,
    coverLetter: nextCoverLetter,
    coverLetterTypst: nextCoverLetterTypst,
    atsScore: prev.atsScore,
    matchAnalysis: prev.matchAnalysis,
    templateId,
    tokens,
    usage: { charged: false },
  };

  const [created] = await db
    .insert(generationJobs)
    .values({
      userId: caller.userId,
      status: 'succeeded',
      title: parent.title ?? deriveJobTitle((parent.input ?? {}) as GenerateInput),
      versionLabel: args.versionLabel?.trim() ? args.versionLabel.trim() : null,
      input: parent.input,
      result,
      charged: false,
      // Satisfies the NOT NULL UNIQUE column; never used to charge (no meter call).
      idempotencyKey: crypto.randomUUID(),
      parentJobId: parent.id,
      rootJobId,
    })
    .returning({ id: generationJobs.id });

  return { id: created.id };
}

/**
 * Mark a reserved job failed (best-effort). Records the error envelope so the
 * row isn't left dangling in `running`, and frees the key for a retry (the
 * reclaim path in reserveJob).
 */
export async function failJob(
  jobId: string,
  error: Record<string, unknown>,
  logger: Logger
): Promise<void> {
  try {
    const { db } = await import('@/lib/db/client');
    await db
      .update(generationJobs)
      .set({ status: 'failed', error, updatedAt: new Date() })
      .where(eq(generationJobs.id, jobId));
  } catch (err) {
    logger.warn('job.fail.persist_failed', { jobId }, err);
  }
}

/**
 * Upload the compiled resume PDF to the blob store (R2). No-op when storage is
 * unconfigured; the PDF routes recompile from Typst in that case. Best-effort:
 * any failure is logged and swallowed so it never affects the generation.
 */
export async function storeResumePdf(jobId: string, pdf: Uint8Array, logger: Logger): Promise<void> {
  try {
    const { getBlobStore, resumePdfKey } = await import('@/server/storage/blobStore');
    const store = getBlobStore();
    if (!store.enabled) return;
    await store.put(resumePdfKey(jobId), pdf, 'application/pdf');
  } catch (err) {
    logger.warn('persist.pdf.failed', { jobId }, err);
  }
}

/**
 * Best-effort removal of a job's stored PDFs (resume + cover letter) from object
 * storage, called when a generation is deleted so R2 doesn't accumulate orphans.
 * No-op when storage is unconfigured; failures are logged and swallowed.
 */
export async function deleteJobPdfs(jobId: string, logger: Logger): Promise<void> {
  try {
    const { getBlobStore, resumePdfKey, coverLetterPdfKey } = await import('@/server/storage/blobStore');
    const store = getBlobStore();
    if (!store.enabled) return;
    await Promise.all([
      store.delete(resumePdfKey(jobId)),
      store.delete(coverLetterPdfKey(jobId)),
    ]);
  } catch (err) {
    logger.warn('persist.pdf.delete.failed', { jobId }, err);
  }
}
