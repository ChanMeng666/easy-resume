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
 * cheaper. The pipeline runs the reason tier across the heavy writing steps, so
 * a lower default keeps end-to-end latency in check while gpt-5.x at "low" still
 * far outwrites gpt-4o. Tune per-deployment:
 *  - AI_REASONING_EFFORT_EXTRACT (default "minimal": JD parse is pure extraction)
 *  - AI_REASONING_EFFORT_REASON  (default "low": quality writing, but not slow)
 * Accepted: none | minimal | low | medium | high | xhigh.
 */
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

function envEffort(name: string, fallback: ReasoningEffort): ReasoningEffort {
  const raw = process.env[name]?.trim().toLowerCase();
  const allowed: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'];
  return (allowed as string[]).includes(raw ?? '') ? (raw as ReasoningEffort) : fallback;
}

const EXTRACT_EFFORT = envEffort('AI_REASONING_EFFORT_EXTRACT', 'minimal');
const REASON_EFFORT = envEffort('AI_REASONING_EFFORT_REASON', 'low');

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
