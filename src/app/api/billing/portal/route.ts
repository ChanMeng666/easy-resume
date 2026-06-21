import { NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { creditService } from "@/lib/services/creditService";
import { createPortalSession } from "@/lib/stripe/checkout";

/**
 * POST /api/billing/portal - Open the Stripe Customer Portal.
 *
 * Lets a subscribed user manage or cancel their subscription from inside the
 * app. Cancelling there triggers a `customer.subscription.deleted` webhook,
 * which downgrades the user back to the free tier (see stripeWebhook.ts).
 */
export async function POST() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const record = await creditService.getOrCreate(user.id);
    if (!record.stripeCustomerId) {
      return NextResponse.json(
        { error: "No active subscription to manage" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createPortalSession(
      record.stripeCustomerId,
      `${appUrl}/dashboard`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json(
      { error: "Failed to open billing portal" },
      { status: 500 }
    );
  }
}
