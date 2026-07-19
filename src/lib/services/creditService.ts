import { getDb } from "@/lib/db/client";
import { credits, creditTransactions, stripeEvents } from "@/lib/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

/** Postgres unique-violation error code (SQLSTATE 23505). */
const PG_UNIQUE_VIOLATION = "23505";

/** True when an error is a Postgres unique-constraint violation. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === PG_UNIQUE_VIOLATION
  );
}

/**
 * Service for managing user credits and transactions.
 */
export const creditService = {
  /**
   * Get or create credit record for a user.
   * New users get 3 free credits.
   */
  async getOrCreate(userId: string) {
    const db = getDb();

    // Atomic claim. The previous select-then-insert had a race: two concurrent
    // first-requests for a new user both saw "no row" and both inserted, so the
    // loser threw a 23505 and (worse) the signup bonus could be granted twice.
    // onConflictDoNothing on the unique user_id makes the insert idempotent —
    // only ONE request gets a row back, and the bonus is gated on that, so it is
    // granted exactly once. A racing/duplicate request gets no row (no throw).
    const [created] = await db
      .insert(credits)
      .values({ userId, balance: 3 })
      .onConflictDoNothing({ target: credits.userId })
      .returning();

    if (created) {
      // We won the insert → grant the one-time signup bonus.
      await db.insert(creditTransactions).values({
        userId,
        type: "signup_bonus",
        amount: 3,
        description: "Welcome bonus - 3 free credits",
      });
      // Best-effort funnel telemetry: this fires exactly once per user (gated on
      // winning the atomic insert), so it doubles as the "new user first appears"
      // (first_seen) signal, with UTM attribution when captured. Dynamically
      // imported so this service's module graph stays free of next/headers; fully
      // swallowed so telemetry can never affect signup.
      try {
        const { trackSignup } = await import("@/server/analytics/signup");
        await trackSignup(userId);
      } catch {
        // Never let telemetry affect the signup path.
      }
      return created;
    }

    // The row already existed (prior signup) or a concurrent request just
    // created it — read it back. It is guaranteed to exist now (our insert
    // conflicted with a committed row), so no retry loop is needed.
    const [existing] = await db
      .select()
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);

    return existing;
  },

  /** Get current credit balance. */
  async getBalance(userId: string) {
    const record = await this.getOrCreate(userId);
    return record.balance;
  },

  /** Check if user has enough credits. Unlimited-tier users always pass. */
  async hasCredits(userId: string, amount: number) {
    const record = await this.getOrCreate(userId);
    if (record.subscriptionTier === "unlimited") return true;
    return record.balance >= amount;
  },

  /**
   * Deduct credits for an action.
   * Returns false if insufficient balance.
   */
  async useCredits(
    userId: string,
    amount: number,
    description: string,
    referenceType?: string,
    referenceId?: string
  ) {
    const db = getDb();
    const record = await this.getOrCreate(userId);

    // Check for unlimited subscription
    if (record.subscriptionTier === "unlimited") {
      await db.insert(creditTransactions).values({
        userId,
        type: "usage",
        amount: 0,
        description: `${description} (unlimited plan)`,
        referenceType,
        referenceId,
      });
      return true;
    }

    // Check for pro subscription (20 credits/month included)
    if (record.subscriptionTier === "pro" && record.balance <= 0) {
      return false;
    }

    if (record.balance < amount) return false;

    // Deduct credits
    await db
      .update(credits)
      .set({
        balance: record.balance - amount,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId));

    // Record transaction
    await db.insert(creditTransactions).values({
      userId,
      type: "usage",
      amount: -amount,
      description,
      referenceType,
      referenceId,
    });

    return true;
  },

  /**
   * Idempotent outcome-based deduction.
   *
   * Keyed by `idempotencyKey` (stored as transaction `referenceId`): if a usage
   * transaction with this key already exists, the prior charge is returned
   * without deducting again. This protects against SSE reconnects and job
   * retries double-charging for the same produced result.
   */
  async useCreditsIdempotent(
    userId: string,
    amount: number,
    description: string,
    referenceType: string,
    idempotencyKey: string
  ): Promise<{ ok: boolean; transactionId?: string }> {
    const db = getDb();

    // Idempotency: a usage txn for this key means we already charged.
    const [prior] = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.referenceId, idempotencyKey),
          eq(creditTransactions.type, "usage")
        )
      )
      .limit(1);

    if (prior) return { ok: true, transactionId: prior.id };

    const record = await this.getOrCreate(userId);

    // Unlimited plan: record a zero-amount usage txn for auditing, never block.
    if (record.subscriptionTier === "unlimited") {
      try {
        const [tx] = await db
          .insert(creditTransactions)
          .values({
            userId,
            type: "usage",
            amount: 0,
            description: `${description} (unlimited plan)`,
            referenceType,
            referenceId: idempotencyKey,
          })
          .returning();
        return { ok: true, transactionId: tx.id };
      } catch (err) {
        if (isUniqueViolation(err)) {
          const [winner] = await db
            .select()
            .from(creditTransactions)
            .where(
              and(
                eq(creditTransactions.referenceId, idempotencyKey),
                eq(creditTransactions.type, "usage")
              )
            )
            .limit(1);
          return { ok: true, transactionId: winner?.id };
        }
        throw err;
      }
    }

    // Atomic debit + audit write in ONE SQL statement. The CTE deducts only when
    // the balance still covers the charge, and the usage txn row is inserted
    // ONLY when that deduction matched a row (`INSERT ... SELECT FROM deducted`).
    // Doing both atomically gives us:
    //  - no over-delivery / lost update: concurrent *distinct* keys serialize on
    //    the row lock; the second statement sees the debited balance, matches no
    //    row, and charges nothing.
    //  - crash-consistency under Neon HTTP autocommit (each call is its own
    //    implicit txn): there is no window where a usage txn commits without its
    //    debit — which would otherwise mark the key "charged" forever.
    // Same-key concurrency is still guarded by the partial UNIQUE index on
    // (reference_id) WHERE type='usage': the losing INSERT raises 23505, which
    // rolls back the WHOLE CTE (including its UPDATE) so no double-debit happens;
    // we then return the winner's txn.
    let rows: Array<{ id: string }>;
    try {
      const res = (await db.execute(sql`
        WITH deducted AS (
          UPDATE credits
             SET balance = balance - ${amount}, updated_at = now()
           WHERE user_id = ${userId} AND balance >= ${amount}
          RETURNING user_id
        )
        INSERT INTO credit_transactions
          (user_id, type, amount, description, reference_type, reference_id)
        SELECT ${userId}, 'usage', ${-amount}, ${description}, ${referenceType}, ${idempotencyKey}
          FROM deducted
        RETURNING id
      `)) as unknown as { rows?: Array<{ id: string }> } | Array<{ id: string }>;
      rows = Array.isArray(res) ? res : res.rows ?? [];
    } catch (err) {
      if (isUniqueViolation(err)) {
        const [winner] = await db
          .select()
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.referenceId, idempotencyKey),
              eq(creditTransactions.type, "usage")
            )
          )
          .limit(1);
        return { ok: true, transactionId: winner?.id };
      }
      throw err;
    }

    // No row inserted ⇒ the conditional UPDATE matched nothing ⇒ the balance was
    // insufficient. Nothing was debited and no usage txn exists, so the key stays
    // free for a legitimate retry after a top-up.
    const row = rows[0];
    if (!row) return { ok: false };
    return { ok: true, transactionId: row.id };
  },

  /** Add credits (from purchase). */
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    stripePaymentId?: string
  ) {
    const db = getDb();
    const record = await this.getOrCreate(userId);

    await db
      .update(credits)
      .set({
        balance: record.balance + amount,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId));

    await db.insert(creditTransactions).values({
      userId,
      type: "purchase",
      amount,
      description,
      stripePaymentId,
    });
  },

  /** Update subscription tier. */
  async updateSubscription(
    userId: string,
    tier: "free" | "pro" | "unlimited",
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ) {
    const db = getDb();
    await db
      .update(credits)
      .set({
        subscriptionTier: tier,
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
        updatedAt: new Date(),
      })
      .where(eq(credits.userId, userId));
  },

  /** Look up a credit record by Stripe customer id (for subscription webhooks). */
  async getByStripeCustomerId(stripeCustomerId: string) {
    const db = getDb();
    const [record] = await db
      .select()
      .from(credits)
      .where(eq(credits.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return record ?? null;
  },

  /**
   * Record a Stripe event id, returning true only the FIRST time it is seen.
   * Stripe retries webhooks, so callers use this to process each event once.
   */
  async recordStripeEvent(eventId: string, type?: string): Promise<boolean> {
    const db = getDb();
    const inserted = await db
      .insert(stripeEvents)
      .values({ id: eventId, type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    return inserted.length > 0;
  },

  /**
   * Remove a recorded Stripe event id so a failed webhook can be reprocessed.
   *
   * `recordStripeEvent` is used as a processing lock: it marks an event seen
   * BEFORE the business logic runs. If that logic throws, the route deletes the
   * record here so Stripe's automatic retry is not skipped as a duplicate —
   * otherwise a paid-for credit grant could be lost forever.
   */
  async deleteStripeEvent(eventId: string): Promise<void> {
    const db = getDb();
    await db.delete(stripeEvents).where(eq(stripeEvents.id, eventId));
  },

  /**
   * Reverse a one-time purchase when Stripe reports a refund.
   *
   * Finds the original `purchase` transaction by its Stripe payment intent id,
   * subtracts the purchased amount back out of the balance, and records a
   * `refund` transaction. Idempotent: if a refund for this payment intent was
   * already recorded, it is a no-op (Stripe can resend `charge.refunded`).
   */
  async reverseByStripePaymentId(stripePaymentId: string): Promise<void> {
    const db = getDb();

    // Idempotency: bail if we already recorded a refund for this payment.
    const [existingRefund] = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.stripePaymentId, stripePaymentId),
          eq(creditTransactions.type, "refund")
        )
      )
      .limit(1);
    if (existingRefund) return;

    // Find the original purchase to know who and how much to reverse.
    const [purchase] = await db
      .select()
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.stripePaymentId, stripePaymentId),
          eq(creditTransactions.type, "purchase")
        )
      )
      .limit(1);
    if (!purchase) return;

    const record = await this.getOrCreate(purchase.userId);
    await db
      .update(credits)
      .set({ balance: record.balance - purchase.amount, updatedAt: new Date() })
      .where(eq(credits.userId, purchase.userId));

    await db.insert(creditTransactions).values({
      userId: purchase.userId,
      type: "refund",
      amount: -purchase.amount,
      description: "Refund for credit purchase",
      stripePaymentId,
    });
  },

  /** Get transaction history (newest first). */
  async getTransactions(userId: string, limit = 20) {
    const db = getDb();
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  },
};
