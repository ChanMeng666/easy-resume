import "server-only";
import { StackServerApp } from "@stackframe/stack";

/**
 * Stack Auth server-side application instance.
 * Used for server components and API routes to access user data.
 */
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});
