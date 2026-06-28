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

/** Build the `experimental_telemetry` option for an AI SDK call. */
export function aiTelemetry(functionId: string) {
  return { isEnabled: ENABLED, functionId, recordInputs: RECORD_IO, recordOutputs: RECORD_IO };
}
