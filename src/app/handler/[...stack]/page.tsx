import Link from "next/link";
import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/auth/stack";

/**
 * Stack Auth handler page component.
 * Renders sign-in, sign-up, sign-out, and account settings pages.
 * A minimal escape hatch back to the app sits above the Stack UI — the
 * fullPage handler renders no app chrome, so without it these pages
 * (especially account-settings) are dead ends.
 */
export default function Handler(props: { params: Promise<{ stack: string[] }> }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-content px-4 pt-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-full px-3 py-2 text-sm text-aubergine transition-colors hover:bg-bone"
        >
          ← Back to Vitex
        </Link>
      </div>
      <StackHandler fullPage app={stackServerApp} {...props} />
    </div>
  );
}
