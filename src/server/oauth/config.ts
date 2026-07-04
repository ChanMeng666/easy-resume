/**
 * OAuth Authorization Server configuration.
 *
 * A single source of truth for the issuer / endpoint URLs advertised in the
 * RFC 8414 discovery document and used when building redirects. There is no
 * dedicated base-URL helper in the repo, so this reads `NEXT_PUBLIC_APP_URL`
 * (baked at build, the real domain in production) and falls back to the canonical
 * production origin — the issuer MUST be a stable, absolute https URL.
 */

const DEFAULT_BASE_URL = 'https://www.vitex.org.nz';

/** The absolute origin (no trailing slash) the AS advertises as its issuer. */
export function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_BASE_URL;
  return base.replace(/\/+$/, '');
}

/** The single implicit scope this AS advertises and echoes. */
export const OAUTH_SCOPE = 'vitex';
