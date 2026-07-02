/**
 * Outcome-based billing meter.
 *
 * Business model: "sell results, not tools." A user is charged exactly once,
 * and only when the pipeline produces a real, compiled result (PDF). The single
 * call site lives inside the pipeline core, after compilation succeeds. Failures
 * earlier in the pipeline never reach this code, so failures are free.
 *
 * Idempotency: the charge is keyed by `idempotencyKey` (stored as the
 * transaction `referenceId`). SSE reconnects and job retries that re-run the
 * pipeline with the same key will not double-charge.
 */

import 'server-only';
import { creditService } from '@/lib/services/creditService';

/** Cost in credits for a single successful resume generation result. */
export const RESUME_GENERATION_COST = 1;

export interface ChargeRef {
  kind: 'resume_generation' | 'resume_refinement';
  jobId?: string;
}

export interface ChargeOutcome {
  charged: boolean;
  credits: number;
  transactionId?: string;
}

export interface BillingMeter {
  /** Pre-flight check; lets the pipeline fail fast before spending LLM calls. */
  hasCredits(userId: string, amount?: number): Promise<boolean>;
  /** Charge for a produced result. Idempotent on `idempotencyKey`. */
  chargeForResult(userId: string, ref: ChargeRef, idempotencyKey: string): Promise<ChargeOutcome>;
}

/** Default meter backed by the existing credit service. */
export const billingMeter: BillingMeter = {
  async hasCredits(userId, amount = RESUME_GENERATION_COST) {
    return creditService.hasCredits(userId, amount);
  },

  async chargeForResult(userId, ref, idempotencyKey) {
    const charge = await creditService.useCreditsIdempotent(
      userId,
      RESUME_GENERATION_COST,
      'Resume generation',
      ref.kind,
      idempotencyKey
    );
    return {
      charged: charge.ok,
      credits: charge.ok ? RESUME_GENERATION_COST : 0,
      transactionId: charge.transactionId,
    };
  },
};
