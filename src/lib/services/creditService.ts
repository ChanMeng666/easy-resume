import { getDb } from "@/lib/db/client";
import { credits, creditTransactions, stripeEvents } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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
    const [existing] = await db
      .select()
      .from(credits)
      .where(eq(credits.userId, userId))
      .limit(1);

    if (existing) return existing;

    // Create with 3 free credits
    const [created] = await db
      .insert(credits)
      .values({ userId, balance: 3 })
      .returning();

    // Record signup bonus transaction
    await db.insert(creditTransactions).values({
      userId,
      type: "signup_bonus",
      amount: 3,
      description: "Welcome bonus - 3 free credits",
    });

    return created;
  },

  /** Get current credit balance. */
  async getBalance(userId: string) {
    const record = await this.getOrCreate(userId);
    return record.balance;
  },

  /** Check if user has enough credits. */
  async hasCredits(userId: string, amount: number) {
    const balance = await this.getBalance(userId);
    return balance >= amount;
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
    }

    if (record.balance < amount) return { ok: false };

    await db
      .update(credits)
      .set({ balance: record.balance - amount, updatedAt: new Date() })
      .where(eq(credits.userId, userId));

    const [tx] = await db
      .insert(creditTransactions)
      .values({
        userId,
        type: "usage",
        amount: -amount,
        description,
        referenceType,
        referenceId: idempotencyKey,
      })
      .returning();

    return { ok: true, transactionId: tx.id };
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

  /** Get transaction history. */
  async getTransactions(userId: string, limit = 20) {
    const db = getDb();
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(creditTransactions.createdAt)
      .limit(limit);
  },
};
