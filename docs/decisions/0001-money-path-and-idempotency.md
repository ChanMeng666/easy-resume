# ADR 0001 — Money-path correctness, Typst safety, and the idempotency contract

- **Status**: Accepted (P0-1, P0-3 shipped; P0-2 partially shipped; reservation + per-user scope pending)
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

## Open: the idempotency contract is not fully closed

Codex's adversarial review confirmed residual vectors. These are **pre-existing**
(P0-2 improved on baseline, regressed nothing) and require a focused redesign of
the money-path table semantics — to be done carefully against a real DB, not
rushed. Concrete attack sequences to defeat:

1. **Concurrent same-key over-delivery (web).** Two simultaneous `/api/generate`
   with the same key both pass the "succeeded job?" check (none yet), both run,
   the charge dedupes to one, but **both deliver**. Root cause: the web path has
   no *in-flight reservation* (v1 reserves a job row up front; the web path runs
   immediately and persists after).
2. **Delete/persist-failure then key-reuse.** The usage txn outlives its job, so
   replaying a key whose `generation_jobs` row is gone (deleted, or persist
   failed) re-runs the pipeline; the charge dedupes on the orphan txn →
   `charged:true` → a free result.
3. **Cross-user / global key scope (security).** The usage unique index is global
   on `reference_id`. User B reusing user A's chosen key sees A's txn → charged
   `true` without debiting B → free result across accounts via the public API.

### Resolution plan (next task — P0-2b)
- **Per-user idempotency scope.** Change the partial unique index to
  `(user_id, reference_id) WHERE type='usage'` (idempotent DDL in
  `scripts/migrate.ts`, with a dedup pass), and scope the prior-txn lookup +
  23505 winner-lookup in `useCreditsIdempotent` by `userId`. Also scope
  `generation_jobs.idempotencyKey` uniqueness/lookups per user. Closes (3).
- **Up-front reservation on the web path.** Reserve a `generation_jobs` row
  (status `running`) keyed by `(user_id, idempotencyKey)` *before* running, then
  update it to `succeeded` after. A concurrent same-key request that finds a
  `running` row returns 409 / waits; a `succeeded` row replays. Unifies the web
  path with v1 and closes (1). For (2), tie "already delivered" to the live
  reservation row (not the standalone txn), or have `DELETE` invalidate the key.
- Add money-path tests for each sequence above before shipping.

Severity note: (1) and (2) require deliberate API abuse by an authenticated
caller and are rate-limited (15/min web, 30/min v1); (3) is the most serious
(cross-account) and should lead P0-2b.

## Remaining roadmap (unchanged from the plan)
- **P0-4** migration source-of-truth drift (`scripts/migrate.ts` is authoritative
  and already contains the credit/index DDL; `drizzle/*.sql` is stale — reconcile
  or document).
- **P0-5** stale-`running` job sweeper (process restart leaves v1 jobs stuck).
- **P1** `candidate_profiles` (background once, reuse many); honest refine
  (cost disclosure, version retention, free structured-edit re-render); agent
  hardening (LLM retry/backoff, faithfulness beyond substring, eval/golden set,
  telemetry PII policy); UX (onboarding/examples, parsed-data confirmation,
  pricing copy). Also fix the pre-existing `getOrCreate` select-then-insert race.

## Working model
Claude implements; after each unit, Codex runs an adversarial `codex exec
--sandbox read-only` review of the diff; findings are verified (not blindly
accepted or rejected) before the next step. This ADR is the living record.
