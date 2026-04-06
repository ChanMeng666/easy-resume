import Stripe from "stripe";

/** Lazily-initialized singleton Stripe client. */
let _stripe: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

/** Stripe client singleton (lazy-initialized to avoid build-time errors). */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripeInstance() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** @deprecated Use `stripe` directly. Kept for migration compatibility. */
export function getStripe(): Stripe {
  return getStripeInstance();
}
