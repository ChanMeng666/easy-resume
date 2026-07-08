'use client';

import { useUser, useStackApp } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Inner component that uses useUser hook.
 * Must be wrapped in Suspense boundary.
 */
function UserButtonInner() {
  const user = useUser();
  const app = useStackApp();

  if (user) {
    const initials = user.displayName
      ? user.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : user.primaryEmail?.[0]?.toUpperCase() || "U";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <span className="text-sm font-medium">{initials}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <span className="text-xs font-medium">{initials}</span>
            </div>
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">
                {user.displayName || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.primaryEmail}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profiles" className="cursor-pointer">
              Profiles
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard" className="cursor-pointer">
              Credits &amp; Billing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/pricing" className="cursor-pointer">
              Pricing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/handler/account-settings" className="cursor-pointer">
              Account Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={() => app.signOut()}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/handler/sign-in">
      <Button variant="outline" size="sm">
        Sign in
      </Button>
    </Link>
  );
}

/**
 * User button component that shows user menu when logged in,
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
