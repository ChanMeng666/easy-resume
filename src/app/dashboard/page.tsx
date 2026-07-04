"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { CropFrame } from "@/components/shared/CropFrame";
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

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string | null;
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
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[] | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

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

  // Load the caller's API keys (metadata only). Connector sign-ins mint a key
  // labeled "MCP: <client>", so this list is where a user sees and revokes the
  // access an MCP connector (ChatGPT / Claude) holds.
  const fetchApiKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(Array.isArray(data.keys) ? data.keys : []);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCredits();
      fetchApiKeys();
    }
  }, [user, fetchCredits, fetchApiKeys]);

  /** Revoke a key (e.g. disconnect an MCP connector) via the existing endpoint. */
  const handleRevokeKey = useCallback(
    async (id: string) => {
      setRevokingKeyId(id);
      try {
        const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (res.ok) await fetchApiKeys();
      } catch (error) {
        console.error("Failed to revoke key:", error);
      } finally {
        setRevokingKeyId(null);
      }
    },
    [fetchApiKeys]
  );

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
      <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
        <Navbar currentPath="/dashboard" />
        <div className="page-shell container mx-auto px-4">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <span className="proof-label">dashboard</span>
              <p className="font-mono text-sm font-medium text-muted-foreground animate-pulse">loading…</p>
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
    <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
      <Navbar currentPath="/dashboard" />

      <main className="page-shell page-pad-b container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="proof-label mb-2">§ Account — Credits &amp; Billing</p>
          <h1 className="text-3xl font-brand">Credits &amp; Billing</h1>
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
            <div className="space-y-8">
              {/* Balance meter */}
              <CropFrame className="bg-white rounded-xl p-6 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="proof-label mb-2">Current Balance</p>
                    <p className="font-mono text-5xl font-bold leading-none">
                      {creditInfo.subscriptionTier === "unlimited"
                        ? "∞"
                        : creditInfo.balance}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground mt-2">
                      {creditInfo.subscriptionTier === "unlimited"
                        ? "unlimited credits"
                        : "credits available"}
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-primary text-white border-2 border-black font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
                    {creditInfo.subscriptionTier} plan
                  </span>
                </div>
                {isPaidTier && (
                  <div className="mt-5 pt-5 border-t-2 border-gray-100">
                    <Button
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                    >
                      {portalLoading ? "Opening..." : "Manage subscription"}
                    </Button>
                  </div>
                )}
              </CropFrame>

              {/* Transaction ledger */}
              <div className="bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
                  <h3 className="proof-label !text-foreground">Ledger — Transaction History</h3>
                  <span className="proof-label">
                    {String(creditInfo.transactions.length).padStart(2, "0")} entries
                  </span>
                </div>
                {creditInfo.transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground font-medium">
                      No transactions yet.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y-2 divide-gray-100">
                    {creditInfo.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{tx.description}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm flex-shrink-0 ${
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

          {/* API keys & connections — read-only list + revoke. This is where a
              user manages the keys their agents hold, including keys minted by an
              MCP connector (ChatGPT / Claude), which are labeled "MCP: <client>". */}
          {apiKeys && (
            <div className="mt-8 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
                <h3 className="proof-label !text-foreground">
                  Connections &amp; API Keys
                </h3>
                <span className="proof-label">
                  {String(
                    apiKeys.filter((k) => !k.revokedAt).length
                  ).padStart(2, "0")}{" "}
                  active
                </span>
              </div>
              {apiKeys.filter((k) => !k.revokedAt).length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground font-medium">
                  No active keys. Connect Vitex to ChatGPT or Claude as an MCP
                  connector, or mint a key via the API, and it will appear here so
                  you can revoke it anytime.
                </div>
              ) : (
                <div className="divide-y-2 divide-gray-100">
                  {apiKeys
                    .filter((k) => !k.revokedAt)
                    .map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold truncate">
                              {key.name}
                            </p>
                            {key.name.startsWith("MCP:") && (
                              <span className="flex-shrink-0 px-2 py-0.5 rounded-lg bg-primary text-white border-2 border-black font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
                                connector
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-muted-foreground truncate">
                            {key.prefix}…
                            {key.lastUsedAt
                              ? ` · last used ${new Date(
                                  key.lastUsedAt
                                ).toLocaleDateString()}`
                              : " · never used"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleRevokeKey(key.id)}
                          disabled={revokingKeyId === key.id}
                          className="flex-shrink-0"
                        >
                          {revokingKeyId === key.id ? "Revoking…" : "Revoke"}
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
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
        <div className="min-h-screen baseline-grid bg-[#f0f0f0]">
          <Navbar currentPath="/dashboard" />
          <div className="page-shell container mx-auto px-4">
            <Skeleton className="h-[200px] w-full max-w-2xl rounded-xl" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
