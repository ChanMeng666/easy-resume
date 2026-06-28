/**
 * AI SDK telemetry configuration.
 *
 * The Vercel AI SDK emits OpenTelemetry spans when `experimental_telemetry` is
 * enabled. Pointed at an OTel collector (e.g. Langfuse's span processor), this
 * gives per-step traces, token cost, and latency for the whole pipeline with
 * zero changes to the agent logic.
 *
 * Gated behind AI_TELEMETRY_ENABLED so local/dev runs stay overhead-free; when
 * disabled the SDK skips instrumentation entirely. When enabled without a
 * registered tracer, the SDK falls back to a no-op tracer (safe).
 */

const ENABLED = process.env.AI_TELEMETRY_ENABLED === 'true';

// Recording prompt inputs/outputs captures the candidate's RESUME and the job
// description — i.e. PII — in every span, which is then shipped to whatever OTel
// collector is configured (potentially third-party / cloud). That is OFF by
// default; an operator must explicitly opt in with AI_TELEMETRY_RECORD_IO=true
// after confirming their collector is private and compliant. With it off, spans
// still carry timing, token, and cost data — just not the raw text.
const RECORD_IO = process.env.AI_TELEMETRY_RECORD_IO === 'true';

import type { PromptFunctionId } from './prompt-registry';

/**
 * Build the `experimental_telemetry` option for an AI SDK call.
 *
 * `functionId` is typed to the prompt registry so every instrumented step is a
 * known agent step (an unregistered id is a compile error). `metadata` is
 * deliberately narrowed to `{ promptVersion }` — a non-PII version string — so a
 * caller can't accidentally route PII (e.g. resume/JD text) through metadata and
 * bypass the RECORD_IO gate (which governs raw prompt input/output text). The
 * version is emitted regardless of RECORD_IO so traces stay filterable/comparable
 * by prompt version even with raw I/O recording off.
 */
export function aiTelemetry(functionId: PromptFunctionId, metadata?: { promptVersion: string }) {
  return {
    isEnabled: ENABLED,
    functionId,
    recordInputs: RECORD_IO,
    recordOutputs: RECORD_IO,
    ...(metadata ? { metadata } : {}),
  };
}
