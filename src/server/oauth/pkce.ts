/**
 * PKCE (RFC 7636) verification — S256 method only.
 *
 * The Authorization Server issues public clients only, so PKCE is the sole proof
 * that the party redeeming an authorization code is the same one that started the
 * flow. We deliberately support ONLY the S256 method (a `plain` challenge offers
 * no protection and is rejected at the authorize endpoint).
 */

import { createHash, timingSafeEqual } from 'node:crypto';

// RFC 7636 §4.1: a code_verifier is 43-128 characters from the unreserved set
// [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~".
const UNRESERVED_43_128 = /^[A-Za-z0-9\-._~]{43,128}$/;

/**
 * Validate a `code_verifier`'s charset and length per RFC 7636 §4.1. A value that
 * fails here can never produce a matching challenge, so callers reject it early.
 */
export function isValidCodeVerifier(verifier: unknown): verifier is string {
  return typeof verifier === 'string' && UNRESERVED_43_128.test(verifier);
}

/**
 * Validate a `code_challenge`'s shape. For S256 the challenge is the base64url
 * (unpadded) SHA-256 of the verifier — always 43 chars — but we accept the full
 * unreserved 43-128 range so a spec-compliant client is never rejected on shape.
 */
export function isValidCodeChallenge(challenge: unknown): challenge is string {
  return typeof challenge === 'string' && UNRESERVED_43_128.test(challenge);
}

/** base64url(SHA-256(input)), unpadded — the S256 transformation. */
function s256(input: string): string {
  return createHash('sha256').update(input).digest('base64url');
}

/**
 * Verify a presented `code_verifier` against a stored S256 `code_challenge`.
 * Returns true only when the verifier is well-formed AND
 * base64url(sha256(verifier)) equals the challenge under a timing-safe compare.
 */
export function verifyChallenge(verifier: string, challenge: string): boolean {
  if (!isValidCodeVerifier(verifier)) return false;
  if (typeof challenge !== 'string' || challenge.length === 0) return false;

  const computed = Buffer.from(s256(verifier));
  const expected = Buffer.from(challenge);
  // Length check first: timingSafeEqual throws on unequal lengths, and the length
  // of a base64url SHA-256 digest is not itself a secret.
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}
