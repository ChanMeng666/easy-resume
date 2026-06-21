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
