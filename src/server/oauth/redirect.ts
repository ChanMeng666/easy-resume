/**
 * redirect_uri validation — the primary open-redirect defense of the AS.
 *
 * Two distinct checks:
 *  - `validateRedirectUri`: authorize/token-time — EXACT string match against the
 *    client's registered set. No prefix, subpath, host, scheme, or trailing-slash
 *    tolerance whatsoever. An attacker who cannot produce a byte-identical URI
 *    cannot be redirected to.
 *  - `isValidRegistrationRedirectUri`: registration-time — each candidate URI must
 *    parse, carry no fragment, and be `https:` (or `http:` for loopback only).
 */

/**
 * Exact-match a supplied redirect_uri against a client's registered list. The
 * comparison is a raw string equality — the stored URI is whatever the client
 * registered, and only a byte-identical value is accepted.
 */
export function validateRedirectUri(registered: string[], supplied: string): boolean {
  if (typeof supplied !== 'string' || supplied.length === 0) return false;
  if (!Array.isArray(registered)) return false;
  return registered.some((uri) => uri === supplied);
}

/**
 * Validate a single redirect_uri at registration time. Rejects anything that
 * cannot be a safe OAuth redirect target: unparseable URIs, URIs with a fragment
 * (RFC 6749 §3.1.2), and any non-`https:` scheme except `http:` on a loopback
 * host (localhost / 127.0.0.1 / [::1], for native-app local development).
 */
export function isValidRegistrationRedirectUri(uri: unknown): boolean {
  if (typeof uri !== 'string' || uri.length === 0 || uri.length > 2000) return false;

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return false;
  }

  // No fragment component allowed in a redirect_uri.
  if (parsed.hash) return false;

  if (parsed.protocol === 'https:') return true;

  if (parsed.protocol === 'http:') {
    const host = parsed.hostname;
    const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
    return isLoopback;
  }

  return false;
}
