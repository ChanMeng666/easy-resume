/**
 * Application tracker store (transport-agnostic).
 *
 * Tracks a user's job applications through a simple status log
 * (draft → applied → interview → offer/rejected). All reads/writes are
 * owner-scoped: an application that isn't the caller's surfaces as NotFound
 * (never Forbidden), mirroring the candidate-profile / generation_job pattern.
 *
 * An application optionally links to the live `generation_jobs` model via
 * `generationJobId` (the dormant tailored_resume_id/job_description_id FKs target
 * unused tables and are never written here). No billing happens in this module —
 * tracking an application is free.
 */

import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { applications, generationJobs, type Application } from '@/lib/db/schema';
import { NotFoundError } from '@/server/errors/AppError';
import type { ApplicationStatus } from '@/lib/validation/schema';

/** Lightweight row for the tracker list view. */
export interface ApplicationSummary {
  id: string;
  company: string;
  position: string;
  status: string;
  generationJobId: string | null;
  appliedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const LIST_COLUMNS = {
  id: applications.id,
  company: applications.company,
  position: applications.position,
  status: applications.status,
  generationJobId: applications.generationJobId,
  appliedAt: applications.appliedAt,
  createdAt: applications.createdAt,
  updatedAt: applications.updatedAt,
} as const;

/**
 * Decide the `applied_at` timestamp for a status transition. The stamp is set
 * the first time an application reaches `applied` and is preserved afterwards;
 * a status that never reached `applied` keeps a null stamp. Pure + testable.
 *
 * @param nextStatus The status being written (undefined = unchanged).
 * @param current The application's current status + stamp.
 * @param now The timestamp to use when first stamping.
 * @returns The `applied_at` value to persist, or `undefined` to leave it as-is.
 */
export function resolveAppliedAt(
  nextStatus: ApplicationStatus | undefined,
  current: { status: string; appliedAt: Date | null },
  now: Date
): Date | null | undefined {
  if (nextStatus === undefined || nextStatus === current.status) return undefined;
  // First time entering "applied": stamp it. Already stamped → keep the original.
  if (nextStatus === 'applied') return current.appliedAt ?? now;
  return undefined;
}

// Hard cap on a single list response. The tracker is naturally small per user
// (a job search is dozens of applications, not thousands), so a generous fixed
// cap avoids unbounded reads without needing pagination UI for the MVP.
const LIST_MAX = 500;

/** List the caller's applications, newest-updated first. Optionally filter by status. */
export async function listApplications(
  userId: string,
  opts: { status?: ApplicationStatus } = {}
): Promise<ApplicationSummary[]> {
  const where = opts.status
    ? and(eq(applications.userId, userId), eq(applications.status, opts.status))
    : eq(applications.userId, userId);
  const rows = await db
    .select(LIST_COLUMNS)
    .from(applications)
    .where(where)
    .orderBy(desc(applications.updatedAt))
    .limit(LIST_MAX);
  return rows;
}

/**
 * Fetch a single owner-scoped application. Throws NotFound for a missing row OR
 * one owned by another user (existence stays hidden).
 */
export async function getApplication(userId: string, id: string): Promise<Application> {
  const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  if (!row || row.userId !== userId) throw new NotFoundError('Application not found');
  return row;
}

/**
 * Verify the caller owns a generation job before linking it to an application.
 * Returns the id when owned, else null (an unowned/missing job is silently
 * dropped so we never leak existence and never link across users).
 */
async function resolveOwnedJobId(userId: string, jobId: string | undefined): Promise<string | null> {
  if (!jobId) return null;
  const [row] = await db
    .select({ id: generationJobs.id, userId: generationJobs.userId })
    .from(generationJobs)
    .where(eq(generationJobs.id, jobId))
    .limit(1);
  return row && row.userId === userId ? row.id : null;
}

/** Create an application (owner-scoped). Stamps `applied_at` if created as `applied`. */
export async function createApplication(
  userId: string,
  input: {
    company: string;
    position: string;
    status?: ApplicationStatus;
    notes?: string;
    generationJobId?: string;
  }
): Promise<Application> {
  const status = input.status ?? 'draft';
  const generationJobId = await resolveOwnedJobId(userId, input.generationJobId);
  const appliedAt = status === 'applied' ? new Date() : null;
  const [row] = await db
    .insert(applications)
    .values({
      userId,
      company: input.company,
      position: input.position,
      status,
      notes: input.notes ?? null,
      generationJobId,
      appliedAt,
    })
    .returning();
  return row;
}

/**
 * Update an application (owner-scoped). Owner-check happens first (throws
 * NotFound) so we never write for a row the caller doesn't own. Transitioning to
 * `applied` stamps `applied_at` once (see resolveAppliedAt).
 */
export async function updateApplication(
  userId: string,
  id: string,
  patch: {
    company?: string;
    position?: string;
    status?: ApplicationStatus;
    notes?: string;
  }
): Promise<Application> {
  const existing = await getApplication(userId, id);

  const set: Partial<typeof applications.$inferInsert> = { updatedAt: new Date() };
  if (patch.company !== undefined) set.company = patch.company;
  if (patch.position !== undefined) set.position = patch.position;
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (patch.status !== undefined) set.status = patch.status;

  const appliedAt = resolveAppliedAt(patch.status, existing, set.updatedAt as Date);
  if (appliedAt !== undefined) set.appliedAt = appliedAt;

  const [row] = await db
    .update(applications)
    .set(set)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();
  // A zero-row update means the row was deleted between the owner-check and the
  // write (concurrent DELETE). Surface NotFound rather than a stale success.
  if (!row) throw new NotFoundError('Application not found');
  return row;
}

/** Delete an application (owner-scoped). Throws NotFound when nothing was deleted. */
export async function deleteApplication(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning({ id: applications.id });
  if (deleted.length === 0) throw new NotFoundError('Application not found');
}
