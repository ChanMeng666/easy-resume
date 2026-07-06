/**
 * Friendly 404 for the public career endpoint — shown when a slug is unknown or
 * the profile is currently unpublished. Noindex (nothing to index here).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Profile not found — Vitex',
  robots: { index: false, follow: false },
};

export default function PublicProfileNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl border border-ash bg-paper p-12 text-center">
        <h1 className="text-2xl font-light tracking-tight text-aubergine">
          Profile not found or not published
        </h1>
        <p className="mt-3 text-body-sm text-muted-foreground">
          The link may be wrong, or its owner hasn&apos;t published it (or has since made it
          private).
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Go to Vitex</Link>
        </Button>
      </div>
    </div>
  );
}
