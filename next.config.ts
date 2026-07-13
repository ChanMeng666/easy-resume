import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy directives (prod only).
 *
 * Kept as a readable array and joined with "; " at the bottom. Notes on the
 * non-obvious sources — anything new that the browser must reach has to be
 * added here or it will be blocked:
 *  - `script-src`/`style-src` need `'unsafe-inline'`: Next.js injects inline
 *    bootstrap scripts and styled-jsx/inline styles at runtime.
 *  - `connect-src` allows `https://api.stack-auth.com`: the Stack Auth (Neon
 *    Auth) browser SDK calls it directly for sign-in/session. `blob:` is for
 *    the mobile pdfjs preview, which fetches the compiled PDF from a blob URL.
 *  - `img-src`/`font-src` allow `data:` (inline SVG/font data URIs) and `blob:`.
 *  - `frame-src`/`worker-src` allow `blob:`: the desktop PDF preview embeds a
 *    blob-URL iframe and pdfjs loads its worker (a same-origin chunk) / blobs.
 *  - No Stripe/CDN/analytics origins: Stripe checkout is a top-level redirect
 *    (no browser JS), fonts are self-hosted via next/font, images are local.
 */
const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-eval' is required by @stackframe/stack — its stack-shared
  // browser-compat shim runs a snippet through indirect eval at startup
  // ((0, eval)(snippet) in @stackframe/stack-shared/dist/esm/utils/
  // browser-compat.js), and the Stack provider wraps every page. Without it
  // the whole app crashes at hydration. Remove when Stack Auth drops the shim.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stack-auth.com blob:",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

/**
 * Security headers applied site-wide via Next.js `headers()`.
 *
 * The always-on set is safe in dev; the prod-only set (HSTS + CSP) is gated
 * behind `isProd` because HSTS on localhost is hostile and the dev bundle needs
 * `'unsafe-eval'` for react-refresh that the prod CSP deliberately omits.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=15552000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value: cspDirectives.join("; "),
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
