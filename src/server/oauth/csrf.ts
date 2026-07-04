/**
 * CSRF protection for the consent form (double-submit cookie).
 *
 * The GET consent page sets a random token in an httpOnly, SameSite=Lax cookie
 * AND embeds the same value as a hidden form field. On POST the two must match
 * (timing-safe). An attacker who can forge a cross-site POST still cannot read or
 * set the httpOnly cookie, so the hidden field can never match the victim's
 * cookie — the "Allow" action can't be triggered without a genuine page render.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Name of the httpOnly cookie that carries the consent CSRF token. */
export const CSRF_COOKIE = 'oauth_csrf';

/** Mint a fresh, unguessable CSRF token. */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Verify a submitted CSRF token against the cookie value under a timing-safe
 * compare. Both must be present and byte-identical.
 */
export function verifyCsrfToken(cookieValue: string | undefined | null, formValue: unknown): boolean {
  if (!cookieValue || typeof formValue !== 'string' || formValue.length === 0) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(formValue);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
