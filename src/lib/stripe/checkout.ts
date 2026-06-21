import { stripe } from "./client";

/** Stripe price IDs for credit packages. */
const PRICES = {
  credits_5: process.env.STRIPE_PRICE_CREDITS_5 || "",
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  unlimited_monthly: process.env.STRIPE_PRICE_UNLIMITED_MONTHLY || "",
};

/**
 * Creates a Stripe Checkout session for credit purchase.
 */
export async function createCreditCheckout(
  userId: string,
  stripeCustomerId: string | null,
  priceType: "credits_5" | "pro_monthly" | "unlimited_monthly",
  successUrl: string,
  cancelUrl: string
) {
  const priceId = PRICES[priceType];
  if (!priceId) {
    // Surface a clear configuration error instead of letting Stripe reject an
    // empty price id with a cryptic message after the user submits checkout.
    throw new Error(
      `Missing Stripe price id for "${priceType}" — set the corresponding STRIPE_PRICE_* env var`
    );
  }
  const isSubscription = priceType !== "credits_5";

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? "subscription" : "payment",
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, priceType },
  });

  return session;
}

/**
 * Creates a Stripe Customer Portal session for subscription management.
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session;
}
