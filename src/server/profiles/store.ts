/**
 * Candidate profile store (transport-agnostic).
 *
 * The persistent "enter once, reuse across JDs" background lives here. Both the
 * web history API and the public v1 API resolve a saved profile through this
 * module, so "the API is the UI" holds for profiles too. All reads/writes are
 * owner-scoped: a profile that isn't the caller's surfaces as NotFound (never
 * Forbidden), mirroring the generation_jobs owner-check pattern.
 *
 * Parsing happens ONCE, here, when a profile is created (or its raw background
 * is edited) — never during generation. So generating from a profile reuses the
 * stored ResumeData and skips the parse_background LLM step. Parsing a profile
 * is not a billable artifact (no PDF), so it costs no credit.
 */

import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidateProfiles, type CandidateProfile } from '@/lib/db/schema';
import { parseBackground } from '@/lib/agent/background-parser';
import { NotFoundError } from '@/server/errors/AppError';
import type { ResumeData } from '@/lib/validation/schema';

const DEFAULT_LABEL = 'My Background';

/** Lightweight row for list views (no heavy data/rawBackground payload). */
export interface ProfileSummary {
  id: string;
  label: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Pick a human-friendly label: explicit override, else the parsed professional
 * title, else a generic default. Pure + testable.
 */
export function deriveProfileLabel(explicit: string | undefined, data: ResumeData): string {
  const label = explicit?.trim() || data?.basics?.label?.trim();
  return label && label.length > 0 ? label.slice(0, 255) : DEFAULT_LABEL;
}

/** List the caller's profiles, newest-updated first. */
export async function listProfiles(userId: string): Promise<ProfileSummary[]> {
  const rows = await db
    .select({
      id: candidateProfiles.id,
      label: candidateProfiles.label,
      createdAt: candidateProfiles.createdAt,
      updatedAt: candidateProfiles.updatedAt,
    })
    .from(candidateProfiles)
    .where(eq(candidateProfiles.userId, userId))
    .orderBy(desc(candidateProfiles.updatedAt));
  return rows;
}

/**
 * Fetch a single owner-scoped profile. Throws NotFound for a missing row OR one
 * owned by another user (existence stays hidden).
 */
export async function getProfile(userId: string, id: string): Promise<CandidateProfile> {
  const [row] = await db
    .select()
    .from(candidateProfiles)
    .where(eq(candidateProfiles.id, id))
    .limit(1);
  if (!row || row.userId !== userId) throw new NotFoundError('Profile not found');
  return row;
}

/**
 * Create a profile. The server ALWAYS parses `rawBackground` itself (never
 * trusting client-supplied structured data) and stores the result, so the data
 * is bounded, faithful to the raw text, and reusable at generation time.
 * Parsing here is free (no compiled PDF → no charge).
 */
export async function createProfile(
  userId: string,
  input: { label?: string; rawBackground: string; voiceSample?: string }
): Promise<CandidateProfile> {
  const data = await parseBackground(input.rawBackground);
  const label = deriveProfileLabel(input.label, data);
  // Store the writing sample RAW (never parsed); normalize empty/whitespace to
  // null so an absent voice reads the same as a blank one.
  const voiceSample = input.voiceSample?.trim() || null;
  const [row] = await db
    .insert(candidateProfiles)
    .values({ userId, label, data, rawBackground: input.rawBackground, voiceSample })
    .returning();
  return row;
}

/**
 * Update a profile (owner-scoped). A `rawBackground` change re-parses
 * server-side so the stored ResumeData stays consistent with the raw text (no
 * client-supplied data — same rationale as createProfile).
 */
export async function updateProfile(
  userId: string,
  id: string,
  patch: { label?: string; rawBackground?: string; voiceSample?: string }
): Promise<CandidateProfile> {
  // Owner-check first (throws NotFound) so we never re-parse or write for a
  // profile the caller doesn't own.
  const existing = await getProfile(userId, id);

  const set: Partial<typeof candidateProfiles.$inferInsert> = { updatedAt: new Date() };
  if (patch.label !== undefined) set.label = patch.label.slice(0, 255);
  if (patch.rawBackground !== undefined) {
    set.rawBackground = patch.rawBackground;
    set.data = await parseBackground(patch.rawBackground);
  }
  // Store raw; normalize empty/whitespace to null (same as createProfile).
  if (patch.voiceSample !== undefined) set.voiceSample = patch.voiceSample.trim() || null;

  const [row] = await db
    .update(candidateProfiles)
    .set(set)
    .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)))
    .returning();
  // The conditional update is owner-scoped; existing already confirmed ownership.
  return row ?? existing;
}

/** Delete a profile (owner-scoped). Throws NotFound when nothing was deleted. */
export async function deleteProfile(userId: string, id: string): Promise<void> {
  const deleted = await db
    .delete(candidateProfiles)
    .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)))
    .returning({ id: candidateProfiles.id });
  if (deleted.length === 0) throw new NotFoundError('Profile not found');
}
