/**
 * Model tiering for the AI pipeline.
 *
 * Cost/latency optimization: not every step needs a frontier model. We split
 * calls into two tiers and let env vars override the concrete model ids:
 *
 *  - extractModel: read-and-structure / score tasks where a smaller model is
 *    sufficient (JD parsing). Default: gpt-5.4-mini.
 *  - reasonModel: generation/quality-critical tasks that shape the actual
 *    product (background -> resume, match analysis, tailoring, cover letter).
 *    Default: gpt-5.5.
 *
 * Tune per-deployment via AI_MODEL_EXTRACT / AI_MODEL_REASON without code
 * changes. To trade cost for quality more aggressively, point more steps at the
 * extract tier (or set AI_MODEL_EXTRACT to a larger model to be conservative).
 */

import { openai } from "@ai-sdk/openai";

const EXTRACT_MODEL_ID = process.env.AI_MODEL_EXTRACT || "gpt-5.4-mini-2026-03-17";
const REASON_MODEL_ID = process.env.AI_MODEL_REASON || "gpt-5.5-2026-04-23";

export const extractModel = openai(EXTRACT_MODEL_ID);
export const reasonModel = openai(REASON_MODEL_ID);

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
 * Reasoning models (the gpt-5 family except the `-chat` variant, and the
 * o-series) behave differently from classic chat models:
 *  - they REJECT a custom `temperature` (the API 400s on anything but default), and
 *  - they ACCEPT a `reasoningEffort` knob that classic models reject.
 * We detect the family once so both traits are handled consistently rather than
 * breaking every LLM call the moment the model is upgraded.
 */
function isReasoningModel(id: string): boolean {
  return /^o[0-9]/.test(id) || (/^gpt-5/.test(id) && !/chat/.test(id));
}

export const EXTRACT_IS_REASONING = isReasoningModel(EXTRACT_MODEL_ID);
export const REASON_IS_REASONING = isReasoningModel(REASON_MODEL_ID);

/**
 * Reasoning effort per tier (only sent to reasoning models). Lower = faster +
 * cheaper. Tune per-deployment:
 *  - AI_REASONING_EFFORT_EXTRACT (default "none": JD parse is pure extraction)
 *  - AI_REASONING_EFFORT_REASON  (default "low": quality writing, but not slow)
 * Accepted: none | low | medium | high | xhigh.
 *
 * "minimal" IS NOT A LEGAL VALUE and was removed here. The Responses API rejects
 * it outright — `400 Unsupported value: 'minimal' is not supported with the
 * '<model>' model` — on every model this repo targets (gpt-5.4-mini, gpt-5.5,
 * gpt-5.6-luna, gpt-5.6-terra); each reports its supported set as
 * none/low/medium/high/xhigh (gpt-5.6 adds "max"). The provider passes the value
 * through verbatim (@ai-sdk/openai dist/index.js:6578 `effort:
 * resolvedReasoningEffort`) and neither normalizes nor validates it, so an
 * unsupported value is a hard runtime 400, not a warning.
 *
 * That is not hypothetical: "minimal" was the EXTRACT default from 4711ad7
 * (2026-07-07) and production sets no AI_* env vars, so every `parse_jd` — step 1
 * of the generation pipeline — 400'd from that commit until this fix. It went
 * unseen because the project's cheap money-path check is a free refine, and a
 * refine reuses the parent job's persisted `parsedJD` instead of re-parsing.
 *
 * Effort support is PER-MODEL. "max" is valid only on the gpt-5.6 family and
 * would 400 on gpt-5.4/5.5, so it is deliberately absent from this allowlist
 * until the default models move to 5.6.
 */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh';

/** Efforts every currently-targeted model accepts. Exported so tests can assert defaults stay inside it. */
export const SUPPORTED_EFFORTS: readonly ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh'];

function envEffort(name: string, fallback: ReasoningEffort): ReasoningEffort {
  const raw = process.env[name]?.trim().toLowerCase();
  return (SUPPORTED_EFFORTS as readonly string[]).includes(raw ?? '') ? (raw as ReasoningEffort) : fallback;
}

/**
 * "none" rather than a low-but-nonzero effort: JD parsing is extraction, not
 * reasoning. It is also the only effort under which the provider actually sends
 * `temperature` (it strips it otherwise — dist/index.js:6593), so this restores
 * the EXTRACT_TEMPERATURE = 0 determinism the JD parse cache assumes.
 */
const EXTRACT_EFFORT = envEffort('AI_REASONING_EFFORT_EXTRACT', 'none');
const REASON_EFFORT = envEffort('AI_REASONING_EFFORT_REASON', 'low');

export const RESOLVED_EFFORTS = { extract: EXTRACT_EFFORT, reason: REASON_EFFORT } as const;

/**
 * Build the sampling params for a call on the REASON-tier model: pass the given
 * temperature only when the model is NOT a reasoning model (reasoning models
 * reject it), else omit it (spread `{}` so the SDK uses the model default).
 *   `generateText({ model: reasonModel, ...reasonSampling(WRITING_TEMPERATURE) })`
 */
export function reasonSampling(temperature: number): { temperature?: number } {
  return REASON_IS_REASONING ? {} : { temperature };
}

/** Same as {@link reasonSampling}, for the EXTRACT-tier model. */
export function extractSampling(temperature: number): { temperature?: number } {
  return EXTRACT_IS_REASONING ? {} : { temperature };
}

/**
 * OpenAI `providerOptions.openai` fragment carrying `reasoningEffort` — emitted
 * ONLY for reasoning models (classic chat models reject it). Spread into the
 * existing openai options object:
 *   `providerOptions: { openai: { strictJsonSchema: false, ...reasonReasoning() } }`
 */
export function reasonReasoning(): { reasoningEffort?: ReasoningEffort } {
  return REASON_IS_REASONING ? { reasoningEffort: REASON_EFFORT } : {};
}

/** Same as {@link reasonReasoning}, for the EXTRACT-tier model. */
export function extractReasoning(): { reasoningEffort?: ReasoningEffort } {
  return EXTRACT_IS_REASONING ? { reasoningEffort: EXTRACT_EFFORT } : {};
}
