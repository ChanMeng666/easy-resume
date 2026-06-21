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

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Idempotency: Stripe retries webhooks. Process each event id exactly once
    // so retries can't double-credit a user.
    const isNew = await creditService.recordStripeEvent(event.id, event.type);
    if (!isNew) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Business logic is extracted + unit tested (src/server/billing/stripeWebhook.ts).
    await applyStripeEvent(event, creditService);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
