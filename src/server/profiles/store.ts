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
import { randomBytes } from 'node:crypto';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidateProfiles, type CandidateProfile } from '@/lib/db/schema';
import { parseBackground } from '@/lib/agent/background-parser';
import { NotFoundError } from '@/server/errors/AppError';
import type { ResumeData, Profile, Work, Education, Project, Skill } from '@/lib/validation/schema';

const DEFAULT_LABEL = 'My Background';

/** Lightweight row for list views (no heavy data/rawBackground payload). */
export interface ProfileSummary {
  id: string;
  label: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  // Public-endpoint state (opt-in). `publicSlug` may be present while
  // `publishedAt` is null — an unpublished profile keeps its minted slug so
  // republishing restores the same URL. The UI treats "published" as
  // publishedAt != null, NOT slug presence.
  publicSlug: string | null;
  publishedAt: Date | null;
  // Whether the owner saved a voice-writing sample. A derived boolean only — the
  // raw text is never carried in a list payload (kept lightweight) and is echoed
  // solely on the owner-scoped detail GET, never on any public surface.
  hasVoiceSample: boolean;
}

/**
 * The PUBLIC projection of a candidate profile — the ONLY shape ever served on
 * the unauthenticated `/p/{slug}` surface.
 *
 * ALLOWLIST INVARIANT: `toPublicProfile` builds this from an explicit object
 * literal, copying ONLY the fields named here. Nothing else on the row may ever
 * appear in a public payload. In particular the following are NEVER projected:
 * `email`, `phone`, `photo` (contact PII), `rawBackground`, `voiceSample` (raw
 * free text the candidate never chose to publish), `userId`, and the row `id`.
 * The sentinel test (`publicProfile.test.ts`) enforces this by construction.
 */
export interface PublicProfile {
  slug: string;
  label: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
  name: string;
  headline: string;
  location?: string;
  summary?: string;
  profiles: Profile[];
  work: Work[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  achievements: string[];
  certifications: string[];
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
      publicSlug: candidateProfiles.publicSlug,
      publishedAt: candidateProfiles.publishedAt,
      hasVoiceSample: sql<boolean>`${candidateProfiles.voiceSample} is not null`,
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

// ---------------------------------------------------------------------------
// Public career endpoint (opt-in publishing of an allowlist projection)
// ---------------------------------------------------------------------------

/**
 * Project a full profile row down to its PUBLIC allowlist. PURE + testable.
 *
 * This is the ONLY function that produces a public payload, and it does so as an
 * explicit object literal: every field reaching the public surface is named
 * here. Contact PII (`email`/`phone`/`photo`), raw free text
 * (`rawBackground`/`voiceSample`), and internal identifiers (`userId`, row `id`)
 * are deliberately absent and must NEVER be added — see the PublicProfile
 * ALLOWLIST INVARIANT and the sentinel test.
 */
export function toPublicProfile(row: CandidateProfile): PublicProfile {
  const data: ResumeData = row.data;
  const basics = data.basics;
  return {
    slug: row.publicSlug ?? '',
    label: row.label,
    publishedAt: row.publishedAt,
    updatedAt: row.updatedAt,
    name: basics.name,
    headline: basics.label,
    // `location` stays in the projection (owner decision); contact PII does not.
    ...(basics.location ? { location: basics.location } : {}),
    ...(basics.summary ? { summary: basics.summary } : {}),
    profiles: (basics.profiles ?? []).map((p) => ({
      network: p.network,
      url: p.url,
      ...(p.label ? { label: p.label } : {}),
    })),
    work: (data.work ?? []).map((w) => ({
      company: w.company,
      position: w.position,
      startDate: w.startDate,
      endDate: w.endDate,
      location: w.location,
      type: w.type,
      highlights: [...w.highlights],
    })),
    education: (data.education ?? []).map((e) => ({
      institution: e.institution,
      area: e.area,
      studyType: e.studyType,
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location,
      ...(e.gpa ? { gpa: e.gpa } : {}),
      ...(e.note ? { note: e.note } : {}),
    })),
    projects: (data.projects ?? []).map((p) => ({
      name: p.name,
      description: p.description,
      highlights: [...p.highlights],
      ...(p.url ? { url: p.url } : {}),
    })),
    skills: (data.skills ?? []).map((s) => ({ name: s.name, keywords: [...s.keywords] })),
    achievements: [...(data.achievements ?? [])],
    certifications: [...(data.certifications ?? [])],
  };
}

/**
 * Mint an unguessable public slug. 12 random bytes → 16 base64url chars. Uses
 * node:crypto (server-side only) — never Math.random, so slugs are not
 * predictable from timing/sequence.
 */
export function generatePublicSlug(): string {
  return randomBytes(12).toString('base64url');
}

const MAX_SLUG_MINT_ATTEMPTS = 5;

/** True when a thrown DB error is a unique-constraint violation (Postgres 23505). */
function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const message = err instanceof Error ? err.message : String(err);
  return code === '23505' || /duplicate key|unique constraint/i.test(message);
}

/**
 * Publish a profile (owner-scoped) at its public endpoint. Reuses an existing
 * slug (so republishing restores the same URL) or mints a fresh one, retrying on
 * the rare slug collision. Sets `published_at`; visibility is gated on that.
 */
export async function publishProfile(
  userId: string,
  id: string
): Promise<{ slug: string; publishedAt: Date | null }> {
  // Owner-check first (throws NotFound) — never publish a row the caller doesn't own.
  const existing = await getProfile(userId, id);

  // Reuse the existing slug when present: unpublish keeps it, so republish is stable.
  if (existing.publicSlug) {
    const [row] = await db
      .update(candidateProfiles)
      .set({ publishedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)))
      .returning({ slug: candidateProfiles.publicSlug, publishedAt: candidateProfiles.publishedAt });
    return { slug: row?.slug ?? existing.publicSlug, publishedAt: row?.publishedAt ?? null };
  }

  // First publish: mint a slug, retrying on the (extremely unlikely) collision.
  for (let attempt = 0; attempt < MAX_SLUG_MINT_ATTEMPTS; attempt++) {
    const slug = generatePublicSlug();
    try {
      const [row] = await db
        .update(candidateProfiles)
        .set({ publicSlug: slug, publishedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)))
        .returning({ slug: candidateProfiles.publicSlug, publishedAt: candidateProfiles.publishedAt });
      return { slug: row?.slug ?? slug, publishedAt: row?.publishedAt ?? null };
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_SLUG_MINT_ATTEMPTS - 1) continue;
      throw err;
    }
  }
  // Unreachable in practice (16 base64url chars = 96 bits of entropy).
  throw new Error('Failed to mint a unique public slug');
}

/**
 * Unpublish a profile (owner-scoped): nulls `published_at` so the public read
 * gate closes, but KEEPS `public_slug` so a later republish restores the same
 * URL. Throws NotFound for a missing/other-user row.
 */
export async function unpublishProfile(userId: string, id: string): Promise<void> {
  // Owner-check first (throws NotFound).
  await getProfile(userId, id);
  await db
    .update(candidateProfiles)
    .set({ publishedAt: null, updatedAt: new Date() })
    .where(and(eq(candidateProfiles.id, id), eq(candidateProfiles.userId, userId)));
}

/**
 * Resolve a PUBLISHED profile by its public slug — the ONLY public (no userId)
 * read path. Returns the allowlist projection, or null when the slug is unknown
 * or the profile is currently unpublished (`published_at IS NULL`).
 */
export async function getPublicProfileBySlug(slug: string): Promise<PublicProfile | null> {
  if (!slug) return null;
  const [row] = await db
    .select()
    .from(candidateProfiles)
    .where(and(eq(candidateProfiles.publicSlug, slug), isNotNull(candidateProfiles.publishedAt)))
    .limit(1);
  return row ? toPublicProfile(row) : null;
}
