'use client';

import { useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SignInButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Sign-in button component.
 * Shows "Sign In" when logged out, "Dashboard" when logged in.
 */
export function SignInButton({ className, size = "sm" }: SignInButtonProps) {
  const user = useUser();

  if (user) {
    return (
      <Link href="/dashboard">
        <Button size={size} className={className}>
          Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/handler/sign-in">
      <Button size={size} className={className}>
        Sign In
      </Button>
    </Link>
  );
}
