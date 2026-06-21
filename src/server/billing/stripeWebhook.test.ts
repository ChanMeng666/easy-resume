import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import {
  applyStripeEvent,
  PRO_MONTHLY_CREDITS,
  CREDIT_PACK_SIZE,
  type StripeEventSink,
} from './stripeWebhook';

/**
 * Pins the Stripe webhook business logic, focusing on the pro monthly-renewal
 * replenishment (the bug that previously only logged) plus its negative cases
 * and the one-time purchase / subscription paths.
 */

function makeSink(customerRecord: { userId: string; subscriptionTier: string | null } | null = null) {
  const sink: StripeEventSink = {
    addCredits: vi.fn().mockResolvedValue(undefined),
    updateSubscription: vi.fn().mockResolvedValue(undefined),
    getByStripeCustomerId: vi.fn().mockResolvedValue(customerRecord),
    reverseByStripePaymentId: vi.fn().mockResolvedValue(undefined),
  };
  return sink;
}

/** Build a minimal customer.subscription.deleted event. */
function subscriptionDeletedEvent(customer = 'cus_123'): Stripe.Event {
  return {
    type: 'customer.subscription.deleted',
    data: { object: { customer } },
  } as unknown as Stripe.Event;
}

/** Build a minimal invoice.payment_failed event. */
function paymentFailedEvent(customer = 'cus_123'): Stripe.Event {
  return {
    type: 'invoice.payment_failed',
    data: { object: { customer, billing_reason: 'subscription_cycle' } },
  } as unknown as Stripe.Event;
}

/** Build a minimal charge.refunded event. */
function refundEvent(paymentIntent: unknown = 'pi_1'): Stripe.Event {
  return {
    type: 'charge.refunded',
    data: { object: { payment_intent: paymentIntent } },
  } as unknown as Stripe.Event;
}

/** Build a minimal invoice.payment_succeeded event. */
function invoiceEvent(billingReason: string, customer = 'cus_123'): Stripe.Event {
  return {
    type: 'invoice.payment_succeeded',
    data: { object: { billing_reason: billingReason, customer } },
  } as unknown as Stripe.Event;
}

/** Build a minimal checkout.session.completed event. */
function checkoutEvent(metadata: Record<string, string>): Stripe.Event {
  return {
    type: 'checkout.session.completed',
    data: {
      object: { metadata, payment_intent: 'pi_1', customer: 'cus_123', subscription: 'sub_1' },
    },
  } as unknown as Stripe.Event;
}

describe('applyStripeEvent — pro monthly renewal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replenishes 20 credits on a pro subscription_cycle invoice', async () => {
    const sink = makeSink({ userId: 'user_1', subscriptionTier: 'pro' });
    await applyStripeEvent(invoiceEvent('subscription_cycle'), sink);

    expect(sink.getByStripeCustomerId).toHaveBeenCalledWith('cus_123');
    expect(sink.addCredits).toHaveBeenCalledTimes(1);
    expect(sink.addCredits).toHaveBeenCalledWith(
      'user_1',
      PRO_MONTHLY_CREDITS,
      'Pro subscription - monthly renewal'
    );
  });

  it('does NOT replenish for a non-pro (free) customer', async () => {
    const sink = makeSink({ userId: 'user_2', subscriptionTier: 'free' });
    await applyStripeEvent(invoiceEvent('subscription_cycle'), sink);
    expect(sink.addCredits).not.toHaveBeenCalled();
  });

  it('does NOT replenish for a non-cycle billing reason (e.g. subscription_create)', async () => {
    const sink = makeSink({ userId: 'user_1', subscriptionTier: 'pro' });
    await applyStripeEvent(invoiceEvent('subscription_create'), sink);
    expect(sink.getByStripeCustomerId).not.toHaveBeenCalled();
    expect(sink.addCredits).not.toHaveBeenCalled();
  });

  it('does NOT replenish when the customer is unknown', async () => {
    const sink = makeSink(null);
    await applyStripeEvent(invoiceEvent('subscription_cycle'), sink);
    expect(sink.addCredits).not.toHaveBeenCalled();
  });
});

describe('applyStripeEvent — checkout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grants a 5-credit pack on credits_5 purchase', async () => {
    const sink = makeSink();
    await applyStripeEvent(checkoutEvent({ userId: 'user_1', priceType: 'credits_5' }), sink);
    expect(sink.addCredits).toHaveBeenCalledWith('user_1', CREDIT_PACK_SIZE, 'Purchased 5 credits', 'pi_1');
    expect(sink.updateSubscription).not.toHaveBeenCalled();
  });

  it('sets pro tier and grants monthly credits on pro_monthly checkout', async () => {
    const sink = makeSink();
    await applyStripeEvent(checkoutEvent({ userId: 'user_1', priceType: 'pro_monthly' }), sink);
    expect(sink.updateSubscription).toHaveBeenCalledWith('user_1', 'pro', 'cus_123', 'sub_1');
    expect(sink.addCredits).toHaveBeenCalledWith('user_1', PRO_MONTHLY_CREDITS, 'Pro subscription - 20 monthly credits');
  });

  it('sets unlimited tier without granting credits on unlimited_monthly', async () => {
    const sink = makeSink();
    await applyStripeEvent(checkoutEvent({ userId: 'user_1', priceType: 'unlimited_monthly' }), sink);
    expect(sink.updateSubscription).toHaveBeenCalledWith('user_1', 'unlimited', 'cus_123', 'sub_1');
    expect(sink.addCredits).not.toHaveBeenCalled();
  });

  it('ignores a checkout event with missing metadata', async () => {
    const sink = makeSink();
    await applyStripeEvent(checkoutEvent({}), sink);
    expect(sink.addCredits).not.toHaveBeenCalled();
    expect(sink.updateSubscription).not.toHaveBeenCalled();
  });
});

describe('applyStripeEvent — subscription cancellation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('downgrades the user to free on subscription deletion', async () => {
    const sink = makeSink({ userId: 'user_1', subscriptionTier: 'pro' });
    await applyStripeEvent(subscriptionDeletedEvent(), sink);
    expect(sink.getByStripeCustomerId).toHaveBeenCalledWith('cus_123');
    expect(sink.updateSubscription).toHaveBeenCalledWith('user_1', 'free');
  });

  it('is a no-op when the cancelled customer is unknown', async () => {
    const sink = makeSink(null);
    await applyStripeEvent(subscriptionDeletedEvent(), sink);
    expect(sink.updateSubscription).not.toHaveBeenCalled();
  });
});

describe('applyStripeEvent — payment failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not change the tier or credits on a failed renewal', async () => {
    const sink = makeSink({ userId: 'user_1', subscriptionTier: 'pro' });
    await applyStripeEvent(paymentFailedEvent(), sink);
    expect(sink.updateSubscription).not.toHaveBeenCalled();
    expect(sink.addCredits).not.toHaveBeenCalled();
  });
});

describe('applyStripeEvent — refund', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reverses credits for the refunded payment intent', async () => {
    const sink = makeSink();
    await applyStripeEvent(refundEvent('pi_1'), sink);
    expect(sink.reverseByStripePaymentId).toHaveBeenCalledWith('pi_1');
  });

  it('ignores a refund with no payment intent', async () => {
    const sink = makeSink();
    await applyStripeEvent(refundEvent(null), sink);
    expect(sink.reverseByStripePaymentId).not.toHaveBeenCalled();
  });
});
