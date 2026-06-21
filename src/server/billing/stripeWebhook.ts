/**
 * Stripe webhook business logic, extracted from the route so it can be unit
 * tested without Stripe signature verification, HTTP, or a database.
 *
 * Signature verification and idempotency (event dedupe) stay in the route; this
 * function only applies a verified, first-seen event to a credit "sink"
 * (satisfied structurally by `creditService`).
 */

import 'server-only';
import type Stripe from 'stripe';

/** The slice of creditService this handler needs (injectable for tests). */
export interface StripeEventSink {
  addCredits(
    userId: string,
    amount: number,
    description: string,
    stripePaymentId?: string
  ): Promise<void>;
  updateSubscription(
    userId: string,
    tier: 'free' | 'pro' | 'unlimited',
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<void>;
  getByStripeCustomerId(
    stripeCustomerId: string
  ): Promise<{ userId: string; subscriptionTier: string | null } | null>;
}

/** Pro plan's included monthly credit allowance. */
export const PRO_MONTHLY_CREDITS = 20;
/** One-time credit pack size. */
export const CREDIT_PACK_SIZE = 5;

/**
 * Apply a verified, deduplicated Stripe event to the credit sink.
 * - checkout.session.completed: grant credits / set subscription tier
 * - invoice.payment_succeeded (subscription_cycle): replenish pro monthly credits
 * - customer.subscription.deleted: (no-op here; tier change handled elsewhere)
 */
export async function applyStripeEvent(event: Stripe.Event, sink: StripeEventSink): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const priceType = session.metadata?.priceType;
      if (!userId || !priceType) break;

      if (priceType === 'credits_5') {
        await sink.addCredits(
          userId,
          CREDIT_PACK_SIZE,
          'Purchased 5 credits',
          session.payment_intent as string
        );
      } else if (priceType === 'pro_monthly') {
        await sink.updateSubscription(
          userId,
          'pro',
          session.customer as string,
          session.subscription as string
        );
        await sink.addCredits(userId, PRO_MONTHLY_CREDITS, 'Pro subscription - 20 monthly credits');
      } else if (priceType === 'unlimited_monthly') {
        await sink.updateSubscription(
          userId,
          'unlimited',
          session.customer as string,
          session.subscription as string
        );
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      // On each paid monthly cycle, replenish the pro plan's monthly credits.
      if (invoice.billing_reason === 'subscription_cycle') {
        const customerId = invoice.customer as string;
        const record = await sink.getByStripeCustomerId(customerId);
        if (record && record.subscriptionTier === 'pro') {
          await sink.addCredits(record.userId, PRO_MONTHLY_CREDITS, 'Pro subscription - monthly renewal');
        }
      }
      break;
    }

    case 'customer.subscription.deleted':
      // Cancellation is handled by Stripe's portal + tier sync; nothing to apply.
      break;
  }
}
