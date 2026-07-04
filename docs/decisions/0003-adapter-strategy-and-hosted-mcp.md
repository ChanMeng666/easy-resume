# ADR 0003 — Adapter strategy, "Career as Code" positioning, and hosted MCP

- **Status**: Accepted — **shipped & merged** (PRs #50–#73), deployed to the
  DigitalOcean VPS at the canonical host `https://www.vitex.org.nz`.
- **Date**: 2026-07-05
- **Authors**: Claude — Opus 4.8 (implementation) × Fable 5 (review/verification)
- **Scope**: Product positioning ("one core, N thin adapters" / Career as Code);
  the adapter stack (discoverability assets → SKILL.md → CLI → stdio MCP → hosted
  OAuth MCP → minimal web); design tokens; voice profile; the public career
  endpoint; the OAuth 2.1 Authorization Server as a facade over API keys; the
  hosted remote MCP endpoint; canonical-host = `www`.
- **Builds on**: [ADR 0001](0001-money-path-and-idempotency.md) (charge-once-after-
  compile + jobId idempotency) and [ADR 0002](0002-refinement-first-architecture.md)
  (the refinement core). Both invariants carry forward **unchanged**: every new
  surface added here routes through the same core, so it inherits the same single
  charge site, the same idempotency, and the same owner scoping.

## Context

ADR 0001 established "The API is the UI": the web app and a public v1 REST API run
the same transport-agnostic core. That principle was true but under-exploited — the
only two adapters were the web SSE route and the v1 REST API, and both assumed a
developer who could mint and paste an API key.

The real target user is **a person plus their AI assistant**. That user reaches
software through whatever their assistant can drive: a documented API, a CLI a
coding agent can shell out to, or — increasingly — an MCP connector inside ChatGPT
or Claude that a non-technical person can attach with a sign-in. A single web UI
does not serve that user; neither does an API that requires manually managing a
bearer token. Meanwhile the pipeline core was already the hard, correct part
(outcome billing, idempotency, faithfulness gating). What was missing was **reach**:
more adapters over the same core, and a way in that does not require pasting a
secret.

Two smaller product gaps compounded this. Every generated resume looked byte-for-byte
identical (no per-candidate visual variety), and cover letters were written in a
generic voice with no way to match how the candidate actually writes.

## Decisions

### One core, N thin adapters (the reach strategy)
Rather than build features into the web UI, we added **adapters** over the existing
core, ordered from lowest to highest touch. Each is deliberately thin and shares the
core's billing/idempotency/owner-scoping:

1. **Discoverability assets** — `public/llms.txt` (rewritten), a hand-written
   `public/openapi.yaml` (OpenAPI 3.1), and `public/skill.md` (a runnable curl
   playbook), plus a completed `docs/api/v1.md`. These let an assistant *find* and
   *learn* the API with zero human setup.
2. **`vitex-cli`** — a separately published npm package (`cli/`, bin `vitex`, v0.2.0):
   a token-cheap client over the v1 API for terminals and coding agents. It is NOT a
   workspace member — its own `package.json`/lockfile and CI job keep the main app's
   bundle and type-graph clean (root `tsconfig` excludes `cli`, eslint ignores
   `cli/**`).
3. **stdio MCP server** — the same CLI ships `vitex mcp` (`npx -y vitex-cli mcp`), a
   stdio MCP server for Claude Desktop, Claude Code, and Cursor. Same tools, driven
   over HTTP to the public API.
4. **Hosted remote MCP** — `/api/mcp` (Streamable HTTP), the in-process twin of the
   stdio server, so a connector needs no local install. Its 9 tools call the backend
   core **directly** (the same functions the v1 routes call), so billing/idempotency/
   concurrency are identical to REST.
5. **Minimal web** — the browser UI stays deliberately small; it is one adapter, not
   the product.

### "Career as Code" positioning
The framing that unifies the surface area: **career facts are source code** (a
`candidate_profiles` row is the repo), **each tailored PDF is a build artifact** that
rebuilds identically forever (which is why token/template selection is deterministic,
not sampled), **the refine chain is a series of commits** (`parent_job_id`/
`root_job_id`), **outcome billing is pay-per-successful-build**, and **the exported
`.typ` source is zero lock-in**. This is not just copy — it is why design-token
selection is a pure function of inputs (see below) and why refinement is a version
chain rather than a mutation.

### OAuth 2.1 as a facade over API keys (the "no key to paste" way in)
To let a non-technical user connect the hosted MCP with a sign-in, the app became an
OAuth 2.1 Authorization Server: RFC 8414 discovery, RFC 7591 Dynamic Client
Registration, a session-gated + CSRF-protected consent screen, PKCE S256, and a
token endpoint. The central design choice: **the issued access token IS a freshly
minted first-class Vitex API key**. We did not build a parallel token system — the AS
is a *facade* that produces the same credential the REST API already verifies
(`verifyApiKey`). Consequences: there is **no refresh token** (a long-lived API key
is the grant), revocation reuses the existing dashboard "Connections & API Keys" list
(`DELETE /api/keys`), and the hosted MCP's auth (`withMcpAuth` → `verifyMcpToken`) is
the same verification path as every other authenticated route. New persistence is
minimal: `oauth_clients` (DCR records) and `oauth_codes` (short-lived PKCE codes).

### Canonical host = `www.vitex.org.nz`
An OAuth issuer must be a single, stable, absolute https origin, and it must match
across the discovery document, the authorize/token endpoints, and the
protected-resource metadata. We standardized on `https://www.vitex.org.nz` (the
`www` apex) advertised everywhere via one helper, `getBaseUrl()`
(`src/server/oauth/config.ts`), which reads the `NEXT_PUBLIC_APP_URL` build secret
and falls back to that canonical origin. Every advertised OAuth/MCP/public-profile
URL flows through it, so host drift cannot desync the OAuth surface.

### Design tokens — deterministic per-resume variety
`src/lib/design/tokens.ts` adds a bounded, tasteful style variation (6 accent
palettes × 2 densities) that changes colors/spacing only, never layout structure, so
ATS compatibility is untouched. Selection (`selectDesignTokens`) is a **deterministic,
LLM-free** function of the parsed JD + a stable candidate seed (`fnv1a`), honoring
the "build artifact rebuilds identically" invariant. Tokens are persisted on
`GenerateResult` and threaded through every render path (generate/refine/edit/manual);
the `slate`/`comfortable` default reproduces the pre-tokens output byte-for-byte.

### Voice profile & the public career endpoint (privacy-gated)
A profile can carry an optional `voiceSample` so cover letters match the candidate's
writing (pure `buildCoverLetterPrompt`, sanitized at pipeline entry, never persisted
on a job). A profile can also be **published** to `/p/<slug>` (HTML/`json`/`md`). The
load-bearing safety decision: the public projection `toPublicProfile` is an
**explicit allowlist** — contact PII (`email`/`phone`/`photo`), raw text
(`rawBackground`/`voiceSample`), and internal identifiers are deliberately absent and
must never be added, enforced by a dedicated test.

## Consequences & invariants

- **Billing/idempotency invariants (ADR 0001/0002) hold across every new adapter.**
  The CLI, stdio MCP, and hosted MCP all dispatch through the same `createJob` /
  refine core; there is still exactly one charge site per pipeline, after compile.
  A new transport cannot introduce a new charge path.
- **One credential system.** OAuth issues API keys; there is no second auth model to
  keep in sync, and revocation is unified. A future need for refresh tokens or
  scoped tokens would be a deliberate departure from the facade, not an accident.
- **Determinism is a product guarantee, not an implementation detail.** Because a PDF
  is a "build artifact", template and design-token selection MUST stay pure functions
  of the inputs. Any change that samples or randomizes them breaks reproducibility
  and the Career-as-Code framing.
- **Public exposure is allowlist-only.** The public endpoint's projection is
  additive-by-explicit-choice; the invariant is enforced by test, and any field added
  to `PublicProfile` is a privacy decision requiring review.
- **⚠️ Operational gotcha — deploy does not migrate.** `.github/workflows/deploy.yml`
  builds and ships the container but never runs `scripts/migrate.ts`. The three new
  `candidate_profiles` columns and the `oauth_clients`/`oauth_codes` tables (and any
  future DDL) require running `npm run db:migrate` **manually** against the prod
  `DATABASE_URL` around the deploy, or the new code hits missing columns/tables.

## What shipped (PRs #50–#73)

| Area | Summary |
|------|---------|
| Discoverability + editor (#50–#57) | `llms.txt`/`openapi.yaml`/`skill.md`, `docs/api/v1.md` completed; pre-emptive auth gate; converged conversational refine box + `refineScope.ts inferRefineScope`; export dropdown / tabs / history disclosure. |
| Voice + tokens + public endpoint (#58–#61) | `candidate_profiles.voice_sample` + cover-letter prompt v2; `src/lib/design/tokens.ts` + `selectDesignTokens` threaded through every render path; `/p/[slug]`(+`/json`,`/md`), `public_slug`/`published_at`, `toPublicProfile` allowlist, publish/unpublish. |
| CLI + voice UI (#62–#63) | `vitex-cli` published to npm (v0.2.0, CLI + stdio MCP); owner-only `voiceSample` echo on `GET/PUT /api/profiles/[id]`, `hasVoiceSample` summary flag. |
| Account probe + refine voice + density (#66–#69) | `GET /api/v1/me`; `refineVoice.ts` owner-scoped voice re-fetch; all 7 templates consume density spacing; CLI `whoami` + `get_account` MCP tool. |
| OAuth AS + hosted MCP (#70–#72) | `/.well-known/oauth-*`, `/api/oauth/{register,authorize,token}`, `src/server/oauth/*`, `oauth_clients`/`oauth_codes`; `/api/mcp` via `mcp-handler`, `src/server/mcp/{verifyToken,tools}.ts`, 9 in-process tools; connector guides; dashboard Connections list; canonical `www` via `NEXT_PUBLIC_APP_URL`. |
| Public copy (#73) | Pages realigned to "Career as Code"; pricing credit ledger corrected; `docs/BRAND_GUIDELINES.md` de-staled (LaTeX→Typst). |

## Deferred

- **No refresh tokens / token rotation** — the API-key-as-grant model is intentional;
  revisit only if a real client needs short-lived tokens.
- **Design-token density** ships behind deterministic selection but the palette/
  density space is intentionally small (6 × 2); broadening it is a future PR.
- **napi-rs in-process Typst** (the compile seam from ADR 0001) remains a seam, not
  yet realized.

## Working model
Claude implements; after each unit, an adversarial read-only review runs over the
diff; findings are verified (not blindly accepted or rejected) before the next step.
This ADR is the living record for the adapter/positioning phase.
