# ADR 0001 — Money-path correctness, Typst safety, and the idempotency contract

- **Status**: Accepted — **P0 + P1 + P2 shipped & merged**; **P2-1** (conversational
  tool-using edit agent) implemented as three stacked codex-SHIP'd PRs (#26 → #27 →
  #28; see "P2-1" below).
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
- **P1 cleanup — DONE**: fixed the pre-existing `creditService.getOrCreate`
  select-then-insert race (two concurrent first-requests for a new user could
  both insert → loser threw 23505 AND the signup bonus could be granted twice).
  Now an atomic `INSERT ... ON CONFLICT (user_id) DO NOTHING RETURNING`: only the
  winner grants the one-time bonus, the loser/duplicate reads the row back (no
  throw, no double bonus). Codex: **SHIP**.

**P1 is COMPLETE** — all sub-tasks shipped (each codex-reviewed to SHIP):
candidate_profiles (PR #15), honest refine (#20), agent hardening (#17), UX
polish (#18), and the getOrCreate race cleanup (#19). The candidate_profiles
schema migration (new `candidate_profiles` table + `generation_jobs.profile_id`)
was applied to the production DB via `npm run db:migrate`.

## P2 — Activating dormant capabilities

P2 is the "activate the dormant tables / latent capability" phase. The opening
thesis of this ADR (don't revive the half-finished second data model wholesale)
still holds: P2 adds CRUD/API/UI on tables that already exist, or extends the
live `generation_jobs` model — it does **not** resurrect the dead `resumes`
lineage. Scope this round was three units; the flagship P2-1 conversational
tool-using agent followed in its own round (see "P2-1" below). Each is its own
branch + PR, gate-green, codex-reviewed to SHIP; the two schema units were
migrated to prod and verified against `information_schema`.

### Decisions
- **`resume_versions` stays dormant (P2-3).** It FKs the dead `resumes` table, so
  activating it would be a redundant version model + migration debt. The version
  story is instead built on the existing `generation_jobs` refine chain
  (`parent_job_id`/`root_job_id`), which already powers the editor version strip.
- **`applications` links to the LIVE model (P2-2).** The table's
  `tailored_resume_id`/`job_description_id` FKs point at dormant tables; rather
  than revive those, a new nullable `generation_job_id` FK ties an application to
  a real generated resume. The dead FKs stay (nullable, unwritten).
- **Manual versions never bill (P2-3).** Persisting a free structured edit writes
  a `generation_jobs` row with `charged=false`, a fresh random idempotency key,
  and re-renders Typst server-side — with NO `meter`/pipeline call. It is pure
  user-owned storage (like "save as profile"); the money invariant is untouched
  (the only charge remains the post-compile, jobId-keyed call in the pipeline).
- **Prompt versioning is lightweight (P2-4).** A typed registry + telemetry span
  metadata + an attribution snapshot recorded on the result (executed steps
  only) — no A/B routing framework, no DB migration.

### What shipped (each codex-reviewed to SHIP; gate green)

| Unit | PR | Summary | Schema / prod migration |
|------|----|---------|--------------------------|
| **P2-2** Application tracker | #22 | Owner-scoped `/api/applications` CRUD + status state machine (`draft→applied→interview→offer/rejected`) + Neobrutalism `/applications` page + Navbar + "Track" on My Resumes; pricing "Application tracking" un-flagged from Coming soon. No billing. | `applications.generation_job_id` (nullable FK → `generation_jobs`, `ON DELETE SET NULL`) + index. Applied to prod, `information_schema`-verified. |
| **P2-3** Version-chain enhancement | #23 | (1) Version naming/rename (`version_label` + PATCH + inline editor rename); (2) read-only side-by-side compare (`/versions/compare`, owner-checks both); (3) persist a free structured edit as a NEW uncharged version (`createManualVersion`, server-side re-render, requires a succeeded parent, bounded payload). | `generation_jobs.version_label` (nullable TEXT). Applied to prod, `information_schema`-verified. |
| **P2-4** Prompt version registry | #24 | Central `prompt-registry.ts` (typed `PROMPT_VERSIONS`); `aiTelemetry(functionId, { promptVersion })` (functionId typed to the registry → compile-time no-drift; metadata non-PII); all 6 agent steps tagged; `GenerationResult.promptVersions` records the EXECUTED steps (saved-profile path excludes `parse_background`), persisted via `toWireResult`; eval asserts registry coverage. | None (additive `result` JSONB field). |

Codex adversarial review hardened each before SHIP: P2-2 (DELETE rate-limit,
list cap, UUID-guard → NotFound not 500, invalid-status, zero-row update race);
P2-3 (require a *succeeded* parent so a manual version can't corrupt the chain;
bound the manual payload incl. nested arrays to close a render-cost vector);
P2-4 (record only executed prompt versions so the skipped-`parse_background`
path isn't mis-attributed; narrow the telemetry metadata type so PII can't be
routed through it).

## P2-1 — Conversational tool-using edit agent

The flagship P2 item, deferred to its own round and now built. It upgrades the
fixed 8-step pipeline into a **multi-turn conversational editor**: the user opens a
generated resume and edits it in natural language ("emphasize leadership in my
second job", "add a DevOps skill category"), an LLM calls a set of **controlled,
structured tools** that mutate the parsed `ResumeData`, and the resume is
**deterministically re-rendered** (Typst → PDF) after each edit so the change is
visible live. It activates the dormant `agent_threads` / `agent_messages` tables.

### Decisions (user-approved)
- **Conversational editing is FREE.** No charge for chat turns or re-renders — the
  LLM here is a *tool*, and "sell results, not tools" means tools are free. The sole
  charge site stays the post-compile call in `runGenerationPipeline`; the chat path
  imports no meter/credit/pipeline. Abuse is bounded by auth + per-user rate limit
  (`chat:` 30/min) + a bounded tool loop (`stopWhen: stepCountIs`, clamped) +
  `maxRetries: 0`. "Save as version" reuses the existing free `createManualVersion`
  (`charged: false`). This is consistent with the P1/P2-3 free structured-edit path.
- **Thread anchors to the LIVE model.** `agent_threads.generation_job_id` (nullable
  FK → `generation_jobs`, `ON DELETE SET NULL`) ties a conversation to the resume it
  edits; the dead `resume_id` FK stays unwritten (same pattern as P2-2's
  `applications.generation_job_id`). The working `ResumeData` lives on each assistant
  message's `tool_result` (a reopen restores the latest snapshot, falling back to the
  anchor job's baseline).
- **Conservative, structured-only tool set.** Tools edit specific `ResumeData`
  fields only (summary, work/project highlights, skill categories, basics
  label/name/location — never email/phone). No tool accepts free-text
  Typst/HTML/URL/path, so there is no Typst-injection / SSRF surface. Inputs are
  zod-validated + `sanitizeDeep`'d; every committed edit is bounded by the
  `manualVersionCreateSchema` render-DoS caps; the system prompt embeds the
  *sanitized* resume and treats resume + user text as data, not instructions.
- **Transport-agnostic, DI core.** `runEditTurn` (AI SDK v6 `generateText` loop)
  lives in `src/server/agent/`, fake-model-injectable so the money-path guard (meter
  never called), edit application, bounds rejection, and step cap are unit-tested
  with no network/DB. The SSE route is a thin caller mirroring `/api/generate`.

### Money / correctness invariants preserved
No new charge point; no `succeeded generation_jobs` write from the chat path. All
thread/message reads/writes are owner-scoped → NotFound for non-owners; route ids
UUID-guarded. Turn persistence is atomic (single multi-row insert) with a unique
`(thread_id, sequence_num)` index and **optimistic concurrency** (`expectedBaseSeq`,
read before the snapshot) so a racing turn gets a retriable `ConflictError` instead
of silently overwriting a concurrent edit. Streamed edits are a client-side **draft**
committed to the saveable resume only after the turn persists (`saved`); a
failed/aborted turn reverts and is never saveable.

### What shipped (each codex-reviewed to SHIP; gate green)

| Unit | PR | Summary | Schema / prod migration |
|------|----|---------|--------------------------|
| **P2-1.1** Persistence + anchoring | #26 | Owner-scoped `agent_threads`/`agent_messages` store; `GET`/`POST /api/threads` + `GET /api/threads/[id]`. | `agent_threads.generation_job_id` FK + index; `agent_messages (thread_id, sequence_num)` made UNIQUE; partial UNIQUE on active `(user_id, generation_job_id)`. Applied to prod + `information_schema`-verified. |
| **P2-1.2** Tool-loop core | #27 | `buildEditTools` (conservative set, zod + sanitize + bounds) + `runEditTurn` (DI, bounded loop, telemetry); prompt-registry `'edit-agent'`. Fake-injected tests. | None. |
| **P2-1.3** SSE route + chat UI | #28 | `POST /api/threads/[id]/messages` (SSE turn, optimistic concurrency) + `/resumes/[id]/assistant` chat page (live PDF) + "Edit with AI" entry + "Save as version". | None (additive `snapshot` field on the GET response). |

Codex adversarial review hardened each before SHIP (5 rounds on #26: append
atomicity, thread idempotency, turn write-bounds, byte-accurate caps, snapshot read
rigor; 2 on #27: commit-before-render, preview re-injection, dropped tool-errors,
unclamped maxSteps; 4 on #28: concurrent-turn lost-update + read ordering,
persist-failure signalling, failed-turn saveability, body-size guard, baseSeq
under-report, ConflictError retriable).

## Working model
Claude implements; after each unit, Codex runs an adversarial `codex exec
--sandbox read-only` review of the diff; findings are verified (not blindly
accepted or rejected) before the next step. This ADR is the living record.
