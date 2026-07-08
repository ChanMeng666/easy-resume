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
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full transition-colors ${
        isLow ? 'bg-blush text-rose-ink' : 'bg-periwinkle/20 text-aubergine hover:bg-periwinkle/30'
      }`}
    >
      <Coins className="w-3.5 h-3.5" />
      {display}
    </Link>
  );
}
