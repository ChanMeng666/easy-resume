'use client';

import { StackProvider as BaseStackProvider, StackTheme, StackClientApp } from "@stackframe/stack";
import { useMemo } from "react";

/**
 * Stack Auth theme — aligns the hosted sign-in / sign-up / account UI with
 * the Phantom palette (aubergine primary, ash borders, paper bg) so the
 * delegated auth pages don't look foreign.
 */
const vitexAuthTheme = {
  light: {
    primary: "#3c315b",
    primaryForeground: "#fdfcfe",
    background: "#fdfcfe",
    foreground: "#1c1c1c",
    accent: "#ab9ff2",
    border: "#e9e8ea",
    ring: "#ab9ff2",
  },
  radius: "1rem",
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
