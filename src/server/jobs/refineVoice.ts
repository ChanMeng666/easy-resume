/**
 * Resolve the writing-voice sample that should ground a refine's cover-letter
 * revision — owner-scoped and best-effort.
 *
 * A voice sample lives on a saved candidate_profile, and it is deliberately NOT
 * copied into `generation_jobs.result` (no extra PII copy). So a refine has to
 * re-fetch it from the originating profile. The originating profile id is
 * `parent.input.profileId`; when the parent is itself a refine (its input is
 * refine-shaped and never carries a profileId) the id lives on the ROOT
 * generation job (`parent.rootJobId`).
 *
 * This is pure personalization, never correctness: any failure — no originating
 * profile, the profile was deleted, it has no voice saved, a DB hiccup — resolves
 * to `undefined` silently. A refine of a pre-voice / inline-background parent
 * therefore behaves exactly as before this feature existed.
 */

import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generationJobs } from '@/lib/db/schema';
import { getProfile } from '@/server/profiles/store';
import type { Caller } from '@/server/core/pipeline.types';

/** The subset of a stored job input this resolver reads. */
export interface VoiceSeededInput {
  /** Set on a generation seeded from a saved profile. */
  profileId?: string;
  /** Set on a refine job (its input never carries a profileId). */
  refineOfJobId?: string;
}

/** True when a stored input carries refine provenance (a non-empty refineOfJobId). */
function isRefineShaped(input: VoiceSeededInput | null | undefined): boolean {
  return typeof input?.refineOfJobId === 'string' && input.refineOfJobId.trim().length > 0;
}

/**
 * Pick the profile id that originally seeded a refine's chain. PURE + testable.
 *
 * The parent's own `input.profileId` wins. When the parent is itself a refine
 * (refine-shaped input, which never carries a profileId) the root generation's
 * `input.profileId` is the fallback. Returns `undefined` when neither carries one
 * (inline-background generation, or a pre-profile parent).
 */
export function resolveOriginatingProfileId(
  parentInput: VoiceSeededInput | null | undefined,
  rootInput?: VoiceSeededInput | null
): string | undefined {
  const direct = parentInput?.profileId?.trim();
  if (direct) return direct;
  // Only consult the root when the parent is a refine — a plain generation with
  // no profileId was inline-background and has no originating profile to inherit.
  if (!isRefineShaped(parentInput)) return undefined;
  return rootInput?.profileId?.trim() || undefined;
}

/**
 * Resolve the voice sample for a refine, owner-scoped. Never throws — see the
 * module doc. `rootJobId` is the parent row's `root_job_id` (the first generation
 * in the chain), loaded only when the parent itself carries no profileId.
 */
export async function resolveRefineVoiceSample(
  caller: Caller,
  parentInput: VoiceSeededInput | null | undefined,
  rootJobId: string | null | undefined
): Promise<string | undefined> {
  try {
    // Decide from the parent alone first; only pay for a root load when the
    // parent is a refine that carries no profileId of its own.
    let profileId = resolveOriginatingProfileId(parentInput);
    if (!profileId && rootJobId && isRefineShaped(parentInput)) {
      const [root] = await db
        .select({ userId: generationJobs.userId, input: generationJobs.input })
        .from(generationJobs)
        .where(eq(generationJobs.id, rootJobId))
        .limit(1);
      // Owner-scope the root read (never inherit voice across users).
      if (root && root.userId === caller.userId) {
        profileId = resolveOriginatingProfileId(parentInput, root.input as VoiceSeededInput);
      }
    }
    if (!profileId) return undefined;

    const profile = await getProfile(caller.userId, profileId);
    return profile.voiceSample ?? undefined;
  } catch {
    // Best-effort personalization: any failure means "no voice", never an error.
    return undefined;
  }
}
