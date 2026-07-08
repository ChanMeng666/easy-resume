# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vitex is a Typst-based resume generator built with Next.js 15, React 19, and TypeScript. The application generates professional Typst code from structured resume data and compiles PDFs locally using Typst. It uses a **custom two-column layout** built with Typst's grid system for maximum compatibility.

**Brand**: Vitex (formerly Easy Resume) - "Your Career, Perfectly Composed"

**Design System**: **Phantom** - A soft, monochromatic aubergine + lavender aesthetic featuring:
- Flat surfaces — the only shadow is a single lavender glow (`shadow-glow`) on the primary CTA
- 1px `ash` (#e9e8ea) borders; pill geometry (`rounded-full`) for buttons/nav/tags, `rounded-3xl` cards, `rounded-2xl` inputs
- Paper canvas (#fdfcfe) with `bone` panels; aubergine (#3c315b) spine for headings, nav, and dark sections
- Whisper-weight Geist typography (weights 300/400/500 only; `font-medium` is the ceiling) with `-0.025em` tracking
- No dark mode - single cohesive light theme

**Authoritative spec**: `docs/DESIGN-SYSTEM.md` is ground truth for exact palette
values, Tailwind names, named font sizes, and component recipes.

**Brand Guidelines**: See `docs/BRAND_GUIDELINES.md` for brand design documentation including:
- Phantom design principles (flat surfaces, pill geometry, whisper-weight type)
- Color system (Aubergine #3c315b, Ghost Lavender #e2dffe, Periwinkle #ab9ff2)
- Typography specifications (Geist 300/400/500, `-0.025em` tracking)
- Elevation (flat + single `shadow-glow` CTA) and geometry standards
- UI component styling with color-only hover
- Logo usage guidelines
- Brand voice and tone

**Key Architecture Decision**: This project migrated from an HTML/CSS A4 resume builder to a Typst code generator. It uses Typst's built-in grid layout to create a professional two-column layout (60% left / 40% right) that compiles locally via the `typst` binary without requiring any external services.

**Positioning — "one core, N thin adapters" / "Career as Code"**: The target user is
**a person plus their AI assistant**, and the product is designed so every surface
(web UI, public v1 REST API, published `vitex-cli`, stdio MCP server, hosted OAuth
MCP connector) is a *thin adapter* over one shared backend core — "The API is the
UI". The framing that unifies the feature set is **Career as Code**: your career
facts are source code (a `candidate_profiles` row = the repo), each tailored PDF is
a reproducible **build artifact**, the refine chain is a sequence of commits
(`parent_job_id`/`root_job_id`), outcome billing means you **pay per successful
build**, and the exported `.typ` source is zero lock-in. This is recorded in
[ADR 0003](docs/decisions/0003-adapter-strategy-and-hosted-mcp.md).

## Common Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Build production bundle
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm test             # Run vitest once (unit tests for the backend core)
npm run test:watch   # Vitest in watch mode

# Database migrations (idempotent, raw SQL — NOT drizzle-kit)
npx tsx scripts/migrate.ts   # Create/upgrade Neon tables; safe to re-run

# Docker / VPS Deployment
# Docker build and GitHub Actions CI/CD deploy to DigitalOcean VPS
# See .github/workflows/deploy.yml and Dockerfile

# Package management
npm install          # Install all dependencies
npx shadcn add <component>  # Add shadcn/ui components
```

**Verification gate** (run before claiming work complete): `npm test && npx tsc --noEmit && npm run lint && npm run build`.

## Backend Architecture (`src/server/`)

The product follows two principles that shape the whole backend:

- **"The API is the UI."** Everything the web app does, an AI agent can do over
  HTTP with an API key — no browser, cookie, 2FA, or CAPTCHA. The web UI and the
  public v1 API run the **exact same pipeline core**.
- **"Sell results, not tools."** Billing is outcome-based: a user is charged
  exactly once, and only when a real compiled PDF is produced. Failures are free.

To enable this, business logic lives in a **transport-agnostic backend core**
under `src/server/`, separate from the HTTP/SSE routes (which are thin adapters):

```
src/server/
├── core/
│   ├── pipeline.ts        # runGenerationPipeline() — the 8-step generation orchestrator (no HTTP/SSE)
│   ├── refine.ts          # runRefinementPipeline() — the 4-step targeted refine core (free by default)
│   ├── refineScope.ts     # inferRefineScope() — deterministic resume|cover_letter|both inference from feedback text
│   ├── step.ts            # makeStepRunner() — bounded retry/backoff + typed errors, shared by both pipelines
│   ├── pipeline.types.ts  # Caller, GenerateInput/Result, ProgressEvent, PipelineDeps
│   ├── compile.ts         # compileTypstToPdf() — Typst→PDF core (napi-rs-ready seam)
│   ├── jdParseCache.ts    # withJdParseCache() — cross-user LRU around parseJobDescription (deps seam)
│   ├── sanitize.ts        # prompt-injection sanitizers for user input pre-LLM
│   └── deps.ts            # defaultDeps()/defaultRefineDeps() — wire real agent/render/compile/meter/logger
├── billing/
│   ├── meter.ts           # BillingMeter — charges once, only on success, idempotent
│   └── stripeWebhook.ts   # applyStripeEvent() — webhook business logic (unit tested)
├── auth/
│   ├── apiKeys.ts         # mint/verify API keys (sha256 hash; raw shown once)
│   └── caller.ts          # getCaller() — resolves Bearer key OR Stack cookie → Caller
├── jobs/
│   ├── runner.ts          # in-process async job runner for the v1 API (generation + refine dispatch)
│   ├── concurrency.ts     # createSemaphore() — FIFO cap on in-flight background jobs (JOB_CONCURRENCY)
│   ├── refineArtifacts.ts # buildRefineArtifacts() — parent job's stored input+result → RefineArtifacts
│   └── persist.ts         # shared reserveJob/finalizeSucceededJob/failJob/toWireResult/deriveJobTitle/
│                          #   createManualVersion/storeResumePdf/deleteJobPdfs
├── agent/                 # conversational edit agent (P2): editAgent.ts (tool loop), editTools.ts,
│                          #   prompts.ts (edit-agent v3), store.ts (threads/messages/version snapshots + GC)
├── profiles/              # candidate_profiles store (P1) + public career endpoint
│   ├── store.ts           # CRUD + voiceSample + publish/unpublish + getPublicProfileBySlug + toPublicProfile (allowlist projection)
│   ├── publicMarkdown.ts  # PublicProfile → Markdown (the /p/[slug]/md body)
│   ├── publicAccess.ts    # public-read guard: per-IP `pub:` rate limit + client IP
│   └── publicUrl.ts       # safePublicUrl() — scheme-allowlisted absolute URL builder for public pages
├── applications/store.ts  # applications CRUD (P2 tracker)
├── oauth/                 # OAuth 2.1 Authorization Server (P5) — a facade that mints first-class API keys
│   ├── config.ts          # getBaseUrl() (issuer origin from NEXT_PUBLIC_APP_URL, canonical www) + OAUTH_SCOPE
│   ├── pkce.ts            # S256 code-challenge verify
│   ├── store.ts           # oauth_clients / oauth_codes persistence (DCR clients, short-lived auth codes)
│   ├── exchange.ts        # authorization_code → access token (a freshly minted API key); no refresh token
│   ├── redirect.ts        # redirect_uri validation + error/param redirects
│   ├── csrf.ts            # consent-form CSRF token mint/verify
│   ├── errors.ts          # RFC 6749 OAuth error rendering
│   ├── http.ts            # clientIp() + oauthRateLimit() (per-IP, fail-open)
│   └── pages.ts           # server-rendered consent / error HTML
├── mcp/                   # Hosted remote MCP (P5) — in-process twin of the stdio CLI
│   ├── verifyToken.ts     # withMcpAuth callback — Bearer access token → verifyApiKey → userId on AuthInfo.extra
│   └── tools.ts           # registerVitexTools() — the 9 tools call the backend core DIRECTLY (DI-testable)
├── storage/
│   ├── blobStore.ts       # getBlobStore() seam — R2 store if configured, else no-op NullBlobStore
│   └── r2.ts              # Cloudflare R2 (S3-compatible) impl; @aws-sdk/client-s3 imported lazily
├── errors/
│   ├── AppError.ts        # typed errors: code/httpStatus/retriable/step/headers
│   └── envelope.ts        # toErrorEnvelope() + errorResponse()
├── log/
│   └── logger.ts          # zero-dep structured JSON logger (AI-readable; serializes err.cause chain)
└── ratelimit.ts           # Postgres-backed fixed-window rate limiting (fail-open)
```

Both transports persist every completed generation to the `generationJobs` table
via the shared `persist.ts` helpers, so a resume made in the browser and one made
by an agent share the same history and storage. The web SSE route persists
best-effort *after* streaming the result (off the delivery critical path), keyed
by `idempotencyKey` so reconnects don't duplicate or re-charge.

Thin transports sit over this core:
1. **`POST /api/generate`** — SSE adapter for the web UI; streams `onProgress`,
   then persists the result and emits a `saved` event with the job id.
2. **`/api/v1/resumes`** — public, API-key-authed, job-based agent API (see
   `docs/api/v1.md`).
3. **`/api/resumes`** — cookie-session (or Bearer) WEB history API over the same
   `generationJobs` table: `GET` (list, `?q`/`limit`/`offset`), `GET [id]`
   (detail, powers free editor re-open), `DELETE [id]` (also drops stored R2
   PDFs), `GET [id]/cover-letter/pdf`, and `[id]/versions` (version chain +
   `versions/compare`). Owner-checked → NotFound for non-owners.
4. **`POST /api/refine`** — SSE adapter for the web UI's targeted refinement;
   mirrors `/api/generate`'s event shapes, reserves a job linked to the parent
   (version chain), runs `runRefinementPipeline`. Free by default.
5. **`POST /api/v1/resumes/{id}/refine`** — public agent-facing refine (async
   202 job over the same core; the runner dispatches refine-shaped inputs).
6. **`/api/threads`** — conversational edit-agent transport (P2): thread CRUD +
   `[id]/messages` (SSE tool-loop turn). Editing is free.
7. **`GET /api/v1/me`** — cheap read-only identity/balance probe for agents (and
   the CLI's `whoami`): `{ userId, via, credits, tier }`. Never charges.
8. **`/api/mcp`** — hosted remote MCP endpoint (Streamable HTTP). Same 9 tools as
   the CLI, run in-process against the core; OAuth-protected (Bearer = a minted
   API key). See **OAuth Authorization Server + Hosted MCP** below.
9. **`/api/oauth/{register,authorize,token}`** + **`/.well-known/oauth-authorization-server`**
   + **`/.well-known/oauth-protected-resource`** — the OAuth 2.1 AS + discovery so
   a ChatGPT/Claude connector can sign in and obtain a key without pasting one.
10. **`/api/profiles`** + **`/api/profiles/[id]`** (GET/PUT, echoes `voiceSample`
    owner-only) + **`/api/profiles/[id]/publish`** (POST publish / DELETE
    unpublish) — candidate profile CRUD + Voice Profile + public-endpoint control.
11. **`/p/[slug]`** (HTML) + **`/p/[slug]/json`** + **`/p/[slug]/md`** — the
    **public career endpoint** for a published profile (allowlisted projection —
    never contact PII or raw text). See **Public Career Endpoint** below.

### Conventions (apply to all backend code)
- **Errors are machine-readable, never prose.** Throw an `AppError` subclass;
  routes render it via `errorResponse()` as `{ error: { code, message, retriable,
  step, requestId, details } }`. SSE and REST share this one shape. Never return
  ad-hoc `{ error: "string" }`.
- **Logs are structured JSON** via `createLogger()` (one object per line, with
  `requestId`). No human-formatted log strings.
- **The core is dependency-injected.** New pipeline behavior goes in `pipeline.ts`
  with deps from `deps.ts`; tests inject fakes (see `pipeline.test.ts`).

## Authentication

- **Stack Auth IS Neon Auth.** Neon acquired Stack Auth; `@stackframe/stack`
  (`src/lib/auth/stack.ts`) is the supported (legacy) Neon Auth integration. We
  deliberately stay on it. Cookie sessions power the web UI.
- **API keys** (`src/server/auth/apiKeys.ts`) power agent access. Format
  `vitex_<prefix>_<secret>`; only `sha256(secret)` is stored; the raw token is
  shown once at creation. Users self-manage via `POST/GET/DELETE /api/keys`.
- **`getCaller(req)`** is the single resolver: `Authorization: Bearer ...` → API
  key, otherwise the Stack cookie session. Both yield a `Caller { userId, via }`.
  Use it in every authenticated route.

## Billing & Credits (outcome-based)

- Prepaid credits in the `credits` table (3 free on signup). 1 credit per
  successfully generated resume result. Charge kinds: `resume_generation` and
  `resume_refinement` (`BillingMeter`).
- **Generation always charges; refinement and edits are free.** The primary
  charge call site is inside `runGenerationPipeline`, *after* the PDF compiles.
  `runRefinementPipeline` has a **mirror charge site guarded by
  `REFINE_COST_CREDITS` (= 0)** — the whole charge path is implemented + tested
  behind the constant, but with it at 0 a refine takes no credits (a paid
  generation already bought the first PDF). The conversational edit agent and
  manual version saves never charge at all. In every case the charge (when it
  runs) happens only *after* a successful compile → any earlier failure is free.
- **Idempotent**: `creditService.useCreditsIdempotent()` keys on the
  `idempotencyKey` (stored as `creditTransactions.referenceId`) so SSE
  reconnects / job retries never double-charge.
- Stripe top-ups go through `applyStripeEvent()`; the webhook dedupes by Stripe
  event id (`stripe_events` table) so retries don't double-credit.

## Rate Limiting

`src/server/ratelimit.ts` enforces fixed-window limits per caller on **Neon
Postgres** (`rate_limits` table, atomic upsert) — NOT Redis (Upstash was removed
after being idle-deleted). `enforceRateLimit()` throws `RateLimitedError` (429)
carrying `Retry-After` + `X-RateLimit-*` headers; success responses also carry
`X-RateLimit-*`. Fail-open on DB error. Per-caller keys/limits:
`gen:` `/api/generate` 15/min · `refine:` `/api/refine` 10/min ·
`chat:` `/api/threads/[id]/messages` 30/min · `v1gen:` `POST /api/v1/resumes`
30/min · `v1refine:` `POST /api/v1/resumes/[id]/refine` 10/min ·
`me:` `GET /api/v1/me` 60/min · `mcp:` per-user hosted-MCP tool budget 60/min
(`src/server/mcp/tools.ts`) · `profilewrite:` profile writes incl. publish/unpublish
20/min. Two surfaces key on **client IP** instead of userId (they run before or
without a session): `pub:` public `/p/[slug]` reads 60/min
(`src/server/profiles/publicAccess.ts`) and the OAuth `oauthreg:` (`/api/oauth/register`,
10/min) / `oauthtoken:` (`/api/oauth/token`, 20/min) via `oauthRateLimit`
(`src/server/oauth/http.ts`). Plus write limits on the
applications/profiles/threads/versions CRUD routes. (`/api/oauth/authorize` is
session-gated + CSRF-protected rather than rate-limited.)

## Database & Migrations

- **Neon Postgres + Drizzle ORM**; schema in `src/lib/db/schema.ts`, client in
  `src/lib/db/client.ts` (exports `db`).
- **Migrations are applied by `scripts/migrate.ts`** — hand-written idempotent
  raw SQL (`CREATE TABLE IF NOT EXISTS`, etc.), run with `npm run db:migrate`
  (alias for `tsx scripts/migrate.ts`). It is the **single, self-contained source
  of truth**: it provisions a FRESH database on its own (it creates the base
  `resumes`/`agent_*`/`resume_versions` tables, then the rest) and is safe to
  re-run. The old `drizzle/` migration snapshots were removed (they created stale
  `copilot_*` tables that contradicted the schema). `drizzle.config.ts` is kept
  only for `drizzle-kit studio` / type introspection. **Do NOT use `drizzle-kit
  generate`** to produce migrations — `scripts/migrate.ts` is authoritative; add
  idempotent DDL there when you add a table/column.
- **⚠️ Deploy does NOT run migrations.** `.github/workflows/deploy.yml` builds and
  ships the container but never runs `scripts/migrate.ts` — after ANY DDL change
  you MUST run `npm run db:migrate` manually against the prod `DATABASE_URL`
  before/around the deploy, or the new code hits missing columns/tables.
- **Active tables**: `generation_jobs` (the single persistence model for ALL
  generations AND refinements — web + v1 API; columns include `title`, `input`,
  `result` JSONB — which now also carries `parsedJD` and design `tokens` —,
  `pdf_url`, `charged`, `idempotency_key`, and `parent_job_id`
  for the refine/version chain), `credits`, `credit_transactions`, `api_keys`,
  `stripe_events`, `rate_limits`. P1/P2 activated more: `candidate_profiles`
  (profiles store — now with `voice_sample`, `public_slug`, and `published_at`
  columns + a unique partial index `uk_candidate_profiles_public_slug` on
  `public_slug WHERE public_slug IS NOT NULL`), `applications` (tracker),
  `agent_threads`/`agent_messages` (edit-agent conversations + version snapshots).
  P5 (OAuth) added `oauth_clients` (Dynamic Client Registration records) and
  `oauth_codes` (short-lived PKCE authorization codes, `idx_oauth_codes_expires`).
  JSONB columns are typed via Drizzle `.$type<...>()`.
- **Unused scaffolding** (defined in schema + migrate.ts but still NO CRUD —
  do not assume they hold data): `resumes` (+ its dead `pdf_blob_url`/`pdf_updated_at`
  columns), `tailored_resumes`, `job_descriptions`, `resume_versions` (the live
  version chain is `generation_jobs.parent_job_id`/`root_job_id`, NOT this
  table). Kept as forward scaffolding; the live "My Resumes" history uses
  `generation_jobs`, not these.

## Testing

- **Vitest** (`npm test`, ~390 tests across ~42 `src` suites). Config in
  `vitest.config.ts` aliases `@` → `src` and stubs `server-only` (so server
  modules import cleanly in Node). The `cli/` package has its own separate vitest
  config/suite (run from `cli/`, its own CI job).
- Money-path is covered: `src/server/core/pipeline.test.ts` and
  `src/server/core/refine.test.ts` (billing gating: charge once on success, no
  charge on failure, fast-fail on no credits; refine's charge path is exercised
  via the `costCredits` override) and `src/server/billing/stripeWebhook.test.ts`
  (credit grants / pro renewal).
- Core/helper coverage includes `jdParseCache.test.ts`, `concurrency.test.ts`
  (FIFO semaphore), `step.test.ts` (retry classification), `runner.test.ts`
  (job runner + refine dispatch), `reserveJob`/`refineArtifacts`/
  `createManualVersion` tests, `logger.test.ts` (JSON + cause chain),
  `prompts.test.ts`, `resumeData` schema tests, edit-agent + store tests, and
  `persist`/`blobStore` helpers. DB/route/R2 I/O is left to integration runs.
- Newer suites cover the adapter/OAuth/design work: `refineScope`
  (scope inference), `src/lib/design/tokens.test.ts` + `src/templates/density.test.ts`
  (design tokens + density spacing), `src/server/profiles/publicProfile.test.ts`
  (the allowlist projection — asserts contact PII / raw text never leak),
  `src/server/oauth/*` (`pkce`, `store`, `redirect`, `exchange`), and
  `src/server/mcp/*` (`verifyToken`, `tools` with injected fakes).
- Prefer testing the **core with injected fakes** over hitting the DB/LLM.

## Data-Driven Architecture

### Resume Data Structure
- **Central data source**: All resume content is defined in `src/data/resume.ts`
- **Type safety**: Data structure validated using Zod schemas in `src/lib/validation/schema.ts`
- **Schema types**: `ResumeData`, `Basics`, `Education`, `Work`, `Project`, `Skill`, `Profile`

### Key Data Sections
- `basics`: Personal info, contact details, social profiles, optional photo
- `education`: Academic background with GPA and notes
- `work`: Employment history with date ranges and highlights
- `projects`: Portfolio projects with URLs and achievements
- `skills`: Categorized technical skills with keywords
- `achievements`: Notable awards and recognitions
- `certifications`: Professional certifications (automatically categorized)

## Typst Generation System

### Core Generator (`src/lib/typst/generator.ts`)
- **Main function**: `generateTypstCode(data: ResumeData): string`
- **Layout structure**:
  - Left column (60%): Introduction, Experience, Projects
  - Right column (40%): Education, Skills, Achievements, Certifications
  - Uses Typst `grid` with `columns: (60%, 40%)` for asymmetric columns
- **Sections generated**: Personal info with icons, summary, education, experience, projects, skills, achievements, certifications
- **Custom functions**: `cv-section`, `cv-event`, `cv-tag`, `cv-divider`, `cv-subsection`
- **Special handling**:
  - Unicode symbols for contact info and social profiles
  - Blue color scheme (PrimaryColor: #0E5484, AccentColor: #2E86AB)
  - Date formatting from resume data to human-readable ranges
  - Array-to-list conversion for bullet points
  - Skill tags displayed as colored boxes
  - Automatic certification categorization by keywords

### Typst Utilities (`src/lib/typst/utils.ts`)
- `escapeTypst()`: Critical function to escape special Typst characters (`\`, `*`, `_`, `` ` ``, `$`, `#`, `<`, `>`, `@`)
- `formatDateRange()`: Converts start/end dates to display format (uses en dash `–` instead of LaTeX `--`)
- `splitName()`: Handles name parsing for Typst formatting
- `cleanURL()`: Removes protocol from URLs for cleaner display

## PDF Compilation

### Compilation Core (`src/server/core/compile.ts`)
- **`compileTypstToPdf(code): Promise<{ pdf: Uint8Array; cached: boolean }>`** is
  the single place Typst becomes a PDF. Both the pipeline (server-side, for the
  billable artifact) and the `/api/compile` route call it.
- Compiles via the `typst` binary subprocess; <100ms per resume; no external API.
- Temp files in `os.tmpdir()/vitex-typst/`, cleaned up after each request.
- In-memory LRU cache (100 entries, 1-hour TTL) shared across callers.
- Binary path via `TYPST_BIN`; FA font path via `TYPST_FONT_PATH` (falls back to
  `node_modules/@fortawesome/fontawesome-free/webfonts` in dev).
- Throws structured `CompilationError` (422, with `details.stderr`) /
  `CompilationTimeoutError` (504) — never raw stderr.
- **napi-rs seam**: the function signature is the deliberate seam where a future
  in-process Rust Typst module can replace the subprocess with zero caller changes.

### Compile Route (`src/app/api/compile/route.ts`)
- Thin wrapper over `compileTypstToPdf`: validates input, returns
  `application/pdf` with `X-Cache: HIT|MISS`, renders errors via the envelope.

### Object Storage for PDFs (`src/server/storage/`)
- **`getBlobStore()`** (`blobStore.ts`) is the storage seam (mirrors the compile
  seam): returns a Cloudflare **R2** store (`r2.ts`, S3-compatible via
  `@aws-sdk/client-s3`) when all `R2_*` env vars are set, else a no-op
  `NullBlobStore`. Keys: `resumes/{jobId}.pdf`, `cover-letters/{jobId}.pdf`.
- On a successful generation the compiled resume PDF is uploaded best-effort
  (`storeResumePdf` in `src/server/jobs/persist.ts`, called from both the web SSE
  path and the v1 job runner). All storage ops are best-effort: failures are
  logged and swallowed — they never affect generation or billing.
- The PDF routes (`/api/v1/resumes/[id]/pdf`, `/api/resumes/[id]/cover-letter/pdf`)
  serve the stored copy when present, else recompile from the stored Typst on
  demand and lazily backfill to R2 (`X-Pdf-Source: r2|compiled`). With R2
  unconfigured everything still works via recompile (<100ms).

### Client-side Export (`src/lib/typst/compiler.ts`)
- `compilePdf()`: Calls `/api/compile`, returns PDF blob with client-side caching
- `downloadTypFile()`: Download .typ source file
- `copyToClipboard()`: Copy Typst code to clipboard

## UI Components

### Design System: Phantom

The UI follows the **Phantom** design system — soft, monochromatic aubergine +
lavender: flat surfaces, pill geometry, whisper-weight type, generous whitespace.
`docs/DESIGN-SYSTEM.md` is the authoritative token/component spec; the summary
below is a pointer, not a duplicate.

#### Core Style Rules
```css
/* Elevation is FLAT — the ONLY shadow is the primary-CTA glow */
/* tailwind.config.ts */ boxShadow: { glow: '0 0 4px #e2dffe' }

/* Borders: 1px `ash` (#e9e8ea), never black; separation also via `bone` panels + whitespace */
/* Geometry: rounded-full (buttons/nav/tags), rounded-3xl (cards), rounded-2xl (inputs/menus) */
/* Type: Geist only, weights 300/400/500 (font-medium ceiling), -0.025em tracking */
/* Canvas: paper #fdfcfe; spine: aubergine #3c315b; accent: periwinkle #ab9ff2 */
```

#### Utility Classes (in globals.css)
The `.neo-*` utilities are **deleted**. Phantom adds layout utilities instead:
- `.page-shell` - Clears the fixed floating nav (+ gap); use on every route
- `.page-pad-b` - Consistent bottom padding
- `.section-y` - Uniform inter-section vertical rhythm
- `.section-dark` - Aubergine dark band (allowed ONLY on the homepage CLI/MCP band + Footer)

Colors/geometry come from Tailwind literals (`bg-lavender`, `text-aubergine`,
`border-ash`, `rounded-3xl`, `shadow-glow`, `max-w-content`) — see `tailwind.config.ts`.

#### Hover Behavior Pattern
**Important**: Hover feedback is **color change only** (built into the components).
Never use `whileHover` scale/rotate/boxShadow, and never the old translate-and-shadow
pattern.

```tsx
// Correct: color-only hover (Phantom Button already does this)
<Button variant="secondary">Save</Button>  // bg-ash → hover:bg-[#dedde0]

// Wrong: hard-shadow / translate hover (deleted Neobrutalism pattern)
<Card className="hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px]">
```

### Page Structure

#### Homepage (`src/app/page.tsx`)
- **Product entry point**: JD textarea + background textarea + "Generate My Resume" button
- **How It Works**: 3-card grid (Paste JD → AI Generates → Download PDF)
- Uses sessionStorage to pass data to /editor

#### Editor Page (`src/app/editor/page.tsx`)
- **Result review page**: Shows AI generation progress, then PDF preview with actions
- **Progress state**: generation shows 8-step animated progress; a refine shows a separate 4-step gallery (`PROGRESS_STEPS` vs `REFINE_PROGRESS_STEPS`), synced with the backend SSE pipelines
- **Auth required**: generation now needs a signed-in user (you cannot charge an anonymous caller); the SSE error event carries the structured envelope
- **Result state**: PDF preview + ATS score badge + matched skills + cover letter
- **Export actions**: Download PDF, Download .typ, Copy Code, Show Cover Letter
- **Refinement input**: Natural language feedback with a `resume | cover_letter | both` scope selector → calls `POST /api/refine` (**free**, targeted 4-step refine — NOT a full re-run/re-charge); the result becomes a new version in the parent's chain
- **Persisted + resumable**: a successful generation is saved (see "Backend
  Architecture"); the SSE `saved` event deep-links the URL to `/editor?job=<id>`
  so a refresh restores the result. `/editor?job=<id>` (used by My Resumes "Open")
  loads a past result from `GET /api/resumes/[id]` — **free, no pipeline re-run, no
  re-charge** (wrapped in `<Suspense>` for `useSearchParams`).

#### My Resumes Page (`src/app/resumes/page.tsx`)
- **Generation history** for the signed-in user (the web view of `generationJobs`).
- Debounced search (`?q` matches title or JD text), result count, and "Load more"
  pagination over `GET /api/resumes`.
- Per row: **Open** (`/editor?job=<id>`, free re-open), **Download PDF**
  (`/api/v1/resumes/[id]/pdf`), **Cover Letter** (`/api/resumes/[id]/cover-letter/pdf`),
  and **Delete** (inline confirm → `DELETE /api/resumes/[id]`, which also removes the
  stored R2 PDFs). Linked from the Navbar (logged-in only).

#### Dashboard Page (`src/app/dashboard/page.tsx`)
- **Credits & Billing**: current balance, subscription tier, transaction history, "Buy Credits" button
- Requires authentication (generation **history** lives on the separate My Resumes page)

#### Pricing Page (`src/app/pricing/page.tsx`)
- Subscription tiers and credit packs

### Preview Components
- **LivePdfPreview** (`src/components/preview/LivePdfPreview.tsx`): Compiles Typst; iframe viewer on md+, pdfjs canvas preview below md
- **PdfViewer** (`src/components/preview/PdfViewer.tsx`): desktop iframe viewer with icon-only zoom toolbar
- **PdfCanvasPreview** (`src/components/preview/PdfCanvasPreview.tsx`): mobile in-page preview — lazy-loads `pdfjs-dist` (legacy build) and rasterizes every page to canvas (iOS Safari can't iframe blob PDFs); mounted only under `md` via matchMedia
- **LatexPreview** (`src/components/preview/LatexPreview.tsx`): unused legacy component (stale "Latex" name — no importer in `src/`; kept for reference only)

### UI Library
- **shadcn/ui**: Pre-built components in `src/components/ui/` restyled for Phantom
- **Styling**: Tailwind CSS (light mode only, no dark mode)
- **Layout primitives**: every route composes `PageShell` (width `content` 1200px | `narrow` 672px centered) + `PageHeader` (eyebrow/title/lede/actions) — see DESIGN-SYSTEM.md "Page anatomy"
- **Icons**: Lucide React, POLICY-RESTRICTED (DESIGN-SYSTEM.md "Icons"): only state indicators (Loader2/AlertCircle/CheckCircle2) or icon-only controls with aria-label; never an icon beside a text label
- **List rows**: `RowActions` (≤2 visible buttons + overflow menu, destructive last); copyable commands use `CopyBlock`
- **Animation**: Framer Motion via the single `<FadeIn>` entrance pattern only (never for hover)

### Component Styling Quick Reference

Flat everywhere: 1px `ash` borders, no shadows except the primary-CTA `shadow-glow`.

| Component | Border | Shadow | Hover | Radius |
|-----------|--------|--------|-------|--------|
| Button (default) | none | `shadow-glow` (lavender) | color only | rounded-full |
| Button (secondary/outline) | 1px ash (outline) | none | color only | rounded-full |
| Card | 1px ash | none | none | rounded-3xl |
| Input | 1px ash | none | periwinkle ring (focus) | rounded-2xl |
| Dialog | 1px ash | none (soft scrim) | - | rounded-3xl |
| Badge | 1px | none | - | rounded-full |
| Tabs | none (bone track) | none | active = white pill | rounded-full |

## File Organization

```
src/
├── app/
│   ├── page.tsx              # Product entry point (JD + background → generate)
│   ├── layout.tsx            # Root layout with metadata
│   ├── globals.css           # Global styles and CSS variables
│   ├── api/
│   │   ├── generate/route.ts # SSE adapter for web UI → generation pipeline core (persists result)
│   │   ├── refine/route.ts   # SSE adapter for web UI → refinement core (free; version chain)
│   │   ├── compile/route.ts  # Thin wrapper over compileTypstToPdf core
│   │   ├── keys/route.ts     # API key mint/list/revoke (cookie-session protected)
│   │   ├── resumes/          # WEB history API: route (GET list) + [id] (GET/DELETE) + [id]/cover-letter/pdf + [id]/versions(/compare)
│   │   ├── threads/          # Edit-agent transport: thread CRUD + [id]/messages (SSE tool loop)
│   │   ├── profiles/         # candidate_profiles CRUD (P1) + [id] (GET/PUT voiceSample echo) + [id]/publish
│   │   ├── applications/     # application tracker CRUD (P2)
│   │   ├── v1/resumes/       # PUBLIC agent API (job-based): route + [id] + [id]/pdf + [id]/refine
│   │   ├── v1/me/            # PUBLIC identity/balance probe (GET → { userId, via, credits, tier })
│   │   ├── mcp/              # Hosted remote MCP (Streamable HTTP, OAuth-protected; 9 in-process tools)
│   │   ├── oauth/            # OAuth 2.1 AS: register (DCR) + authorize (consent/PKCE) + token
│   │   └── credits/          # Credit balance + Stripe webhook
│   ├── .well-known/          # oauth-authorization-server (RFC 8414) + oauth-protected-resource (RFC 9728)
│   ├── p/[slug]/             # PUBLIC career endpoint: page.tsx (HTML) + json/ + md/ + not-found.tsx
│   ├── editor/
│   │   ├── page.tsx          # Editor wrapper (Suspense; reads ?job=<id> to re-open)
│   │   └── AIEditorContent.tsx # Result review + refinement + load-past-job mode
│   ├── resumes/page.tsx      # "My Resumes" history (list/search/open/download/delete)
│   ├── dashboard/page.tsx    # Credits & billing
│   ├── pricing/page.tsx      # Pricing tiers
│   ├── connect/page.tsx      # "Connect your AI" — in-app ChatGPT/Claude/CLI/stdio-MCP setup guide
│   ├── sitemap.ts            # sitemap.xml (robots.txt points here); manifest.ts + icon/apple-icon.png alongside
│   └── handler/[...stack]/   # Neon Auth (Stack Auth) pages
├── server/                   # ← transport-agnostic backend core (see "Backend Architecture")
│   ├── core/                 # pipeline.ts, refine.ts, refineScope.ts, step.ts, compile.ts, jdParseCache.ts, sanitize.ts, deps.ts, *.types.ts
│   ├── billing/              # meter.ts, stripeWebhook.ts (+ *.test.ts)
│   ├── auth/                 # apiKeys.ts, caller.ts
│   ├── jobs/                 # runner.ts, concurrency.ts, refineArtifacts.ts, persist.ts (reserveJob/finalize/createManualVersion + R2)
│   ├── agent/                # editAgent.ts, editTools.ts, prompts.ts, store.ts (conversational edit agent)
│   ├── profiles/             # store.ts (CRUD + publish + toPublicProfile) + publicMarkdown/publicAccess/publicUrl.ts
│   ├── applications/         # application tracker store
│   ├── oauth/                # OAuth 2.1 AS internals: config, pkce, store, exchange, redirect, csrf, errors, http, pages
│   ├── mcp/                  # Hosted MCP: verifyToken.ts (auth) + tools.ts (9 in-process tools)
│   ├── storage/              # blobStore.ts (R2 seam) + r2.ts (S3-compatible impl) + *.test.ts
│   ├── errors/               # AppError.ts, envelope.ts
│   ├── log/                  # logger.ts (structured JSON, err.cause chain)
│   └── ratelimit.ts          # Postgres fixed-window rate limiting
├── components/
│   ├── auth/                 # Authentication components
│   ├── preview/              # PDF preview, Typst code view, export buttons
│   ├── shared/               # Navbar, Footer
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── agent/                # AI agent modules
│   │   ├── models.ts         # Model tiering (extractModel / reasonModel)
│   │   ├── telemetry.ts      # AI SDK OpenTelemetry config (AI_TELEMETRY_ENABLED)
│   │   ├── jd-parser.ts      # JD → ParsedJD (extract tier)
│   │   ├── background-parser.ts # Free text → ResumeData (reason tier)
│   │   ├── matching-engine.ts # Resume ↔ JD analysis (reason tier)
│   │   ├── resume-tailor.ts  # Tailors resume to JD (reason tier)
│   │   ├── resume-reviser.ts, cover-letter-reviser.ts # minimal-diff refine agents (reason tier)
│   │   ├── ats-scorer.ts, keyword-coverage.ts # deterministic ATS score (no LLM)
│   │   ├── faithfulness-check.ts # deterministic grounding gate (no LLM)
│   │   ├── cover-letter.ts   # Cover letter generation (reason tier)
│   │   ├── prompt-registry.ts # per-step prompt version source of truth
│   │   └── template-selector.ts # Rule-based template + selectDesignTokens (deterministic, no LLM)
│   ├── design/               # tokens.ts — ACCENT_PAIRS, DesignTokens, resolvePalette/Spacing/emGap
│   ├── typst/
│   │   ├── generator.ts      # Main Typst code generation
│   │   ├── cover-letter.ts   # Cover letter Typst document generator
│   │   ├── utils.ts          # Typst formatting utilities + FA icon helpers
│   │   └── compiler.ts       # Client-side PDF fetch/cache + export helpers
│   ├── services/
│   │   └── creditService.ts  # Credit balance / transactions / idempotent usage / Stripe
│   ├── db/                   # Drizzle ORM client + schema
│   ├── stripe/               # Stripe client + checkout
│   ├── auth/                 # Neon Auth (Stack Auth) configuration
│   ├── validation/
│   │   └── schema.ts         # Zod schemas for type validation
│   └── utils.ts              # General utilities
└── templates/                # 7 Typst resume templates (one per industry bucket)
    ├── registry.ts           # Template registry
    ├── types.ts              # Template type definitions
    └── [template-name]/      # Individual templates (metadata + generator)

cli/                          # `vitex-cli` — SEPARATELY published npm package (own package.json/lockfile/CI)
    └── src/{client,cli,args,format,mcp}.ts  # v1 HTTP client + CLI + stdio MCP server
scripts/migrate.ts            # Idempotent raw-SQL migrations (run with tsx)
vitest.config.ts              # Vitest config (@ alias + server-only stub)
test/stubs/server-only.ts     # server-only stub for tests
docs/api/v1.md                # Public v1 API reference (for agents; threads + applications documented)
docs/connectors/{chatgpt,claude}.md  # Hosted-MCP connector setup guides
docs/decisions/               # ADRs: 0001 money-path · 0002 refinement-first · 0003 adapters + hosted MCP
public/{openapi.yaml,skill.md} # Hand-written OpenAPI 3.1 spec + agent curl playbook; also public/llms.txt
```

## Important Implementation Notes

### Typst Special Character Escaping
Always use `escapeTypst()` from `src/lib/typst/utils.ts` when inserting user data into Typst code. This prevents compilation errors from special characters.

### Date Handling
Work and education entries use string dates (`"Mar 2025"`, `"PRESENT"`) rather than ISO format. The `formatDateRange()` function handles the display formatting.

### Social Profile Mapping
The generator maps common network names to FontAwesome 6 icon function calls via `networkToFaIcon()` in `src/lib/typst/utils.ts` (rendered via the `@preview/fontawesome:0.5.0` Typst package, with FA 6 webfonts bundled at `/app/fonts` in production and auto-detected from `node_modules` in dev):
- `"LinkedIn"` → `#fa-linkedin()`
- `"GitHub"` → `#fa-github()`
- `"Twitter"` / `"X"` → `#fa-x-twitter()`
- `"GitLab"` → `#fa-gitlab()`
- Everything else → `#fa-globe(solid: true)`

### Typst Template Customization
- Page setup: `#set page(paper: "a4")` with 10pt font size
- Layout: Two-column with `grid(columns: (60%, 40%))` for asymmetric layout
- Color scheme: Custom blue colors (PrimaryColor: #0E5484, AccentColor: #2E86AB)
- Margins: `left: 1.25cm, right: 1.25cm, top: 1.5cm, bottom: 1.5cm`
- Icons: Unicode symbols for social profiles and contact info
- Section formatting: Custom Typst functions with colored headers and horizontal rules

### Typst Built-in Features Used
Most layout, color, typography, and linking features come from Typst's built-in language:
- `grid`: Two-column layout with asymmetric widths
- `page`/`text`: Page margins, font size, and typography
- `link`: Clickable hyperlinks
- `list`: Bullet point lists
- `rect`/`box`: Colored boxes for skill tags

The one external package used is `@preview/fontawesome:0.5.0` for contact and brand icons (see Social Profile Mapping above). Its webfont files are bundled at build time from the `@fortawesome/fontawesome-free` npm package.

### Custom Functions Defined
- `cv-section(title)`: Section header with colored text and horizontal rule
- `cv-event(title, subtitle, date, location)`: Work/education entries
- `cv-divider()`: Horizontal line separator between entries
- `cv-tag(keyword)`: Colored box for skill tags
- `cv-subsection(heading)`: Uppercase subsection headers

## AI Generation Pipeline

The full pipeline lives in the **transport-agnostic core**
`src/server/core/pipeline.ts` (`runGenerationPipeline`), NOT in the route. The
SSE route and the v1 job runner are thin callers. It runs **8 steps**, with two
independent pairs parallelized for latency:

1. **Parse JD** (`parseJobDescription`) ∥ 2. **Parse Background** (`parseBackground`) — run concurrently
3. **Analyze Match** (`analyzeMatch`) — deterministic skill overlap + LLM
4. **Tailor Resume** (`tailorResume`)
5. **Score ATS** (`scoreATS` = `scoreATSDeterministic`, **no LLM**) ∥ 6. **Cover Letter** (`generateCoverLetter`) — run concurrently
7. **Render** (`selectTemplate` + template generator → Typst code + cover-letter Typst)
8. **Compile** (`compileTypstToPdf` → PDF bytes — the billable artifact)

After step 8 succeeds, the **single billing charge** happens (`deps.meter.chargeForResult`).
Each step is wrapped (`makeStepRunner`, `src/server/core/step.ts`) so retriable
infra blips back off and any final failure becomes a typed `PipelineStepError`/
`CompilationError` (no charge). Step 1's `parseJobDescription` runs through a
cross-user LRU cache (`withJdParseCache`, `src/server/core/jdParseCache.ts`) at
the deps seam. Progress is pushed via `deps.onProgress` so the SSE route can
stream it. User input is zod-validated and prompt-injection-sanitized before
reaching LLMs.

### Agent Modules (`src/lib/agent/`)
Models are **tiered** (`src/lib/agent/models.ts`): `extractModel` (default
`gpt-4o-mini`) for read/score steps, `reasonModel` (default `gpt-4o`) for
generation/quality-critical steps. Override via `AI_MODEL_EXTRACT` / `AI_MODEL_REASON`.
All calls carry `experimental_telemetry` (`src/lib/agent/telemetry.ts`, gated by
`AI_TELEMETRY_ENABLED`) for OpenTelemetry/Langfuse traces. **PII**: recording the
raw prompt inputs/outputs (the resume + JD) on spans is OFF by default and only
turns on with `AI_TELEMETRY_RECORD_IO=true`; with it off, spans still carry
timing/token/cost but not the candidate's text.

- **jd-parser.ts**: `generateObject` → ParsedJD — **extract tier**
- **background-parser.ts**: `generateObject` → ResumeData from free text — **reason tier**
- **matching-engine.ts**: deterministic skill overlap + LLM analysis → MatchAnalysis — **reason tier**
- **resume-tailor.ts**: rewrites bullets, reorders skills, adjusts summary — **reason tier**
- **ats-scorer.ts**: `scoreATSDeterministic` — pure keyword coverage (`keyword-coverage.ts`), **no LLM** (the old extract-tier LLM report was 100% discarded downstream and was removed)
- **cover-letter.ts**: `generateText` → 3-4 paragraph cover letter — **reason tier**
- **resume-reviser.ts** / **cover-letter-reviser.ts**: minimal-diff revise agents used by the refine core — **reason tier**
- **faithfulness-check.ts**: deterministic grounding gate (revision must not invent facts vs the original) — no LLM
- **template-selector.ts**: rule-based industry/level → template ID (no LLM)
- **prompt-registry.ts**: single source of truth for per-step prompt versions
  (attached to telemetry + recorded on results); `score-ats` was removed with the LLM scorer

### Targeted Refinement (`src/server/core/refine.ts`)
A refine doesn't re-run the 8-step pipeline. `runRefinementPipeline` operates on
a completed parent job's stored artifacts (`RefineArtifacts`) + first-class
sanitized `feedback` (1..8000 chars) + an explicit `scope`
(`'resume'|'cover_letter'|'both'`, default `'resume'`) and runs **4 steps** —
revise → deterministic ATS re-score → render → compile — returning the same
`GenerateResult` shape so transports/persistence handle it identically:
1. **Revise** — ONE parallel reason-tier wave: `reviseResume` (skipped when
   scope=`cover_letter`) ∥ `reviseCoverLetter` (skipped when scope=`resume`),
   each a minimal-diff agent. A resume revision passes a deterministic
   **faithfulness gate**; a violation triggers exactly one corrective revise
   pass. For jobs stored before `parsedJD` persistence the JD is re-parsed once,
   folded into this step (still 4 progress events).
2. **Score ATS** — deterministic keyword re-score (no LLM).
3. **Render** — parent's template generator → resume + cover-letter Typst.
4. **Compile** — the (billable, when enabled) PDF.

It is **FREE by default** (`REFINE_COST_CREDITS = 0`; the whole charge path —
kind `resume_refinement` — is wired + tested behind the constant via the
`costCredits` dep override). `GenerateResult` now carries `parsedJD` (persisted
via `toWireResult`) so a refine-of-refine never re-parses.

Two transports over the shared core:
- **`POST /api/refine`** — web SSE, mirrors `/api/generate`'s event shapes; auth
  + `refine:{userId}` 10/60s; body `{ refineOfJobId, feedback, scope? }`. Loads
  the owner-scoped parent, builds artifacts via `buildRefineArtifacts`
  (`src/server/jobs/refineArtifacts.ts`, tolerant of old jobs missing
  parsedJD/coverLetter/templateId), reserves a job linked to the parent (version
  chain), then persists via the shared `finalizeSucceededJob`.
- **`POST /api/v1/resumes/{id}/refine`** — agent-facing async 202 job; the
  shared runner dispatches refine-shaped inputs (`isRefineInput`) to the same
  core. Same failed-key reclaim semantics as generation (`docs/api/v1.md`).

The editor's Refine box calls the web endpoint (free, with a resume/cover-letter/
both scope selector and a 4-step progress gallery) instead of re-running the
full pipeline.

### Conversational Edit Agent (`src/server/agent/`)
A bounded AI-SDK tool-calling loop (`runEditTurn` in `editAgent.ts`) lets the
user edit a working `ResumeData` **and** cover letter in natural language; the
document is deterministically re-rendered to Typst after each edit. **Free** — no
billing here; the sole charge site stays the post-compile call in
`runGenerationPipeline`. Key traits:
- **Controlled tools** (`editTools.ts`): whole-list `editWorkHighlights`/
  `editProjectHighlights` plus single-bullet `editWorkHighlight`/
  `editProjectHighlight`, skill/section edits, and cover-letter tools
  `rewriteCoverLetterParagraph`/`setCoverLetterText`/`previewCoverLetter`. Every
  input is zod-validated, sanitized, and render-bounded.
- **Token streaming**: `streamText` with `onChunk` text deltas; `onError` is
  captured and rethrown so a mid-stream failure still rejects.
- **Context cost control**: the system prompt embeds a compact tool-editable
  projection (`buildResumeProjection`) not the full ResumeData, and history
  replay is windowed to the last 30 text turns (`tailHistoryWindow`) with an
  omission marker. Prompt id `edit-agent` is at **v3**.
- **Persistence** (`store.ts`): turns append to `agent_threads`/`agent_messages`;
  snapshots carry optional cover-letter fields (old snapshots stay valid) and are
  GC'd to the newest 3 assistant blobs per thread (`gcThreadSnapshots`,
  best-effort). Manual version saves (`createManualVersion`) are free and
  re-render the letter's Typst server-side.

### Adding/Changing a Pipeline Step
Edit `runGenerationPipeline` in `src/server/core/pipeline.ts`, add the dep to
`PipelineDeps`/`defaultDeps`, keep the single billing call site after compile,
and update the step count in `AIEditorContent.tsx`'s `PROGRESS_STEPS`. Add a
fake-injected case to `pipeline.test.ts`.

## Design Tokens

`src/lib/design/tokens.ts` gives each generated resume a small, bounded, tasteful
style variation without ever changing layout structure (so ATS compatibility is
untouched):
- **`ACCENT_PAIRS`** — 6 named `(primary, accent)` palettes (`slate`, `indigo`,
  `emerald`, `crimson`, `amber`, `graphite`). `slate` is the historical default and
  MUST reproduce the pre-tokens output byte-for-byte.
- **`DesignTokens { palette, density }`** where `density ∈ 'comfortable' | 'compact'`;
  `DEFAULT_TOKENS` = `{ slate, comfortable }` (today's exact look). `designTokensSchema`
  defaults both fields so an old persisted job (no `tokens`) parses to the default.
- **`resolvePalette`** → concrete hex (falls back to `slate` for any unknown name);
  **`resolveSpacing`/`emGap`** → the vertical-rhythm scale (comfortable = 1.0,
  compact = 0.8), applied only to inter-block `v(...em)` gaps. At scale 1 the base
  literal is emitted verbatim (byte-compatibility guarantee).
- **Selection is deterministic, no LLM**: `selectDesignTokens(jd, seed)` in
  `src/lib/agent/template-selector.ts` picks tokens from the parsed JD + a stable
  candidate seed via `fnv1a` hashing, so the same inputs always resolve to the same
  tokens (a PDF rebuilds identically forever).
- **Persistence + threading**: tokens are attached to `GenerateResult` and persisted
  via `toWireResult` (`generation_jobs.result.tokens`), and threaded through EVERY
  render path (generate / refine / edit / manual version) — see `renderTypst` /
  `renderTemplate` in `src/server/jobs/persist.ts`. `renderTemplate`'s `lockPalette`
  keeps executive/creative templates on their brand color while still honoring
  density. All 7 template generators consume the density spacing.

## Voice Profile

A saved candidate profile can carry an optional **`voiceSample`** (the candidate's
own writing, `candidate_profiles.voice_sample`, ≤ 4000 chars) so generated cover
letters match their voice:
- **Pure prompt builder**: `buildCoverLetterPrompt(resume, jd, voiceSample?)` in
  `src/lib/agent/cover-letter.ts` folds the sample into a voice block + style rule;
  the cover-letter prompt is at **v2**. It is profile-only and **sanitized at
  pipeline entry** (never trusted raw into the LLM).
- **Owner-only echo**: `GET`/`PUT /api/profiles/[id]` return/accept `voiceSample`
  for the owner; `ProfileSummary` exposes only a boolean `hasVoiceSample` (never the
  text) in list views.
- **Refine wiring**: `src/server/jobs/refineVoice.ts` re-fetches the voice sample
  owner-scoped via the parent/root job's `profileId` (it is **never persisted** on
  the job), feeding `reviseCoverLetter` (revise-cover-letter prompt **v2**).
- **Privacy invariant**: `voiceSample` is raw free text and is on the public-profile
  NEVER-expose list (see below).

## Public Career Endpoint

A profile can be **published** to a stable, unguessable public URL — "your career
as a page an agent can read":
- **Routes**: `/p/[slug]` (HTML, Phantom), `/p/[slug]/json`, `/p/[slug]/md`
  (`src/server/profiles/publicMarkdown.ts`). `not-found.tsx` for unpublished/unknown.
- **Store**: `candidate_profiles.public_slug` (stable, unguessable — kept on
  unpublish so republishing restores the same URL) + `published_at` (visibility is
  gated purely on `published_at IS NOT NULL`). `publishProfile`/`unpublishProfile`
  in `src/server/profiles/store.ts`; controlled via `POST`/`DELETE
  /api/profiles/[id]/publish`.
- **Allowlist projection — the load-bearing safety invariant**: `toPublicProfile`
  builds a `PublicProfile` from an **explicit allowlist**. `email`, `phone`, `photo`
  (contact PII), `rawBackground`, `voiceSample` (raw text), and internal identifiers
  (`userId`, row `id`) are deliberately ABSENT and must NEVER be added — enforced by
  `publicProfile.test.ts`.
- **Hardening**: public reads are IP-rate-limited (`pub:` key,
  `src/server/profiles/publicAccess.ts`); outbound links are built through
  `safePublicUrl` (`src/server/profiles/publicUrl.ts`, scheme allowlist).

## OAuth Authorization Server + Hosted MCP

So a **non-technical user** can connect Vitex inside ChatGPT or Claude with a
sign-in (no API key to paste), the app is both an OAuth 2.1 Authorization Server and
an OAuth-protected remote MCP server.

- **Authorization Server** (`src/server/oauth/**`, routes `src/app/api/oauth/*` +
  `src/app/.well-known/*`):
  - `/.well-known/oauth-authorization-server` (RFC 8414 discovery),
    `/api/oauth/register` (Dynamic Client Registration, RFC 7591),
    `/api/oauth/authorize` (session-gated consent screen, PKCE **S256** required,
    CSRF-protected), `/api/oauth/token` (authorization_code exchange).
  - **The access token IS a first-class Vitex API key.** `exchange.ts` mints a fresh
    API key as the returned bearer token — the whole AS is a **facade over the
    existing API-key system**. There is **no refresh token**; the user revokes access
    from the dashboard's "Connections & API Keys" list (the existing
    `GET`/`DELETE /api/keys`).
  - New tables: `oauth_clients`, `oauth_codes` (short-lived PKCE codes).
- **Hosted remote MCP** (`src/app/api/mcp/route.ts`, `src/server/mcp/**`):
  - `/api/mcp` speaks Streamable HTTP via the **`mcp-handler`** dep (wrapping
    `@modelcontextprotocol/sdk`), stateless JSON mode (no session store).
  - `/.well-known/oauth-protected-resource` (RFC 9728) advertises the AS; a 401
    carries `WWW-Authenticate` pointing at it, so a connector completes the dance.
  - Auth via `withMcpAuth` → `verifyMcpToken` → the SAME `verifyApiKey` the REST API
    uses; the userId rides on `AuthInfo.extra`.
  - The **9 tools** (`registerVitexTools`) call the backend **core directly** — the
    same functions the v1 routes call (`createJob`, refine, profile store, credit
    balance) — so **billing, idempotency, concurrency, and owner scoping are
    identical** to the REST API. Tools: `get_account`, `generate_resume`,
    `refine_resume`, `get_resume`, `download_pdf`, `list_profiles`, `create_profile`,
    `publish_profile`, `unpublish_profile`.
- **Canonical host = `https://www.vitex.org.nz`.** The whole OAuth/MCP surface
  advertises `www` via `getBaseUrl()` (`src/server/oauth/config.ts`), which reads the
  `NEXT_PUBLIC_APP_URL` build secret and falls back to the canonical origin — the
  issuer MUST be a stable absolute https URL.
- **Connector guides**: `docs/connectors/chatgpt.md`, `docs/connectors/claude.md`.

## The `vitex-cli` package (CLI + stdio MCP)

`cli/` is a **separately published npm package** (`vitex-cli`, bin `vitex`, currently
v0.2.0) — a thin client over the public v1 API, plus a stdio MCP server.
- **Not a workspace**: `cli/` has its OWN `package.json`/lockfile and its own CI job.
  The root `tsconfig` excludes `cli`, and eslint ignores `cli/**` — it builds/tests
  independently (`tsup` build, `vitest`). Deps: `@modelcontextprotocol/sdk` + `zod`.
- **Two modes**: the CLI (`vitex <cmd>` — incl. `whoami` → `GET /api/v1/me`) for
  terminals and coding agents, and `vitex mcp` (`npx -y vitex-cli mcp`), a **stdio MCP
  server** for Claude Desktop, Claude Code, and Cursor. It exposes the same 9 tools as
  the hosted `/api/mcp` (incl. `get_account`), but over HTTP to the public API rather
  than in-process.
- **Files**: `cli/src/{client,cli,args,format,mcp}.ts` — `client.ts` (v1 HTTP
  wrapper), `cli.ts` (arg dispatch), `args.ts`, `format.ts`, `mcp.ts` (the stdio
  MCP server), each with a colocated `*.test.ts`.

## Environment Variables

See `.env.example` for the full list. Summary:

```env
# Neon Auth (Stack Auth) — Stack Auth IS Neon Auth
NEXT_PUBLIC_STACK_PROJECT_ID=
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=
STACK_SECRET_SERVER_KEY=

# Database (Neon Postgres) — also used for rate limiting
DATABASE_URL=

# Canonical app origin — baked at BUILD time (NEXT_PUBLIC_*). Drives the OAuth
# issuer + all advertised OAuth/MCP/public-profile URLs (getBaseUrl,
# src/server/oauth/config.ts). Prod = https://www.vitex.org.nz (canonical www);
# falls back to that origin if unset. Local dev: http://localhost:3000.
NEXT_PUBLIC_APP_URL=

# AI
OPENAI_API_KEY=            # required for the generation pipeline
JOB_CONCURRENCY=2          # optional: max concurrently executing v1 background jobs
AI_MODEL_EXTRACT=gpt-4o-mini   # optional: cheap read/score tier
AI_MODEL_REASON=gpt-4o         # optional: generation/quality tier
AI_TELEMETRY_ENABLED=false     # optional: emit OpenTelemetry spans (Langfuse)
AI_TELEMETRY_RECORD_IO=false   # optional: record raw prompt I/O (resume+JD = PII) on spans; OFF by default
LOG_LEVEL=info                 # optional: debug|info|warn|error

# Stripe (billing)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_CREDITS_5=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_UNLIMITED_MONTHLY=

# Typst (compilation) — usually only set in Docker
TYPST_BIN=typst
TYPST_FONT_PATH=/app/fonts

# Object storage for compiled PDFs (Cloudflare R2) — OPTIONAL
# When all four are set, compiled resume/cover-letter PDFs are persisted to R2
# and served from there; otherwise the PDF routes recompile from Typst on demand.
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

**Removed dependencies** (do not reintroduce without a real need): Cloudinary
(unused) and Upstash Redis / `KV_REST_API_*` (rate limiting moved to Postgres
after the free-tier DB was idle-deleted). Note: object storage is now Cloudflare
**R2** (S3-compatible, via `@aws-sdk/client-s3`), not the old Vercel Blob /
Cloudinary — see `src/server/storage/`.

**Notable added dependency**: `mcp-handler` (wraps `@modelcontextprotocol/sdk`)
powers the hosted remote MCP endpoint (`/api/mcp`, Streamable HTTP). The `cli/`
package pulls `@modelcontextprotocol/sdk` + `zod` on its own (separate lockfile).

## Migration Context

This project underwent multiple architectural transformations:

1. **HTML/CSS to LaTeX (commit e6d3802)**:
   - **Removed**: ~3,800 lines of A4 layout/pagination code, Puppeteer PDF export, HTML/CSS rendering
   - **Added**: LaTeX generation system, Overleaf integration, Prism.js syntax highlighting
   - Fixed 414 Request-URI Too Large error by switching from GET to POST form submission

2. **moderncv to Custom Two-Column Layout**:
   - **Removed**: Single-column moderncv template, dependency on altacv.cls
   - **Added**: Custom two-column layout using article class and standard packages
   - **Benefits**: Works on all LaTeX platforms without additional files, full customization control
   - **Layout**: Left column (intro, experience, projects), Right column (education, skills, achievements, certifications)
   - **Packages**: Uses only standard packages (paracol, geometry, xcolor, fontawesome5, hyperref, enumitem, titlesec)

3. **UI Redesign to Neobrutalism (superseded by Phantom, see 20)**:
   - **Removed**: Dark mode support, soft shadows, glass morphism effects, gradient backgrounds
   - **Added**: Bold Neobrutalism design system with:
     - Hard shadows (4-8px offset, solid black)
     - Thick black borders (2px) on all interactive elements
     - Light gray page background (#f0f0f0) with white cards
     - Framer Motion for entrance animations
     - CSS-based hover effects (not framer-motion boxShadow)
   - **Benefits**: Distinctive, memorable design that avoids generic "AI slop" aesthetic
   - **Key files modified**: All UI components, globals.css, all pages

4. **CopilotKit to Vercel AI SDK**:
   - **Removed**: CopilotKit (large bundle size exceeded Cloudflare 25MB limit)
   - **Added**: Vercel AI SDK for AI-powered resume editing
   - **Result**: Server-side bundle ~1.3 MB gzipped, compatible with Cloudflare Workers

5. **Railway to Cloudflare Workers to DigitalOcean VPS**:
   - **Removed**: Railway config, then Cloudflare Workers config (`wrangler.jsonc`, `@opennextjs/cloudflare`)
   - **Added**: Docker + GitHub Actions CI/CD to DigitalOcean VPS
   - **Refactored**: Per-request client factories back to singletons
   - **Key files**: `Dockerfile`, `.github/workflows/deploy.yml`

6. **LaTeX to Typst (current)**:
   - **Removed**: Entire LaTeX generation system, Overleaf integration, prismjs
   - **Added**: Typst generation system with local compilation
   - **Benefits**: < 100ms compilation (vs 5-15s LaTeX), single binary dependency, no external API, AI-friendlier syntax
   - **Key files**: `src/lib/typst/generator.ts`, `src/lib/typst/utils.ts`, `src/lib/typst/compiler.ts`

7. **UI/UX "Sell Results" Overhaul**:
   - **Removed**: Manual editor, template gallery, standalone tailor page, 20+ components
   - **Added**: Product-first homepage (JD+background input), result review editor (PDF preview + refinement)
   - **Benefits**: 3-step user flow (paste JD → generate → download PDF)

8. **AI Generation Pipeline**:
   - **Added**: Full SSE streaming pipeline, background parser, template selector
   - **Benefits**: End-to-end automated resume generation from free-text input
   - **Key files**: `src/app/api/generate/route.ts`, `src/lib/agent/background-parser.ts`, `src/lib/agent/template-selector.ts`

9. **Backend core extraction + "API is the UI" + outcome billing** (current):
   - **Added**: transport-agnostic `src/server/` core (pipeline/compile/billing/auth/errors/log),
     API-key auth + public job-based v1 API (`/api/v1/resumes`), machine-readable
     error envelope, structured JSON logging, in-process job runner, vitest tests.
   - **Fixed**: the critical billing bug — generation never deducted credits;
     now charges once, only on a successfully compiled PDF, idempotently. Pipeline
     now compiles the PDF server-side (8th step) so billing anchors to a real artifact.
   - **Key files**: `src/server/**`, `src/app/api/{generate,compile,keys,v1}/`, `docs/api/v1.md`

10. **Pipeline cost/latency + Stripe correctness** (current):
    - **Added**: model tiering (`src/lib/agent/models.ts`), parallelized independent
      steps, AI SDK telemetry, Stripe webhook idempotency (`stripe_events`) + pro
      monthly-credit renewal (`applyStripeEvent`).

11. **Upstash Redis → Postgres rate limiting** (current):
    - **Removed**: `@upstash/redis` + `src/lib/redis/` (free-tier DB was idle-deleted).
    - **Added**: `rate_limits` table + `src/server/ratelimit.ts` (always-on, no extra
      dependency, immune to idle deletion). Retry-After / X-RateLimit-* headers.

12. **Web-UI generation persistence + "My Resumes" history** (current):
    - **Fixed**: web-UI generations were fire-and-forget — a paid result lived only
      in React state/sessionStorage and was lost on refresh/return. Now the SSE
      route persists each completed generation to `generationJobs` (the same model
      the v1 API uses), so "the API is the UI" holds at the storage layer too.
    - **Added**: `src/server/jobs/persist.ts` (shared `toWireResult` /
      `deriveJobTitle` / best-effort `persistCompletedJob`), web history API
      `/api/resumes` (GET list) + `/api/resumes/[id]` (GET detail / DELETE,
      owner-checked → NotFound for non-owners), a Neobrutalism `/resumes` page +
      Navbar link, and an editor `?job=<id>` re-open path that loads a past result
      for **free** (no pipeline re-run, no re-charge). The generation URL now
      deep-links to `?job=<id>` so a refresh restores the result.
    - **Schema**: `generation_jobs.title` column + `idx_generation_jobs_user_created`
      (idempotent DDL in `scripts/migrate.ts`).
    - **Invariant preserved**: persistence only records an already-computed result;
      it never touches the pipeline or billing, so no double-charge is possible.
      The dead `resumes`/`tailoredResumes`/`applications` tables stay as future
      scaffolding (unused).
    - **Key files**: `src/server/jobs/persist.ts`, `src/app/api/resumes/**`,
      `src/app/resumes/page.tsx`, `src/app/editor/{page,AIEditorContent}.tsx`,
      `src/app/api/generate/route.ts`.

13. **R2 PDF storage + history search/pagination + cover-letter download** (current):
    - **Added**: object-storage seam `src/server/storage/` (Cloudflare R2 via
      `@aws-sdk/client-s3`, no-op when unconfigured). Compiled resume PDFs are
      uploaded best-effort on success; PDF routes serve R2-first with recompile
      fallback + lazy backfill. New cover-letter PDF route
      `/api/resumes/[id]/cover-letter/pdf` (recompiled, R2-backed) with a download
      button on the My Resumes list.
    - **Added**: `/api/resumes` now supports `?q` search (title or JD text) +
      `limit`/`offset` pagination (`{ items, total, hasMore }`); the `/resumes`
      page has a debounced search box, result count, and Load more.
    - **Env**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
      `R2_BUCKET` (all optional; wired into `deploy.yml` runtime env).

14. **P3 "refinement-first" refactor** (current, PRs #32–#48; see
    `docs/decisions/0002-refinement-first-architecture.md`):
    - **Added**: targeted refinement core `src/server/core/refine.ts`
      (`runRefinementPipeline`, 4 steps, scoped, **free** behind
      `REFINE_COST_CREDITS`) + minimal-diff revise agents + shared
      `step.ts`/`refineArtifacts.ts`; both transports `POST /api/refine`
      (web SSE) and `POST /api/v1/resumes/{id}/refine` (agent async job).
      `GenerateResult` now persists `parsedJD` (refine-of-refine never
      re-parses). JD parse cache (`jdParseCache.ts`) + FIFO job semaphore
      (`concurrency.ts`, `JOB_CONCURRENCY`). Edit-agent cover-letter tools +
      token streaming + context projection/history window + snapshot GC.
      Ops: `.github/workflows/ci.yml` + `logs.yml`, logger err.cause chain.
    - **Removed**: the step-5 ATS **LLM** call (its output was 100% discarded) —
      scoring is now pure `scoreATSDeterministic`; `atsReportSchema`/`ATSReport`
      and prompt id `score-ats` deleted. Removed unused `openai` dep + `vercel.json`.
    - **Fixed**: `resumeDataSchema` now tolerates empty strings on fields the AI
      must never invent (education/work dates+location, project description;
      `parse-background` v2) so a truthful "unknown" no longer fails validation.
    - **Invariant preserved**: charge-once-after-compile holds — the refine
      charge site is a guarded sibling (constant = 0), edits/manual versions are free.

15. **Discoverability + converged editor** (PRs #50–#57):
    - **Added**: agent-facing discoverability assets — `public/llms.txt` (rewritten),
      hand-written `public/openapi.yaml` (OpenAPI 3.1), `public/skill.md` (agent curl
      playbook); `docs/api/v1.md` completed (threads + applications documented; no
      `/api/v1` aliases). Pre-emptive auth gate (`page.tsx` routes to sign-in before
      the editor). Converged editor: a single conversational refine box +
      `src/server/core/refineScope.ts` `inferRefineScope` (deterministic scope
      inference; `/api/refine` defaults its scope via it); StructuredEditor +
      edit-agent folded under one "Advanced edit"; persist-before-navigate for "Edit
      with AI". Export dropdown + Resume/Cover-letter tabs + History disclosure.

16. **Voice profile, design tokens, public career endpoint** (PRs #58–#61):
    - **Added**: **Voice profile** — `candidate_profiles.voice_sample`, pure
      `buildCoverLetterPrompt`, cover-letter prompt v2 (profile-only, sanitized at
      pipeline entry). **Design tokens** — `src/lib/design/tokens.ts` +
      `selectDesignTokens` (deterministic, no LLM), persisted on `GenerateResult` and
      threaded through every render path; all 7 templates consume density spacing.
      **Public career endpoint** — `/p/[slug]` (+`/json`,`/md`),
      `candidate_profiles.public_slug`/`published_at`, `toPublicProfile` allowlist
      projection (email/phone/photo/rawBackground/voiceSample NEVER exposed),
      publish/unpublish store fns + `POST`/`DELETE /api/profiles/[id]/publish`,
      `src/server/profiles/{publicMarkdown,publicAccess,publicUrl}.ts`.

17. **`vitex-cli` + voice edit UI** (PRs #62–#63):
    - **Added**: the `cli/` package `vitex-cli` (bin `vitex`), published to npm
      (v0.2.0) — a thin client over the v1 API + a stdio MCP server (`vitex mcp`).
      Own package.json/lockfile (NOT a workspace); root tsconfig excludes `cli`,
      eslint ignores `cli/**`, dedicated CI `cli` job. Voice edit UI (GET/PUT
      `/api/profiles/[id]` echo `voiceSample` owner-only; `hasVoiceSample` on
      `ProfileSummary`).

18. **Account probe + refine voice + density landing** (PRs #66–#69):
    - **Added**: `GET /api/v1/me` → `{ userId, via, credits, tier }`. Refine voice
      wiring (`src/server/jobs/refineVoice.ts`, owner-scoped re-fetch via parent/root
      `profileId`, never persisted; `RefineArtifacts.voiceSample`; reviseCoverLetter
      voice, revise-cover-letter prompt v2). Density landing — all 7 template
      generators consume density spacing; `lockPalette` became palette-only. CLI
      0.2.0 — `whoami` → `/api/v1/me`; new `get_account` MCP tool.

19. **OAuth 2.1 AS + hosted remote MCP** (PRs #70–#72):
    - **Added**: an OAuth 2.1 **Authorization Server** —
      `/.well-known/oauth-authorization-server` (RFC 8414), `/api/oauth/{register
      (DCR RFC 7591), authorize (+consent, PKCE S256, CSRF, session-gated), token}`,
      `src/server/oauth/*`, new `oauth_clients` + `oauth_codes` tables. The access
      token IS a freshly minted first-class API key (a **facade over API keys**); no
      refresh token; revoke via dashboard. **Hosted remote MCP** — `/api/mcp`
      (Streamable HTTP via the `mcp-handler` dep), `/.well-known/oauth-protected-resource`
      (RFC 9728), `src/server/mcp/{verifyToken,tools}.ts`; 9 in-process tools calling
      the same core as v1 (billing/idempotency identical); auth via `withMcpAuth` →
      `verifyApiKey`. Connector guides `docs/connectors/{chatgpt,claude}.md`. Dashboard
      gained a "Connections & API Keys" list + revoke. **Canonical host =
      `https://www.vitex.org.nz`** via the `NEXT_PUBLIC_APP_URL` build secret
      (`getBaseUrl`, `src/server/oauth/config.ts`).
    - **Public copy** (#73): pages realigned to "Career as Code"; pricing "what
      credits get you" ledger corrected (1 credit per compiled resume incl. cover
      letter + ATS; refine/AI-edit/failed-build free); `docs/BRAND_GUIDELINES.md`
      de-staled (LaTeX→Typst, dropped "data stored locally"/Overleaf).

20. **Neobrutalism → Phantom UI redesign (current)**:
    - **Removed**: the entire Neobrutalism system (`.neo-*` utilities, 2px black
      borders, hard offset shadows, `#f0f0f0` canvas, `font-black`, Titan One) AND
      the "Typeset Proof" metaphor layer (CropFrame crop marks, mono `proof-label`,
      `baseline-grid`, § section numbers, compile theatrics). Old UI brand colors
      #6C3CE9/#00D4AA retired (logo SVGs unchanged).
    - **Added**: the **Phantom** design system (`docs/DESIGN-SYSTEM.md` = ground
      truth): aubergine/lavender palette, flat surfaces with 1px ash borders, pill
      geometry, whisper-weight Geist (300/400, cap `font-medium`), single lavender
      glow on the primary CTA, 64px section rhythm, dark aubergine bands only on
      the homepage CLI section + Footer, and one sanctioned motion pattern
      (`FadeIn`). shadcn primitives, Navbar (floating pill), Footer, all pages,
      OAuth consent pages, and Stack Auth theme re-themed; editor right rail
      rebuilt as a single divided card (boxes-in-boxes removed).
    - **Invariant preserved**: styling only — no pipeline/billing/handler changes.

**Legacy reference**: `A4_RESUME_USAGE.md` documents the original HTML/CSS approach (not currently used)

## Type System

All types are inferred from Zod schemas using `z.infer<typeof schema>`. When modifying data structures:
1. Update the Zod schema in `src/lib/validation/schema.ts`
2. TypeScript types automatically update via type inference
3. Update Typst generator functions to handle new fields
4. Test with actual data in `src/data/resume.ts`

## Development Workflow

When adding new resume sections:
1. Update schema in `src/lib/validation/schema.ts`
2. Add data to `src/data/resume.ts`
3. Create generator function in `src/lib/typst/generator.ts`
4. Add section to `generateTypstCode()` sections array
5. Test Typst output by compiling locally

## Claude Code Preferences

### Language Requirements
- **UI Content**: All text in pages and components MUST be in English. No Chinese content allowed in the codebase.
- **Conversation**: Communicate with user in Chinese (Mandarin).
- **Code**: All code strings, comments, and documentation must be in English.
- **Function Comments**: Add function-level comments following Google Open Source style guide.

### Git Workflow
- **Commit Style**: Use Conventional Commits format following Angular specification.
- **GitHub CLI**: GitHub CLI is available for repository operations (use `gh` commands).
- **Commit Location**: Always verify current working directory is the project root (vitex) before committing.

### Testing Strategy
- **Vitest is set up** (`npm test`). Add tests for new backend-core logic,
  especially money-path (billing, webhooks) — test the DI core with fakes.
- Create functional tests in the project folder for every feature milestone.
- Test comprehensively before moving to next milestone.
- Use minimal tests to verify implementation effectiveness.
- Avoid creating extra documentation files unless explicitly requested.
- Run the full verification gate before claiming completion:
  `npm test && npx tsc --noEmit && npm run lint && npm run build`.

### Code Quality Principles
1. **Problem-Solving**: Find the best solution, don't bypass problems. Tackle issues head-on.
2. **Efficiency**: Minimize code changes and use token-efficient implementations.
3. **Focus**: Stay laser-focused on user's task. Avoid extra/unnecessary work.
4. **Modularity**:
   - Decouple UI components, logic components, and data components
   - Break down components into smaller, granular pieces
   - Extract and reuse common logic
5. **Maintainability**: Ensure code is robust, extensible, and maintainable.

### UI Development Guidelines
1. **Follow Phantom**: All new UI must follow the Phantom design system — `docs/DESIGN-SYSTEM.md` is ground truth
2. **No Dark Mode**: Do not implement dark mode styling (still true)
3. **Flat surfaces**: No shadows except `shadow-glow` on the primary CTA; separate with 1px `ash` borders, `bone` panels, and whitespace
4. **Avoid Hydration Mismatches**: Never use `Math.random()` or `Date.now()` in components that render on both server and client
5. **Weight ceiling**: Geist weights 300/400/500 only — `font-medium` is the max; never `font-bold`/`font-black`
6. **Pill geometry**: `rounded-full` buttons/nav/tags, `rounded-3xl` cards, `rounded-2xl` inputs; no black borders
7. **Motion**: One pattern only — `<FadeIn>` entrances; hover feedback is color change only, never `whileHover` scale/rotate/boxShadow

### Communication
- Explain actions clearly in conversation.
- Avoid verbose preambles unless requested.
- Keep explanations concise and relevant to the task.
