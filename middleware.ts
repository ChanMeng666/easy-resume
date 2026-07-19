/**
 * Channel-attribution capture middleware (the ONLY thing this middleware does).
 *
 * When a visitor lands on a PAGE with UTM / `ref` query params, we persist them
 * into a first-party `vitex_attr` cookie (first-touch: never overwritten) so the
 * server-side signup emit can attribute the new user to a channel — with no
 * third-party analytics and no client JS. Server code reads it back via
 * `src/server/analytics/attribution.ts` (the cookie name / keys are mirrored
 * there; kept inline here so this edge bundle imports nothing server-only).
 *
 * Scope is deliberately tight (see `config.matcher`): pages only, never API/SSE
 * routes, static assets, `.well-known`, or public `/p/*` pages — so SSE streaming
 * and the static-header behaviour in `next.config.ts` are untouched. Security
 * headers stay in `next.config.ts` (NOT here) by design.
 */

import { NextResponse, type NextRequest } from 'next/server';

const ATTRIBUTION_COOKIE = 'vitex_attr';
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'] as const;
const MAX_VALUE_LEN = 200;
/** 90-day attribution window. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export function middleware(req: NextRequest): NextResponse {
  // First-touch: if attribution was already captured, leave it untouched.
  if (req.cookies.has(ATTRIBUTION_COOKIE)) return NextResponse.next();

  const params = req.nextUrl.searchParams;
  const attr: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value && value.trim()) attr[key] = value.trim().slice(0, MAX_VALUE_LEN);
  }
  // No attribution params on this request → nothing to persist.
  if (Object.keys(attr).length === 0) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attr), {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    httpOnly: true, // server-read only; not needed by client JS
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export const config = {
  // Pages only. Exclude API/SSE, Next internals, static assets, discovery docs,
  // and public `/p/*` career pages (kept cacheable). Anything not matched here
  // is never touched by this middleware.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|\\.well-known|p/).*)'],
};
