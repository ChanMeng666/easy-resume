# ADR 0001 — Money-path correctness, Typst safety, and the idempotency contract

- **Status**: Accepted (P0-1, P0-3, P0-2, **P0-2b shipped** — money-path idempotency fully closed; P0-4/P0-5/P1 pending)
- **Date**: 2026-06-28
- **Authors**: Claude (implementation lead) × Codex (adversarial reviewer)
- **Scope**: Outcome-based billing, public/web idempotency, Typst rendering safety

## Context

A joint adversarial review (Claude proposes/implements, Codex tries to break it,
each finding verified against the real code and the `typst`/Postgres semantics)
audited Vitex for correctness, abuse-resistance, and professionalism. Claude's
opening thesis ("the root cause is statelessness; activate the dormant tables")
was **rejected**: the dormant tables (`resumes`, `resumeVersions`,
`tailoredResumes`, `jobDescriptions`, `applications`, `agentThreads/Messages`)
are a half-finished second data model. Activating them wholesale imports
migration debt. The higher-leverage work was a set of **verified correctness and
money-path bugs** that the thesis ignored. This ADR records the decisions.

## Decisions

### Table ownership (what stays dormant)
`generation_jobs` is the single persistence model for all generations (web + v1).
The following stay **intentionally dormant** until their owning feature is built:
`tailored_resumes` (duplicates `generation_jobs.result`), `applications`
(product scope, over-promised in pricing), `agentThreads/Messages` (no real
tool-using editor agent exists — the "agent" is a fixed linear pipeline),
`resumeVersions` (premature until the canonical editable object is settled),
`resumes` (stores a rendered blob + share slug, not canonical candidate facts).
The future "enter background once, reuse across JDs" capability will be a **new
minimal `candidate_profiles`** table (the canonical source of truth), not a
revival of `resumes`. See P1 below.

### Billing invariants (must always hold)
1. **Charge once, only on a compiled PDF.** Single call site after compile.
2. **Atomic debit.** The balance check + debit + usage-txn audit row are one
   atomic SQL statement; the balance can never go negative or be lost to a stale
   read. (Fixed — P0-1.)
3. **No unbilled delivery.** A result is never returned unless its charge
   succeeded. (Fixed — P0-1 pipeline gate.)
4. **Idempotency is per-user and bound to the deliverable, not just the charge.**
   (Partially done — see P0-2 / the residual below.)

### Typst rendering safety
Two escaping contexts exist and must not be conflated: **content mode**
(`escapeTypst`, inside `[...]` / markup — now also escapes `[` `]`) and **string
literal** (`escapeTypstString`, inside `"..."` — escapes only `\` and `"`).
Using content-mode escaping inside a string literal breaks compilation (`\#` is
invalid; a raw `"` terminates the string and allows injection). (Fixed — P0-3.)

## What shipped (verified)

| Item | Commit | Verification |
|------|--------|--------------|
| **P0-1** atomic credit deduction via single CTE (`UPDATE ... WHERE balance >= amount` → `INSERT ... SELECT FROM deducted`), crash-consistent under Neon HTTP autocommit; pipeline throws `InsufficientCreditsError` rather than deliver an unbilled result; `hasCredits` honors unlimited tier | `16c087d` | 70 unit tests (incl. concurrency-race cases) + tsc + lint |
| **P0-3** `escapeTypstString` for all string-literal sites across the base generator **and all 6 industry templates** (the ones the pipeline actually renders); `escapeTypst` now escapes `[`/`]` | `16c087d` | Adversarial inputs (`"`, `\`, `#`, `$`, `]`, `C#`, emoji, CJK) compile to PDF across all 7 generators with the real `typst` binary |
| **P0-2 (partial)** web SSE replays a stored result on key reuse (closes the *sequential* reuse-with-different-input vector; free reconnect); client sends a stable per-intent `Idempotency-Key` (retry reuses, refine mints new); v1 `createJob` race-safe; homepage copy corrected | `75aec54` | 70 tests + tsc + lint + production build |

## Idempotency contract — CLOSED (P0-2b, commit `c337083`)

The three residual over-delivery vectors are now closed by one insight: **the
credit charge is keyed on the reserved `jobId`** (server-generated, per-user,
deleted with the job) — **not** the client `Idempotency-Key` — and the web path
**reserves a `generation_jobs` row before running**, unifying it with the v1 job
model. This needed **no risky live-DB constraint migration**.

| Vector | How it's closed |
|--------|-----------------|
| **Concurrent same-key (web)** | `reserveJob` claims the key with an atomic `onConflictDoNothing`; only the winner gets a runnable `jobId`, the rest get `in_progress` / `replay`. |
| **Delete-then-reuse** | Charge keys on `jobId` (gone on delete) → reusing the key makes a NEW job and re-charges instead of replaying the orphan txn. |
| **Cross-user key** | `reserveJob` / `createJob` resolve the existing row owner-scoped → another user's key → `conflict`, before any run or charge. |
| **Failed-job retry** | `reclaim` flips status out of `failed` atomically; a reclaimed run reuses the same `jobId` and dedupes the charge. |

Hardened by the review loop: the pipeline call is isolated so the *only* `failJob`
path is a genuine pipeline failure (a client disconnect can't mark a
charged+delivered job failed → no free re-run); history lists only `succeeded`
jobs; `DELETE` refuses non-terminal jobs via a single atomic conditional delete
(closing the check-then-delete TOCTOU). New `ConflictError` (409).

Tests: `src/server/jobs/reserveJob.test.ts` pins each reservation outcome;
`creditService.idempotent.test.ts` + `pipeline.test.ts` pin the charge gating.
Codex adversarial review: **SHIP**.

## Remaining roadmap (unchanged from the plan)
- **P0-4 — DONE** (commit `4a15dbc`): made `scripts/migrate.ts` self-contained (it
  silently depended on the removed `drizzle/` snapshots and would fail on a fresh
  DB); removed the stale `drizzle/*.sql`; added `npm run db:migrate`. Codex: SHIP.
- **P0-5 — DONE** (`4a15dbc`/`88f3351`): `sweepStaleRunningJobs()` reconciles
  crash-abandoned `queued`/`running` jobs (30m threshold), run opportunistically
  from the reserve paths. Codex: SHIP.
- **P1-1 — DONE** (`candidate_profiles`, "enter once, reuse across JDs"): new
  minimal `candidate_profiles` table (the canonical reusable background, NOT a
  revival of `resumes`); owner-scoped `/api/profiles` CRUD; `GenerateInput`
  gained an optional pre-parsed `baseResume` so generating from a profile reuses
  the stored parse and SKIPS `parse_background` (purely additive — the
  compile-then-charge, jobId-keyed money path is untouched); v1 `profile_id`
  parity; homepage profile selector + editor "Save as profile" + `/profiles`
  page. Codex adversarial review hardened it before SHIP: the profile-create/
  update LLM-parse endpoints are now rate-limited; client-supplied structured
  `data` was removed (server always parses, so an unbounded "base resume" can't
  be injected for one credit); `baseResume` is stripped from the
  `GET /api/resumes/[id]` response. Codex: **SHIP**.
- **P1-2 — DONE** (honest refine / continuous-improvement loop): a refine now
  shows a cost-disclosure dialog ("uses 1 credit, keeps the previous version")
  before running. Versions are an explicit chain — `generation_jobs.parent_job_id`
  + `root_job_id` (owner-scoped resolution in `reserveJob`; root = parent's root
  or the parent itself), surfaced by `GET /api/resumes/[id]/versions` and an
  editor version strip (switch to any prior version free). New free path:
  structured field editing (`StructuredEditor`) edits the parsed ResumeData and
  re-renders Typst/PDF entirely client-side — NO LLM, NO charge; only an LLM
  re-tailor (Refine) bills. Money path untouched: a refine is a NEW jobId / NEW
  key (deliberate new charge), never overwriting or re-charging the parent.
  Codex: **SHIP** (tightened parentJobId to a strict-UUID check per its note).
- **P1-3 — DONE** (AI agent workflow hardening): bounded retry + exponential
  backoff on the LLM steps (`runStep` in pipeline.ts), retrying ONLY classified
  retriable infra errors (timeout/429/5xx/dropped-conn) and never user/4xx
  errors — all pre-compile, so billing is untouched. The AI SDK's own retries
  are disabled (`maxRetries: 0` on all six agent calls) so the pipeline owns
  retry policy and the budget can't compound. Faithfulness now canonicalizes
  UNAMBIGUOUS skill abbreviations (ML↔Machine Learning, K8s↔Kubernetes, …) to
  cut false-positive re-tailors; deliberately ambiguous aliases (CV, AI) are
  excluded to avoid grounding a fabrication. New offline eval/golden set
  (`src/lib/agent/eval/golden-set.test.ts`) pins faithfulness, deterministic ATS
  coverage, and real-typst compile of adversarial chars (genuinely skipped when
  the binary is absent). Telemetry PII: recording raw prompt I/O (resume + JD)
  on spans is now OFF by default, gated behind `AI_TELEMETRY_RECORD_IO`
  (documented). Codex: **SHIP** (after fixing a false-green skip, retry
  compounding, and an ambiguous synonym).
- **P1-4 — DONE** (UX polish): homepage one-click starter examples (prefill JD +
  background); an editor "Parsed from your background" summary card (experience/
  education/projects/skills counts) that nudges the free Edit-fields path; honest
  pricing copy — unimplemented features (Application tracking, Priority AI
  responses, Bulk application support, Priority support) kept listed but badged
  "Coming soon" instead of over-promising. UI-only; no money path / DB change.
  Codex: **SHIP** (no findings).
- **P1 (remaining)** the pre-existing `getOrCreate` select-then-insert race.

## Working model
Claude implements; after each unit, Codex runs an adversarial `codex exec
--sandbox read-only` review of the diff; findings are verified (not blindly
accepted or rejected) before the next step. This ADR is the living record.
