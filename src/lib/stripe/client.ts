import Stripe from "stripe";

/**
 * Create a per-request Stripe client compatible with Workers runtime.
 * Uses fetch-based HTTP client instead of Node.js http module.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(key, {
    apiVersion: "2026-01-28.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
}
