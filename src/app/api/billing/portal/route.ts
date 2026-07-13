import { NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { creditService } from "@/lib/services/creditService";
import { createPortalSession } from "@/lib/stripe/checkout";
import { UnauthenticatedError, ValidationError } from "@/server/errors/AppError";
import { errorResponse } from "@/server/errors/envelope";
import { enforceRateLimit } from "@/server/ratelimit";

// Opening the Stripe portal is money-adjacent and hits Stripe; cap tightly.
const PORTAL_LIMIT = 5;
const PORTAL_WINDOW_SECONDS = 60;

/**
 * POST /api/billing/portal - Open the Stripe Customer Portal.
 *
 * Lets a subscribed user manage or cancel their subscription from inside the
 * app. Cancelling there triggers a `customer.subscription.deleted` webhook,
 * which downgrades the user back to the free tier (see stripeWebhook.ts).
 */
export async function POST() {
  const requestId = crypto.randomUUID();
  try {
    const user = await stackServerApp.getUser();
    if (!user) throw new UnauthenticatedError();
    await enforceRateLimit(`portal:${user.id}`, PORTAL_LIMIT, PORTAL_WINDOW_SECONDS);

    const record = await creditService.getOrCreate(user.id);
    if (!record.stripeCustomerId) {
      throw new ValidationError("No active subscription to manage");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await createPortalSession(
      record.stripeCustomerId,
      `${appUrl}/dashboard`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
