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
import { createLogger } from '@/server/log/logger';
import { trackEvent } from '@/server/analytics/track';

const log = createLogger({ scope: 'stripe-webhook' });

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
  reverseByStripePaymentId(stripePaymentId: string): Promise<void>;
}

/** Pro plan's included monthly credit allowance. */
export const PRO_MONTHLY_CREDITS = 20;
/** One-time credit pack size. */
export const CREDIT_PACK_SIZE = 5;

/**
 * Apply a verified, deduplicated Stripe event to the credit sink.
 * - checkout.session.completed: grant credits / set subscription tier
 * - invoice.payment_succeeded (subscription_cycle): replenish pro monthly credits
 * - invoice.payment_failed: log the failed renewal (Stripe retries; final
 *   failure surfaces as subscription.deleted → downgrade)
 * - customer.subscription.deleted: downgrade the user back to the free tier
 * - charge.refunded: reverse the credits granted by the refunded purchase
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
        // Funnel telemetry (best-effort): a paid credit grant landed.
        await trackEvent({ userId, event: 'credit_purchase', props: { kind: 'credits_5', credits: CREDIT_PACK_SIZE, stripeEventType: event.type } });
      } else if (priceType === 'pro_monthly') {
        await sink.updateSubscription(
          userId,
          'pro',
          session.customer as string,
          session.subscription as string
        );
        await sink.addCredits(userId, PRO_MONTHLY_CREDITS, 'Pro subscription - 20 monthly credits');
        await trackEvent({ userId, event: 'credit_purchase', props: { kind: 'pro_monthly', credits: PRO_MONTHLY_CREDITS, stripeEventType: event.type } });
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
          await trackEvent({ userId: record.userId, event: 'credit_purchase', props: { kind: 'pro_renewal', credits: PRO_MONTHLY_CREDITS, stripeEventType: event.type } });
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const record = customerId ? await sink.getByStripeCustomerId(customerId) : null;
      // Keep the tier as-is: Stripe retries the invoice, and a terminal failure
      // arrives later as customer.subscription.deleted (handled below). Record it
      // so a failed renewal is never silent.
      log.warn('Subscription invoice payment failed', {
        userId: record?.userId,
        stripeCustomerId: customerId,
        billingReason: invoice.billing_reason ?? undefined,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      // The subscription ended (cancelled in the portal or terminal payment
      // failure). Downgrade the user back to free so billing state stays correct.
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const record = customerId ? await sink.getByStripeCustomerId(customerId) : null;
      if (record) {
        await sink.updateSubscription(record.userId, 'free');
      }
      break;
    }

    case 'charge.refunded': {
      // Reverse the credits granted by the original one-time purchase.
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent = charge.payment_intent;
      if (typeof paymentIntent === 'string' && paymentIntent) {
        await sink.reverseByStripePaymentId(paymentIntent);
      }
      break;
    }
  }
}
