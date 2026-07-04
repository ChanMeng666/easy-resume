/**
 * Authorization endpoint — GET (consent) + POST (decision).
 *
 * GET renders a consent screen; POST records the user's Allow/Cancel decision and
 * either mints an authorization code or returns access_denied. Security posture:
 *  - An unknown client OR an unregistered redirect_uri renders an HTML ERROR PAGE
 *    and NEVER redirects (open-redirect defense) — we only ever redirect to a
 *    redirect_uri we have exact-matched against the client's registration.
 *  - Other parameter errors DO redirect (the redirect_uri is already trusted).
 *  - Consent requires a Stack cookie session; unauthenticated users are bounced to
 *    sign-in and returned here.
 *  - The consent form is CSRF-protected (httpOnly SameSite=Lax double-submit) and
 *    framed-out (CSP frame-ancestors 'none' + X-Frame-Options DENY).
 */

import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/lib/auth/stack';
import { getClient, createAuthCode } from '@/server/oauth/store';
import { validateRedirectUri } from '@/server/oauth/redirect';
import { isValidCodeChallenge } from '@/server/oauth/pkce';
import { renderConsentPage, renderErrorPage } from '@/server/oauth/pages';
import { CSRF_COOKIE, generateCsrfToken, verifyCsrfToken } from '@/server/oauth/csrf';
import { OAUTH_SCOPE } from '@/server/oauth/config';
import type { OAuthClient } from '@/lib/db/schema';

export const runtime = 'nodejs';

const AUTHORIZE_PATH = '/api/oauth/authorize';
const IS_PROD = process.env.NODE_ENV === 'production';

/** The authorize parameters the flow carries end-to-end (GET query or POST form). */
interface AuthParams {
  responseType: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function paramsFromQuery(sp: URLSearchParams): AuthParams {
  return {
    responseType: sp.get('response_type') ?? '',
    clientId: sp.get('client_id') ?? '',
    redirectUri: sp.get('redirect_uri') ?? '',
    state: sp.get('state') ?? '',
    codeChallenge: sp.get('code_challenge') ?? '',
    codeChallengeMethod: sp.get('code_challenge_method') ?? '',
    scope: sp.get('scope') ?? '',
  };
}

function paramsFromForm(form: FormData): AuthParams {
  return {
    responseType: str(form.get('response_type')),
    clientId: str(form.get('client_id')),
    redirectUri: str(form.get('redirect_uri')),
    state: str(form.get('state')),
    codeChallenge: str(form.get('code_challenge')),
    codeChallengeMethod: str(form.get('code_challenge_method')),
    scope: str(form.get('scope')),
  };
}

/** HTML error page (never redirects) — status 400, framed-out. */
function errorPage(message: string): NextResponse {
  return new NextResponse(renderErrorPage(message), {
    status: 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store',
    },
  });
}

/** 302 back to the (already-validated) redirect_uri carrying an OAuth error. */
function redirectError(redirectUri: string, error: string, state: string): NextResponse {
  const u = new URL(redirectUri);
  u.searchParams.set('error', error);
  if (state) u.searchParams.set('state', state);
  return NextResponse.redirect(u.toString(), 302);
}

/** 302 back to the (already-validated) redirect_uri carrying the authorization code. */
function redirectCode(redirectUri: string, code: string, state: string): NextResponse {
  const u = new URL(redirectUri);
  u.searchParams.set('code', code);
  if (state) u.searchParams.set('state', state);
  return NextResponse.redirect(u.toString(), 302);
}

/**
 * Load the client and confirm redirect_uri is exact-registered. On failure returns
 * an error-page response (the caller must NOT redirect). On success returns the
 * client row.
 */
async function loadTrustedClient(
  params: AuthParams
): Promise<{ ok: true; client: OAuthClient } | { ok: false; response: NextResponse }> {
  const client = await getClient(params.clientId);
  if (!client) {
    return { ok: false, response: errorPage('Unknown client. This application is not registered.') };
  }
  if (!validateRedirectUri(client.redirectUris, params.redirectUri)) {
    return {
      ok: false,
      response: errorPage('Invalid redirect_uri. It does not match a URI registered by this application.'),
    };
  }
  return { ok: true, client };
}

/**
 * Validate the non-redirect parameters (response_type, PKCE challenge + method).
 * Returns null when valid, or an OAuth error code to redirect with. redirect_uri
 * is already trusted at this point, so these surface as spec redirects.
 */
function validateFlowParams(params: AuthParams): string | null {
  if (params.responseType !== 'code') return 'invalid_request';
  if (params.codeChallengeMethod !== 'S256') return 'invalid_request';
  if (!isValidCodeChallenge(params.codeChallenge)) return 'invalid_request';
  return null;
}

/** Rebuild the authorize GET URL (path + query) so sign-in can return here. */
function authorizeReturnPath(params: AuthParams): string {
  const q = new URLSearchParams();
  q.set('response_type', params.responseType || 'code');
  q.set('client_id', params.clientId);
  q.set('redirect_uri', params.redirectUri);
  if (params.state) q.set('state', params.state);
  q.set('code_challenge', params.codeChallenge);
  q.set('code_challenge_method', params.codeChallengeMethod || 'S256');
  q.set('scope', OAUTH_SCOPE);
  return `${AUTHORIZE_PATH}?${q.toString()}`;
}

/** 302 to sign-in, returning to the given authorize path afterward. */
function redirectToSignIn(request: NextRequest, returnToPath: string): NextResponse {
  const signIn = new URL('/handler/sign-in', request.url);
  signIn.searchParams.set('after_auth_return_to', returnToPath);
  return NextResponse.redirect(signIn.toString(), 302);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = paramsFromQuery(url.searchParams);

  const trusted = await loadTrustedClient(params);
  if (!trusted.ok) return trusted.response;

  const paramError = validateFlowParams(params);
  if (paramError) return redirectError(params.redirectUri, paramError, params.state);

  const user = await stackServerApp.getUser();
  if (!user) {
    return redirectToSignIn(request, url.pathname + url.search);
  }

  const csrfToken = generateCsrfToken();
  const html = renderConsentPage({
    clientName: trusted.client.clientName || trusted.client.clientId,
    email: user.primaryEmail ?? user.id,
    authorizeEndpoint: AUTHORIZE_PATH,
    csrfToken,
    responseType: 'code',
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    state: params.state,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: 'S256',
    scope: OAUTH_SCOPE,
  });

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store',
    },
  });
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    path: AUTHORIZE_PATH,
    maxAge: 600,
  });
  return response;
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorPage('Malformed consent submission.');
  }
  const params = paramsFromForm(form);

  // Re-validate the client + redirect_uri from the (untrusted) hidden fields
  // before any redirect can occur.
  const trusted = await loadTrustedClient(params);
  if (!trusted.ok) return trusted.response;

  // CSRF: a forged cross-site POST cannot read/set the httpOnly cookie, so its
  // hidden field can never match. Failure is not a user denial → error page.
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  if (!verifyCsrfToken(cookieToken, form.get('csrf_token'))) {
    return errorPage('Your session expired or the request could not be verified. Please try again.');
  }

  const paramError = validateFlowParams(params);
  if (paramError) return redirectError(params.redirectUri, paramError, params.state);

  const user = await stackServerApp.getUser();
  if (!user) {
    return redirectToSignIn(request, authorizeReturnPath(params));
  }

  const action = str(form.get('action'));
  if (action !== 'allow') {
    // Cancel (or any non-allow value): deny without issuing a code.
    return redirectError(params.redirectUri, 'access_denied', params.state);
  }

  const code = await createAuthCode({
    clientId: params.clientId,
    userId: user.id,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    scope: OAUTH_SCOPE,
  });
  return redirectCode(params.redirectUri, code, params.state);
}
