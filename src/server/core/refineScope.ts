import type { RefineScope } from './refine';

/**
 * Phrases that clearly point at the cover letter. Matched case-insensitively as
 * substrings, so "cover letter", "cover-letter", and "coverletter" all count.
 */
const COVER_LETTER_HINTS = ['cover letter', 'cover-letter', 'coverletter'] as const;

/**
 * A bare mention of "letter" (not already part of "cover letter"). Kept separate
 * so "make the letter warmer" resolves to the cover letter without a false hit on
 * unrelated words like "letterhead" — the word boundary regex guards that.
 */
const LETTER_WORD = /\bletters?\b/;

/** Explicit "touch both artifacts" phrases. */
const BOTH_HINTS = ['both', 'everything', 'all of it', 'all of them'] as const;

/** A bare mention of the resume. */
const RESUME_WORD = /\br[eé]sum[eé]s?\b|\bcv\b/;

/**
 * Infer which artifact(s) a free-text refinement request should revise, so the
 * editor no longer needs a manual resume / cover-letter / both selector.
 *
 * The heuristic is deterministic and case-insensitive (zero added latency, no
 * LLM). It resolves to 'both' when the feedback co-mentions the resume and the
 * cover letter, or uses an explicit "both/everything" phrase; to 'cover_letter'
 * when it only points at the letter; and otherwise defaults to 'resume' (the
 * common case, and the safe default since the resume is the primary artifact).
 *
 * @param feedback The user's natural-language refinement request.
 * @returns The inferred scope: 'resume', 'cover_letter', or 'both'.
 */
export function inferRefineScope(feedback: string): RefineScope {
  const text = feedback.toLowerCase();

  const mentionsCoverLetter =
    COVER_LETTER_HINTS.some((hint) => text.includes(hint)) || LETTER_WORD.test(text);
  const mentionsResume = RESUME_WORD.test(text);
  const mentionsBoth = BOTH_HINTS.some((hint) => text.includes(hint));

  // Explicit "both/everything", or the request names both artifacts at once.
  if (mentionsBoth || (mentionsCoverLetter && mentionsResume)) return 'both';
  // Only the cover letter is named — revise just the letter.
  if (mentionsCoverLetter) return 'cover_letter';
  // Default: the resume (named explicitly, or nothing artifact-specific said).
  return 'resume';
}
