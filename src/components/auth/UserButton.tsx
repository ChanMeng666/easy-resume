'use client';

import { UserButton as StackUserButton, useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Inner component that uses useUser hook.
 * Must be wrapped in Suspense boundary.
 */
function UserButtonInner() {
  const user = useUser();

  if (user) {
    return <StackUserButton />;
  }

  return (
    <Link href="/handler/sign-in">
      <Button variant="outline" size="sm">
        Sign In
      </Button>
    </Link>
  );
}

/**
 * User button component that shows user avatar when logged in,
 * or sign-in button when logged out.
 * Wrapped in Suspense for SSR compatibility.
 */
export function UserButton() {
  return (
    <Suspense fallback={
      <Button variant="outline" size="sm" disabled>
        Loading...
      </Button>
    }>
      <UserButtonInner />
    </Suspense>
  );
}
