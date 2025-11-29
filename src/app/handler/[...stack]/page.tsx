import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/auth/stack";

/**
 * Stack Auth handler page component.
 * Renders sign-in, sign-up, sign-out, and account settings pages.
 */
export default function Handler(props: { params: Promise<{ stack: string[] }> }) {
  return <StackHandler fullPage app={stackServerApp} {...props} />;
}
