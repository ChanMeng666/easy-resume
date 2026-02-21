import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { creditService } from "@/lib/services/creditService";

/**
 * POST /api/credits/webhook - Stripe webhook handler.
 * Processes checkout completions and subscription events.
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
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const priceType = session.metadata?.priceType;

        if (!userId || !priceType) break;

        if (priceType === "credits_5") {
          await creditService.addCredits(userId, 5, "Purchased 5 credits", session.payment_intent as string);
        } else if (priceType === "pro_monthly") {
          await creditService.updateSubscription(
            userId,
            "pro",
            session.customer as string,
            session.subscription as string
          );
          await creditService.addCredits(userId, 20, "Pro subscription - 20 monthly credits");
        } else if (priceType === "unlimited_monthly") {
          await creditService.updateSubscription(
            userId,
            "unlimited",
            session.customer as string,
            session.subscription as string
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        // Find user by stripe customer ID and downgrade
        // This is a simplified approach - in production, store customer ID mapping
        console.log(`Subscription cancelled for customer: ${customerId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.billing_reason === "subscription_cycle") {
          // Recurring payment - refresh monthly credits for pro users
          const customerId = invoice.customer as string;
          console.log(`Monthly renewal for customer: ${customerId}`);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
