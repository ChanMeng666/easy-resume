'use client';

import { StackProvider as BaseStackProvider, StackTheme, StackClientApp } from "@stackframe/stack";
import { useMemo } from "react";

/**
 * Stack Auth theme — aligns the hosted sign-in / sign-up / account UI with
 * Vitex's "typeset proof" palette (purple primary, ink borders, paper bg) so
 * the delegated auth pages don't look foreign.
 */
const vitexAuthTheme = {
  light: {
    primary: "#6C3CE9",
    primaryForeground: "#ffffff",
    background: "#ffffff",
    foreground: "#1a1a1a",
    accent: "#00D4AA",
    border: "#0a0a0a",
    ring: "#6C3CE9",
  },
  radius: "0.75rem",
};

/**
 * Stack Auth provider component that wraps the application.
 * Provides authentication context and theming to all child components.
 */
export function StackAuthProvider({ children }: { children: React.ReactNode }) {
  const stackApp = useMemo(() => {
    return new StackClientApp({
      tokenStore: "nextjs-cookie",
    });
  }, []);

  return (
    <BaseStackProvider app={stackApp}>
      <StackTheme theme={vitexAuthTheme}>
        {children}
      </StackTheme>
    </BaseStackProvider>
  );
}
