import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/lib/auth/stack";
import { creditService } from "@/lib/services/creditService";
import { createCreditCheckout } from "@/lib/stripe/checkout";

/** GET /api/credits - Get credit balance and subscription info. */
export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const record = await creditService.getOrCreate(user.id);
    const transactions = await creditService.getTransactions(user.id);

    return NextResponse.json({
      balance: record.balance,
      subscriptionTier: record.subscriptionTier,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching credits:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}

/** POST /api/credits - Purchase credits or subscription via Stripe checkout. */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { priceType } = await request.json();
    if (!priceType || !["credits_5", "pro_monthly", "unlimited_monthly"].includes(priceType)) {
      return NextResponse.json({ error: "Invalid priceType" }, { status: 400 });
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
    console.error("Error creating checkout:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
