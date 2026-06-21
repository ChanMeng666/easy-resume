import "server-only";
import { StackServerApp } from "@stackframe/stack";

/**
 * Neon Auth (Stack Auth) server-side application instance.
 *
 * Stack Auth IS Neon Auth: Neon acquired Stack Auth, and `@stackframe/stack` is
 * the (legacy, fully supported) Neon Auth integration. We deliberately stay on
 * it — zero-risk and already aligned with the Neon stack. Agents authenticate
 * via API keys (see src/server/auth/caller.ts) rather than this cookie session.
 *
 * Used by server components and API routes to access the cookie-session user.
 */
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});
