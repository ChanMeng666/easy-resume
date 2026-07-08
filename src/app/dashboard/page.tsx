"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@stackframe/stack";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { PageShell } from "@/components/shared/PageShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="min-h-screen bg-background">
        <Navbar currentPath="/dashboard" />
        <PageShell width="narrow">
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-muted-foreground animate-pulse">Loading…</p>
          </div>
        </PageShell>
      </div>
    );
  }

  if (user === null) return null;

  const isPaidTier =
    creditInfo != null && creditInfo.subscriptionTier !== "free";

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentPath="/dashboard" />

      <PageShell width="narrow" as="main">
        <PageHeader
          eyebrow="Account"
          title="Credits & Billing"
          lede="Manage your credit balance and subscription."
        />

        <div>
          {/* Payment success confirmation */}
          {showSuccess && (
            <div className="mb-6 flex items-start gap-3 bg-mint/15 text-mint-ink rounded-2xl p-4">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Payment successful!</p>
                <p className="text-sm">
                  Your credits have been added to your account.
                </p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="px-2"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl">Your Balance</h2>
              <p className="text-sm text-muted-foreground">
                Credits are consumed each time the AI generates a resume.
              </p>
            </div>
            <Button onClick={() => router.push("/pricing")}>Buy Credits</Button>
          </div>

          {loadError ? (
            <div className="bg-blush text-rose-ink rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Couldn&apos;t load your balance</p>
              </div>
              <p className="text-sm mb-4">
                Something went wrong fetching your billing info.
              </p>
              <Button variant="outline" onClick={fetchCredits}>
                Try again
              </Button>
            </div>
          ) : creditInfo ? (
            <div className="space-y-8">
              {/* Balance meter */}
              <div className="bg-bone rounded-3xl p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
                    <p className="text-5xl font-light text-aubergine leading-none">
                      {creditInfo.subscriptionTier === "unlimited"
                        ? "∞"
                        : creditInfo.balance}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3">
                      {creditInfo.subscriptionTier === "unlimited"
                        ? "unlimited credits"
                        : "credits available"}
                    </p>
                  </div>
                  <Badge variant="accent">{creditInfo.subscriptionTier} plan</Badge>
                </div>
                {isPaidTier && (
                  <div className="mt-6 pt-6 border-t border-ash">
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

              {/* Transaction ledger */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg">Transaction History</h3>
                  <span className="text-sm text-muted-foreground">
                    {creditInfo.transactions.length} entries
                  </span>
                </div>
                {creditInfo.transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6">
                    No transactions yet.
                  </p>
                ) : (
                  <div>
                    {creditInfo.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-4 py-4 border-b border-ash"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`font-medium text-sm flex-shrink-0 ${
                            tx.amount > 0 ? "text-mint-ink" : "text-rose-ink"
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
            <Skeleton className="h-[200px] w-full rounded-3xl" />
          )}

          {/* API keys & connections — read-only list + revoke. This is where a
              user manages the keys their agents hold, including keys minted by an
              MCP connector (ChatGPT / Claude), which are labeled "MCP: <client>". */}
          {apiKeys && (
            <div className="mt-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg">Connections &amp; API Keys</h3>
                <span className="text-sm text-muted-foreground">
                  {apiKeys.filter((k) => !k.revokedAt).length} active
                </span>
              </div>
              {apiKeys.filter((k) => !k.revokedAt).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No active keys. Mint a key via the API, or{" "}
                  <Link
                    href="/connect"
                    className="text-aubergine underline underline-offset-2 hover:text-periwinkle"
                  >
                    connect ChatGPT or Claude
                  </Link>{" "}
                  as an MCP connector, and it will appear here so you can revoke it
                  anytime.
                </p>
              ) : (
                <div>
                  {apiKeys
                    .filter((k) => !k.revokedAt)
                    .map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between gap-4 py-4 border-b border-ash"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {key.name}
                            </p>
                            {key.name.startsWith("MCP:") && (
                              <Badge variant="accent" className="flex-shrink-0">
                                connector
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {key.prefix}…
                            {key.lastUsedAt
                              ? ` · last used ${new Date(
                                  key.lastUsedAt
                                ).toLocaleDateString()}`
                              : " · never used"}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
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
      </PageShell>
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
        <div className="min-h-screen bg-background">
          <Navbar currentPath="/dashboard" />
          <PageShell width="narrow">
            <Skeleton className="h-[200px] w-full rounded-3xl" />
          </PageShell>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
