/**
 * Model tiering for the AI pipeline.
 *
 * Cost/latency optimization: not every step needs a frontier model. We split
 * calls into two tiers and let env vars override the concrete model ids:
 *
 *  - extractModel: read-and-structure / score tasks where a smaller model is
 *    sufficient (JD parsing, ATS scoring). Default: gpt-4o-mini.
 *  - reasonModel: generation/quality-critical tasks that shape the actual
 *    product (background -> resume, match analysis, tailoring, cover letter).
 *    Default: gpt-4o.
 *
 * Tune per-deployment via AI_MODEL_EXTRACT / AI_MODEL_REASON without code
 * changes. To trade cost for quality more aggressively, point more steps at the
 * extract tier (or set AI_MODEL_EXTRACT to a larger model to be conservative).
 */

import { openai } from "@ai-sdk/openai";

export const extractModel = openai(process.env.AI_MODEL_EXTRACT || "gpt-4o-mini");
export const reasonModel = openai(process.env.AI_MODEL_REASON || "gpt-4o");

/**
 * Sampling temperatures by task type.
 *
 * LLMs are non-deterministic — without a low temperature, extraction/scoring
 * steps drift run-to-run (industry data shows ATS scores swinging 7-8 points on
 * identical input). We split temperature the same way we split model tiers:
 *
 *  - EXTRACT_TEMPERATURE = 0: read/structure/judge steps (JD parsing, ATS
 *    qualitative feedback, faithfulness checks) should be as reproducible as
 *    possible. Same input → same structured output.
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
