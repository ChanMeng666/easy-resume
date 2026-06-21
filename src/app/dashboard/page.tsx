"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditInfo {
  balance: number;
  subscriptionTier: string;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

/**
 * Dashboard content — credit balance and billing history for the signed-in user.
 * Reads the `?success=true` query param Stripe appends on a successful checkout
 * to confirm the payment, so it is wrapped in <Suspense> by the page export.
 */
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const justPurchased = searchParams.get("success") === "true";
  const [showSuccess, setShowSuccess] = useState(justPurchased);

  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/dashboard");
    }
  }, [user, router]);

  const fetchCredits = useCallback(async () => {
    try {
      setLoadError(false);
      const response = await fetch("/api/credits");
      if (response.ok) {
        setCreditInfo(await response.json());
      } else {
        setLoadError(true);
      }
    } catch (error) {
      console.error("Failed to fetch credits:", error);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCredits();
  }, [user, fetchCredits]);

  // After returning from a successful checkout, Stripe's webhook applies the
  // credits asynchronously. Refetch shortly after to reflect the new balance.
  useEffect(() => {
    if (user && justPurchased) {
      const t = setTimeout(fetchCredits, 1500);
      return () => clearTimeout(t);
    }
  }, [user, justPurchased, fetchCredits]);

  /** Open the Stripe Customer Portal to manage or cancel the subscription. */
  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalLoading(false);
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      setPortalLoading(false);
    }
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-[#f0f0f0]">
        <Navbar currentPath="/dashboard" />
        <div className="pt-20 container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="p-6 bg-white rounded-xl">
              <p className="font-bold text-muted-foreground animate-pulse">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) return null;

  const isPaidTier =
    creditInfo != null && creditInfo.subscriptionTier !== "free";

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Navbar currentPath="/dashboard" />

      <main className="pt-20 pb-12 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-brand">Credits & Billing</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Manage your credit balance and subscription.
          </p>
        </motion.div>

        <div className="max-w-2xl">
          {/* Payment success confirmation */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-3 bg-green-100 border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
            >
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-700 mt-0.5" />
              <div className="flex-1">
                <p className="font-black text-green-900">Payment successful!</p>
                <p className="text-sm font-medium text-green-800">
                  Your credits have been added to your account.
                </p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="text-green-900 font-black px-2"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </motion.div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black">Your Balance</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Credits are consumed each time the AI generates a resume.
              </p>
            </div>
            <Button onClick={() => router.push("/pricing")}>Buy Credits</Button>
          </div>

          {loadError ? (
            <div className="bg-white rounded-xl p-6 border-2 border-red-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="font-black text-red-800">Couldn&apos;t load your balance</p>
              </div>
              <p className="text-sm text-red-700 mb-4 font-medium">
                Something went wrong fetching your billing info.
              </p>
              <Button variant="outline" onClick={fetchCredits}>
                Try again
              </Button>
            </div>
          ) : creditInfo ? (
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Current Balance</p>
                    <p className="text-4xl font-black">
                      {creditInfo.subscriptionTier === "unlimited"
                        ? "Unlimited"
                        : `${creditInfo.balance} credits`}
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-purple-100 border-2 border-black">
                    <p className="text-sm font-black capitalize">
                      {creditInfo.subscriptionTier} Plan
                    </p>
                  </div>
                </div>
                {isPaidTier && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-100">
                    <Button
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                    >
                      {portalLoading ? "Opening..." : "Manage subscription"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Transaction History */}
              <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-4 border-b-2 border-black">
                  <h3 className="font-black">Transaction History</h3>
                </div>
                {creditInfo.transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground font-medium">
                      No transactions yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {creditInfo.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <p className="text-sm font-bold">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`font-black text-sm ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Skeleton className="h-[200px] w-full rounded-xl" />
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Dashboard page — credit balance and billing history for the signed-in user.
 */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f0f0f0]">
          <Navbar currentPath="/dashboard" />
          <div className="pt-20 container mx-auto px-4">
            <Skeleton className="h-[200px] w-full max-w-2xl rounded-xl" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
