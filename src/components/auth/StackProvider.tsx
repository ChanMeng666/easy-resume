'use client';

import { StackProvider as BaseStackProvider, StackTheme, StackClientApp } from "@stackframe/stack";
import { useMemo } from "react";

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
      <StackTheme>
        {children}
      </StackTheme>
    </BaseStackProvider>
  );
}
