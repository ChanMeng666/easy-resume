/**
 * URL scheme allowlist for user-derived links on the public career endpoints.
 *
 * A candidate's parsed background can carry arbitrary profile/project URLs, and
 * zod's `.url()` happily accepts `javascript:`, `data:`, and `vbscript:` schemes.
 * Rendering those into an `href` (or a Markdown link) would execute attacker JS
 * on the vitex.org.nz origin when a viewer clicks — `rel` attributes do NOT
 * mitigate a `javascript:` href. This is the single gate every public link
 * passes through: only `http:`/`https:` URLs survive; anything else returns null
 * so the caller renders plain text instead of a link.
 */

/**
 * Return the normalized href of `url` only if it is a safe web link
 * (`http:`/`https:`), else null. Unparseable input also returns null.
 */
export function safePublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}
