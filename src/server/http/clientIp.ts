/**
 * Shared, spoof-resistant client-IP resolution for our trusted proxy chain.
 *
 * Requests reach the app through Cloudflare (once the orange-cloud proxy is
 * enabled) → Traefik → the app. This single helper is correct in both the
 * current Traefik-only setup and after Cloudflare fronts it, so every per-IP
 * rate-limit key buckets by the same real client address.
 *
 * The header priority below is deliberate: only headers set by a trusted hop are
 * authoritative, and we never trust a client-supplied left-most value.
 */

/** Resolve the real client IP behind our trusted proxy chain (Cloudflare -> Traefik). */
export function clientIp(req: Request): string {
  // 1. Cloudflare sets CF-Connecting-IP to the true client. Once the orange
  //    cloud is on, Traefik only ever sees Cloudflare edge IPs, so when this
  //    header is present it is the authoritative source.
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  // 2. Otherwise use the LAST entry of X-Forwarded-For. Traefik v3 either
  //    overwrites the header with the real remote address or appends to it; in
  //    both cases the right-most entry is the hop our trusted proxy actually
  //    saw. The left-most entries are client-supplied and trivially spoofed.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  // 3. Fall back to X-Real-IP (set by some proxies as the single client IP).
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;

  // 4. No usable header — a stable sentinel so rate-limit keys stay well-formed.
  return 'unknown';
}
