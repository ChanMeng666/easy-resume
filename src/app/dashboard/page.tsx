"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
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
 * Dashboard page — credit balance and billing history for the signed-in user.
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = useUser();
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);

  useEffect(() => {
    if (user === null) {
      router.push("/handler/sign-in?after_auth_return_to=/dashboard");
    }
  }, [user, router]);

  const fetchCredits = useCallback(async () => {
    try {
      const response = await fetch("/api/credits");
      if (response.ok) setCreditInfo(await response.json());
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    }
  }, []);

  useEffect(() => {
    if (user) fetchCredits();
  }, [user, fetchCredits]);

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black">Your Balance</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Credits are consumed each time the AI generates a resume.
              </p>
            </div>
            <Button onClick={() => router.push("/pricing")}>Buy Credits</Button>
          </div>

          {creditInfo ? (
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="bg-white rounded-xl p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-muted-foreground">Current Balance</p>
                    <p className="text-4xl font-black">{creditInfo.balance} credits</p>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-purple-100 border-2 border-black">
                    <p className="text-sm font-black capitalize">
                      {creditInfo.subscriptionTier} Plan
                    </p>
                  </div>
                </div>
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
