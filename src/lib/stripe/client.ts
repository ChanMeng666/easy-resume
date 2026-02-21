import Stripe from "stripe";

/**
 * Lazy-initialized Stripe SDK client instance.
 * Deferred to avoid build-time errors when STRIPE_SECRET_KEY is not set.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
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

/** @deprecated Use getStripe() for lazy initialization. */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
