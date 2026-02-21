import { getDb } from "@/lib/db/client";
import { credits, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
