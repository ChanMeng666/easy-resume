/**
 * Prompt version registry — the single source of truth for which prompt version
 * each agent step is on.
 *
 * Every agent module has an inline prompt; when you change one meaningfully,
 * bump its version here. The version is (a) attached to that step's telemetry
 * span via aiTelemetry (so traces in Langfuse/OTel are filterable by prompt
 * version) and (b) recorded on the generation result (so a stored resume records
 * which prompt versions produced it — enabling A/B and regression analysis with
 * the offline eval set). Lightweight by design: no DB, no runtime routing — just
 * a typed constant that flows into telemetry + the result.
 *
 * The functionId keys MUST match the ids passed to aiTelemetry() in each module.
 * Because aiTelemetry types its functionId as PromptFunctionId, an unregistered
 * id is a compile error — the registry can't silently drift from the call sites.
 */

/** The agent steps that make an LLM call (one telemetry functionId each). */
export const PROMPT_FUNCTION_IDS = [
  'parse-jd',
  'parse-background',
  'analyze-match',
  'tailor-resume',
  'cover-letter',
  // Targeted refinement (P1): minimal-diff wording revisions driven by first-class
  // user feedback, distinct from the initial tailor/cover-letter generation.
  'revise-resume',
  'revise-cover-letter',
  // Conversational edit agent (P2-1): the system prompt that drives the
  // tool-calling resume editor.
  'edit-agent',
] as const;

export type PromptFunctionId = (typeof PROMPT_FUNCTION_IDS)[number];

/**
 * Current prompt version per agent step. Bump the string (e.g. 'v1' → 'v2') when
 * a prompt changes meaningfully, so traces and stored results attribute output
 * to the exact prompt that produced it.
 */
export const PROMPT_VERSIONS: Record<PromptFunctionId, string> = {
  'parse-jd': 'v1',
  // v2: unknown dates/locations/types/descriptions must be "" — never guessed.
  'parse-background': 'v2',
  'analyze-match': 'v1',
  'tailor-resume': 'v1',
  'cover-letter': 'v1',
  'revise-resume': 'v1',
  'revise-cover-letter': 'v1',
  // v2: added the cover-letter section + the three letter-editing tools.
  // v3: resume embedded as a compact tool-editable projection (not full JSON);
  //     replayed history windowed to the most recent turns.
  'edit-agent': 'v3',
};

/** The version string for a given agent step. */
export function promptVersion(id: PromptFunctionId): string {
  return PROMPT_VERSIONS[id];
}
