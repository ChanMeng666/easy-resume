/**
 * Server-rendered HTML for the authorize endpoint (consent + error pages).
 *
 * These are pure string builders (kept out of the route so the route stays thin
 * and the markup is reviewable in one place). The pages are NOT wrapped in the
 * Next app layout, so all styling is inline — a self-contained Neobrutalism look.
 * Every interpolated value (client name, email, param echoes) is HTML-escaped:
 * client_name and redirect_uri are attacker-controllable via open DCR, so this is
 * the XSS boundary.
 */

/** Escape a string for safe interpolation into HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PAGE_STYLE = `
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f0f0f0;padding:24px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111}
  .card{background:#fff;border:3px solid #000;border-radius:16px;
    box-shadow:8px 8px 0 0 rgba(0,0,0,0.9);max-width:460px;width:100%;padding:32px}
  h1{font-size:24px;font-weight:900;margin:0 0 16px;line-height:1.2}
  p{font-size:15px;line-height:1.5;margin:0 0 16px}
  .who{font-size:13px;font-weight:700;background:#f0f0f0;border:2px solid #000;border-radius:8px;
    padding:8px 12px;margin:0 0 20px;display:inline-block}
  .scopes{font-size:14px;color:#333;margin:0 0 24px}
  .actions{display:flex;gap:12px}
  button{flex:1;font-size:15px;font-weight:700;padding:12px 16px;border:2px solid #000;
    border-radius:8px;cursor:pointer;transition:all .15s;box-shadow:4px 4px 0 0 rgba(0,0,0,0.9)}
  button:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 0 rgba(0,0,0,0.9)}
  .allow{background:#6C3CE9;color:#fff}
  .cancel{background:#fff;color:#000}
  .err{color:#b00020;font-weight:700}
`;

function shell(title: string, inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${escapeHtml(title)}</title><style>${PAGE_STYLE}</style></head>` +
    `<body><div class="card">${inner}</div></body></html>`;
}

/**
 * The consent screen. Carries every authorize parameter forward as a hidden
 * field (re-validated server-side on POST — never trusted) plus the CSRF token.
 * The form POSTs back to the authorize endpoint; "Allow" (purple) mints a code,
 * "Cancel" returns an access_denied error to the client.
 */
export interface ConsentPageParams {
  clientName: string;
  email: string;
  authorizeEndpoint: string;
  csrfToken: string;
  responseType: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}

export function renderConsentPage(p: ConsentPageParams): string {
  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`;

  const inner =
    `<h1>Allow ${escapeHtml(p.clientName)} to use Vitex?</h1>` +
    `<p class="scopes">This app will be able to generate and refine resumes, manage your ` +
    `saved profiles, and spend your credits (1 credit per compiled resume; refinements ` +
    `are free). It cannot see your password or payment details.</p>` +
    `<div class="who">Signed in as ${escapeHtml(p.email)}</div>` +
    `<form method="post" action="${escapeHtml(p.authorizeEndpoint)}">` +
    hidden('csrf_token', p.csrfToken) +
    hidden('response_type', p.responseType) +
    hidden('client_id', p.clientId) +
    hidden('redirect_uri', p.redirectUri) +
    hidden('state', p.state) +
    hidden('code_challenge', p.codeChallenge) +
    hidden('code_challenge_method', p.codeChallengeMethod) +
    hidden('scope', p.scope) +
    `<div class="actions">` +
    `<button class="cancel" type="submit" name="action" value="cancel">Cancel</button>` +
    `<button class="allow" type="submit" name="action" value="allow">Allow</button>` +
    `</div></form>`;

  return shell('Authorize Vitex access', inner);
}

/**
 * The error page shown when the request cannot be trusted to redirect back —
 * unknown client or an unregistered redirect_uri. We render HTML instead of
 * redirecting precisely because redirecting an unvalidated URI is the open-redirect
 * risk this page exists to avoid.
 */
export function renderErrorPage(message: string): string {
  const inner =
    `<h1>Authorization error</h1>` +
    `<p class="err">${escapeHtml(message)}</p>` +
    `<p>Return to the application and try connecting again. If the problem persists, ` +
    `the app may be misconfigured.</p>`;
  return shell('Authorization error', inner);
}
