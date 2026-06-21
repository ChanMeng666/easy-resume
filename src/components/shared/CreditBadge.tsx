'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUser } from '@stackframe/stack';
import { Coins } from 'lucide-react';

/**
 * Navbar credit indicator.
 *
 * For signed-in users, fetches the current balance and renders a compact badge
 * linking to the dashboard. Unlimited plans show "∞". Renders nothing when the
 * user is signed out or the balance hasn't loaded, so it never blocks the
 * navbar or causes a hydration mismatch.
 */
export function CreditBadge() {
  const user = useUser();
  const [info, setInfo] = useState<{ balance: number; tier: string } | null>(null);

  useEffect(() => {
    if (!user) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    fetch('/api/credits')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setInfo({ balance: data.balance, tier: data.subscriptionTier });
        }
      })
      .catch(() => {
        // Non-critical: silently skip the badge on failure.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !info) return null;

  const isUnlimited = info.tier === 'unlimited';
  const isLow = !isUnlimited && info.balance <= 0;
  const display = isUnlimited ? '∞' : String(info.balance);

  return (
    <Link
      href="/dashboard"
      title="View credits & billing"
      className={`hidden sm:flex items-center gap-1.5 text-sm font-black px-3 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.9)] ${
        isLow ? 'bg-red-100 text-red-900' : 'bg-cyan-100 text-foreground'
      }`}
    >
      <Coins className="w-4 h-4" />
      {display}
    </Link>
  );
}
