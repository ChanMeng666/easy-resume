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

/** Build the `experimental_telemetry` option for an AI SDK call. */
export function aiTelemetry(functionId: string) {
  return { isEnabled: ENABLED, functionId, recordInputs: true, recordOutputs: true };
}
