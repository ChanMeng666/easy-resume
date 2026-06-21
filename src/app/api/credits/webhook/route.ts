import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { creditService } from "@/lib/services/creditService";
import { applyStripeEvent } from "@/server/billing/stripeWebhook";

/**
 * POST /api/credits/webhook - Stripe webhook handler.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Misconfiguration: fail loudly rather than silently rejecting every event.
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: Stripe retries webhooks. recordStripeEvent doubles as a
  // processing lock — it marks the event seen BEFORE the business logic runs.
  const isNew = await creditService.recordStripeEvent(event.id, event.type);
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    // Business logic is extracted + unit tested (src/server/billing/stripeWebhook.ts).
    await applyStripeEvent(event, creditService);
    return NextResponse.json({ received: true });
  } catch (error) {
    // Processing failed after we claimed the lock. Release it so Stripe's retry
    // is reprocessed instead of being skipped as a duplicate — otherwise a
    // paid-for credit grant or tier change could be lost forever.
    console.error("Webhook processing error:", error);
    await creditService.deleteStripeEvent(event.id).catch((cleanupErr) => {
      console.error("Failed to release webhook lock:", cleanupErr);
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
