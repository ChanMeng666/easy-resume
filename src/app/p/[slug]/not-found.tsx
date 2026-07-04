/**
 * Friendly 404 for the public career endpoint — shown when a slug is unknown or
 * the profile is currently unpublished. Noindex (nothing to index here).
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Profile not found — Vitex',
  robots: { index: false, follow: false },
};

export default function PublicProfileNotFound() {
  return (
    <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] p-10 text-center">
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-[#6C3CE9] mb-3">
          404
        </p>
        <h1 className="text-2xl font-black mb-3">This profile isn&apos;t public</h1>
        <p className="text-neutral-600 font-medium mb-8">
          The link may be wrong, or its owner hasn&apos;t published it (or has since made it
          private).
        </p>
        <Link
          href="/"
          className="inline-block border-2 border-black rounded-lg px-5 py-2.5 font-bold bg-[#00D4AA] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] transition-all"
        >
          Go to Vitex
        </Link>
      </div>
    </div>
  );
}
