import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { creditService } from "@/lib/services/creditService";
import { createCreditCheckout } from "@/lib/stripe/checkout";
import { UnauthenticatedError, ValidationError } from "@/server/errors/AppError";
import { errorResponse } from "@/server/errors/envelope";
import { enforceRateLimit } from "@/server/ratelimit";

// Reads are frequent (dashboard polling); checkout-session creation hits Stripe
// and is money-adjacent, so it is capped much tighter.
const CREDITS_READ_LIMIT = 30;
const CREDITS_READ_WINDOW_SECONDS = 60;
const CHECKOUT_LIMIT = 5;
const CHECKOUT_WINDOW_SECONDS = 60;

/** GET /api/credits - Get credit balance and subscription info. */
export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const user = await stackServerApp.getUser();
    if (!user) throw new UnauthenticatedError();
    await enforceRateLimit(`credits:${user.id}`, CREDITS_READ_LIMIT, CREDITS_READ_WINDOW_SECONDS);

    const record = await creditService.getOrCreate(user.id);
    const transactions = await creditService.getTransactions(user.id);

    return NextResponse.json({
      balance: record.balance,
      subscriptionTier: record.subscriptionTier,
      transactions,
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

/** POST /api/credits - Purchase credits or subscription via Stripe checkout. */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const user = await stackServerApp.getUser();
    if (!user) throw new UnauthenticatedError();
    await enforceRateLimit(`checkout:${user.id}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_SECONDS);

    const { priceType } = await request.json();
    if (!priceType || !["credits_5", "pro_monthly", "unlimited_monthly"].includes(priceType)) {
      throw new ValidationError("Invalid priceType");
    }

    const record = await creditService.getOrCreate(user.id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await createCreditCheckout(
      user.id,
      record.stripeCustomerId,
      priceType as "credits_5" | "pro_monthly" | "unlimited_monthly",
      `${appUrl}/dashboard?tab=credits&success=true`,
      `${appUrl}/pricing?cancelled=true`
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
