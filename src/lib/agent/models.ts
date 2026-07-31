/**
 * Model tiering for the AI pipeline.
 *
 * Cost/latency optimization: not every step needs the same model or the same
 * amount of thinking. Calls are split into THREE tiers, each a
 * (model id + reasoning effort) pair overridable per deployment via env:
 *
 *  - EXTRACT — read-and-structure steps (JD parsing). Cheapest model at `none`
 *    effort: the task is extraction, not thinking.
 *    Env: AI_MODEL_EXTRACT / AI_REASONING_EFFORT_EXTRACT.
 *  - REASON — generation / quality-critical steps that shape the product
 *    (background → resume, match analysis, tailoring, cover letter, revisions).
 *    Env: AI_MODEL_REASON / AI_REASONING_EFFORT_REASON.
 *  - CHAT — the interactive edit agent's tool loop (src/server/agent/editAgent.ts):
 *    many short turns whose latency a waiting user feels directly.
 *    Env: AI_MODEL_CHAT / AI_REASONING_EFFORT_CHAT.
 *
 * Adding a tier is one line — `const WRITE = makeTier('WRITE', '<id>', '<effort>')`
 * plus its three thin aliases. Splitting a dedicated WRITE tier out of REASON (so
 * tailoring / cover letters can run a bigger model than match analysis) is the
 * obvious next step and needs no call-site changes.
 *
 * GPT-5.6 WAS EVALUATED AND DECLINED (A/B, 2026-07). Do not "upgrade" the
 * defaults without re-running it. The whole 5.6 family compresses the writing
 * steps hard enough to DROP content the candidate actually has: on the `pmm`
 * sample, highlight bullets went 17.3 (gpt-5.5) → 12.0 (terra) → 11.0 (terra with
 * an explicit retention instruction) → 11.0 (sol) — sol is the most expensive
 * model in the family and wrote as little as the cheapest, so this is a family
 * trait, not a tier or a prompt problem. Keyword checks agreed: `mentoring`
 * (which the candidate genuinely has) survived 4/4 runs on 5.5 and 0/4 on terra.
 * We therefore stay on the dated 5.x snapshots below.
 *
 * Known cost of that decision: the 5.6 family ships NO dated snapshots
 * (`GET /v1/models` lists only `gpt-5.6-sol` / `-terra` / `-luna`), so a future
 * migration also trades pinned reproducibility for a floating alias OpenAI can
 * move underneath us. Today's ids are pinned snapshots and reproduce forever.
 *
 * NOTE: the SDK's model-id type union ends in `(string & {})`, so a TYPO IN A
 * MODEL ID IS NOT A TYPE ERROR. `models.test.ts` asserts the default ids
 * literally and is the only thing between a typo and a production outage.
 *
 * REASONING EFFORT IS VALIDATED SERVER-SIDE, PER MODEL, AND FAILS HARD.
 * An unsupported effort is a 400 from the Responses API ("Unsupported value:
 * '<x>' is not supported with the '<model>' model"), not a warning and not a
 * silent downgrade — and the SDK neither normalizes nor validates it
 * (@ai-sdk/openai dist/index.js:6578 forwards `effort` verbatim). The supported
 * set also DIFFERS BY MODEL: the gpt-5.4/5.5 snapshots we run accept
 * none/low/medium/high/xhigh, while gpt-5.6 additionally accepts `max`.
 * ALLOWED_EFFORTS tracks what the CURRENT default models accept, so neither
 * `minimal` (accepted by no model at all — it shipped as the extract-tier default
 * in 4711ad7 and 400'd every production JD parse until it was caught) nor `max`
 * is in it. Changing the default models means revisiting that list.
 * Treat any change here as a change that only production can fully validate.
 */

import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Sampling temperatures by task type.
 *
 * LLMs are non-deterministic — without a low temperature, extraction/scoring
 * steps drift run-to-run (industry data shows ATS scores swinging 7-8 points on
 * identical input). We split temperature the same way we split model tiers:
 *
 *  - EXTRACT_TEMPERATURE = 0: read/structure/judge steps (JD parsing, match
 *    analysis) should be as reproducible as possible. Same input → same output.
 *  - WRITING_TEMPERATURE ≈ 0.5: generation steps (background → resume, tailoring,
 *    cover letter) need natural, non-templated prose without going off the rails.
 *
 * Tune per-deployment via AI_TEMPERATURE_EXTRACT / AI_TEMPERATURE_WRITING.
 * NOTE: on a reasoning model the temperature is usually never sent at all — see
 * {@link acceptsTemperature}.
 */
function envFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const EXTRACT_TEMPERATURE = envFloat("AI_TEMPERATURE_EXTRACT", 0);
export const WRITING_TEMPERATURE = envFloat("AI_TEMPERATURE_WRITING", 0.5);

/**
 * Reasoning effort. Lower = faster + cheaper. Only meaningful on reasoning
 * models; the provider drops it (with an "unsupported" warning) on classic chat
 * models.
 *
 * This list is the set the CURRENT default models accept — not every value the
 * API has ever defined. Two are deliberately ABSENT because sending them is an
 * outright 400 (see the file header), and an allowlist that admits a value no
 * running model accepts just lets an operator configure a guaranteed outage:
 *  - `minimal` — accepted by no OpenAI model we have tested, on any tier.
 *  - `max` — gpt-5.6 only; the gpt-5.4/5.5 snapshots we run 400 on it.
 * Re-open both if the default models ever change.
 */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';

/**
 * The efforts every currently-default model accepts. Exported so tests can assert
 * that no shipped default drifts outside it — the only offline check available,
 * since the API is the sole authority on what it will accept.
 */
export const SUPPORTED_EFFORTS: readonly ReasoningEffort[] = [
  'none', 'low', 'medium', 'high', 'xhigh',
];

function envEffort(name: string, fallback: ReasoningEffort): ReasoningEffort {
  const raw = process.env[name]?.trim().toLowerCase();
  return (SUPPORTED_EFFORTS as readonly string[]).includes(raw ?? '') ? (raw as ReasoningEffort) : fallback;
}


/**
 * Parse `gpt-<major>[.<minor>][-<variant>]`, mirroring the provider's own parser
 * (@ai-sdk/openai dist/index.js:68 `getGptVersion`). Returns undefined for ids
 * that are not gpt-*, and for shapes the provider itself does not parse (e.g.
 * "gpt-4o", where the "o" is not a legal version suffix).
 */
function parseGptVersion(id: string): { major: number; minor?: number; variant?: string } | undefined {
  const m = /^gpt-(\d+)(?:\.(\d+))?(?:-(.+))?$/.exec(id);
  if (m == null) return undefined;
  return { major: Number(m[1]), minor: m[2] == null ? undefined : Number(m[2]), variant: m[3] };
}

/**
 * Whether the id names a reasoning model (o-series, or a non-`-chat` gpt-5+).
 *
 * This is a deliberate MIRROR of the provider's own classification
 * (@ai-sdk/openai dist/index.js:53, `isReasoningModel`): the provider uses that
 * exact rule to decide whether `reasoningEffort` is honored and whether
 * `temperature` is stripped, so any divergence here means we send options the
 * provider silently discards — or, worse, omit `reasoningEffort` and let the
 * call fall back to OpenAI's own default effort tier.
 */
export function isReasoningModel(id: string): boolean {
  if (/^o(\d+)(?:-|$)/.test(id)) return true;
  const gpt = parseGptVersion(id);
  if (gpt == null) return false;
  // "chat" is only a variant marker when there is no minor version:
  // gpt-5-chat-latest is a classic chat model, gpt-5.2-chat would not be.
  const isChatVariant = gpt.minor == null && (gpt.variant?.startsWith('chat') ?? false);
  return gpt.major >= 5 && !isChatVariant;
}

/**
 * Whether a `temperature` set on this (model, effort) pair actually reaches the
 * API.
 *
 * The old comment here claimed reasoning models "REJECT temperature (the API
 * 400s)". That is NOT what happens. The provider strips it client-side: at
 * @ai-sdk/openai dist/index.js:6593 it clears `temperature`/`top_p` and pushes an
 * "unsupported" warning unless `effort === 'none'` AND the model supports
 * non-reasoning parameters (dist/index.js:54 — gpt major > 5, or major 5 with
 * minor >= 1; o-series never). So passing a temperature is silently ignored,
 * never an error — which is exactly why it needs a test rather than trust.
 */
export function acceptsTemperature(id: string, effort: ReasoningEffort): boolean {
  if (!isReasoningModel(id)) return true;
  if (effort !== 'none') return false;
  const gpt = parseGptVersion(id);
  return gpt != null && (gpt.major > 5 || (gpt.major === 5 && (gpt.minor ?? 0) >= 1));
}

/** One resolved tier: the model plus the option fragments its call sites spread. */
interface ModelTier {
  /** Resolved model id (env override or default). */
  id: string;
  /** Resolved reasoning effort (env override or default). */
  effort: ReasoningEffort;
  /** The SDK model instance. */
  model: LanguageModel;
  /** `<id>@<effort>` — a stable cache-salt / telemetry key for this tier. */
  fingerprint: string;
  /** Sampling fragment: the temperature only when it would actually be sent. */
  sampling: (temperature: number) => { temperature?: number };
  /** `providerOptions.openai` fragment: reasoningEffort only for reasoning models. */
  reasoning: () => { reasoningEffort?: ReasoningEffort };
}

/**
 * Resolve one tier from its env pair, defaulting when unset OR set to an empty
 * string (deploy pipelines happily inject `FOO=` for an undefined variable, so
 * `||` / a falsy check is required here — `??` would let "" through).
 */
function makeTier(
  name: 'EXTRACT' | 'REASON' | 'CHAT',
  defaultId: string,
  defaultEffort: ReasoningEffort
): ModelTier {
  const id = process.env[`AI_MODEL_${name}`] || defaultId;
  const effort = envEffort(`AI_REASONING_EFFORT_${name}`, defaultEffort);
  return {
    id,
    effort,
    model: openai(id),
    fingerprint: `${id}@${effort}`,
    sampling: (temperature: number) => (acceptsTemperature(id, effort) ? { temperature } : {}),
    reasoning: () => (isReasoningModel(id) ? { reasoningEffort: effort } : {}),
  };
}

// `none` is both the cheapest legal effort AND the only one that lets a
// temperature through on a gpt-5.1+ reasoning model (see acceptsTemperature). So
// this default does double duty: JD parsing runs with no reasoning overhead, and
// EXTRACT_TEMPERATURE = 0 actually reaches the API — restoring the determinism
// jdParseCache assumes when it treats "same JD ⇒ same ParsedJD" as cacheable.
// Raising this effort silently drops the temperature again.
const EXTRACT = makeTier('EXTRACT', 'gpt-5.4-mini-2026-03-17', 'none');
const REASON = makeTier('REASON', 'gpt-5.5-2026-04-23', 'low');
// CHAT deliberately runs the SAME model as REASON. This tier exists for its
// EFFORT, not its model: editAgent.ts used to pass no providerOptions at all, so
// every edit turn silently ran at OpenAI's default effort (medium) while all
// seven paid pipeline call sites ran at an explicit `low`. Splitting the tier is
// what makes that asymmetry visible and tunable (AI_MODEL_CHAT /
// AI_REASONING_EFFORT_CHAT) without touching the pipeline.
const CHAT = makeTier('CHAT', 'gpt-5.5-2026-04-23', 'low');

// ---------------------------------------------------------------------------
// Thin per-tier aliases. Call sites use these, never the tier objects, so the
// tiering can be re-cut without touching a single agent.
// ---------------------------------------------------------------------------

export const extractModel = EXTRACT.model;
export const reasonModel = REASON.model;
export const chatModel = CHAT.model;

/**
 * Sampling params for a call on this tier:
 *   `generateText({ model: reasonModel, ...reasonSampling(WRITING_TEMPERATURE) })`
 * Spreads `{}` (SDK/model default) when the temperature would be stripped anyway.
 */
export function extractSampling(temperature: number): { temperature?: number } {
  return EXTRACT.sampling(temperature);
}

/** Same as {@link extractSampling}, for the REASON tier. */
export function reasonSampling(temperature: number): { temperature?: number } {
  return REASON.sampling(temperature);
}

/** Same as {@link extractSampling}, for the CHAT tier. */
export function chatSampling(temperature: number): { temperature?: number } {
  return CHAT.sampling(temperature);
}

/**
 * `providerOptions.openai` fragment carrying `reasoningEffort` — emitted ONLY for
 * reasoning models (classic chat models warn and drop it). Spread into the
 * existing openai options object:
 *   `providerOptions: { openai: { strictJsonSchema: false, ...reasonReasoning() } }`
 * Omitting it entirely is NOT neutral: the provider then sends no `reasoning`
 * field and the call silently runs at OpenAI's own default effort.
 */
export function extractReasoning(): { reasoningEffort?: ReasoningEffort } {
  return EXTRACT.reasoning();
}

/** Same as {@link extractReasoning}, for the REASON tier. */
export function reasonReasoning(): { reasoningEffort?: ReasoningEffort } {
  return REASON.reasoning();
}

/** Same as {@link extractReasoning}, for the CHAT tier. */
export function chatReasoning(): { reasoningEffort?: ReasoningEffort } {
  return CHAT.reasoning();
}

/**
 * Cache salt for anything keyed on "what the extract tier would produce" (the JD
 * parse cache). Covers BOTH the model id and the effort, so bumping either one
 * invalidates cached results instead of serving them for up to the TTL.
 */
export const EXTRACT_TIER_FINGERPRINT = EXTRACT.fingerprint;

/**
 * The effort each tier actually resolved to. Exists so a test can assert that no
 * shipped default sits outside {@link SUPPORTED_EFFORTS} — the guard added after
 * `minimal`, which no model accepts, spent three weeks as the extract default and
 * 400'd every `parse_jd` in production.
 */
export const RESOLVED_EFFORTS = {
  extract: EXTRACT.effort,
  reason: REASON.effort,
  chat: CHAT.effort,
} as const;

/**
 * What each tier actually resolved to, as `<model id>@<effort>`.
 *
 * Logged once at server startup (src/instrumentation.ts) because otherwise there
 * is NO way to tell from outside which models a running deployment is using. The
 * env overrides exist precisely so a model can be swapped or rolled back without
 * a code change — but an override that silently fails to apply looks exactly like
 * one that worked, which is the same shape as the `minimal` incident: correct on
 * inspection, wrong at runtime, and quiet either way.
 *
 * Safe to log: model ids and effort levels are configuration, never secrets and
 * never user data.
 */
export const TIER_FINGERPRINTS = {
  extract: EXTRACT.fingerprint,
  reason: REASON.fingerprint,
  chat: CHAT.fingerprint,
} as const;
