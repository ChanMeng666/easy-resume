# ADR 0002 — Refinement-first architecture

- **Status**: Accepted — **shipped & merged** (PRs #32–#48), deployed to the
  DigitalOcean VPS and regression-passed 2026-07-03.
- **Date**: 2026-07-03
- **Authors**: Claude — Opus 4.8 (implementation) × Fable 5 (review/verification)
- **Scope**: Targeted copy-refinement core, scope model, free-by-default billing,
  deterministic ATS, JD-parse cache, job concurrency, edit-agent cover letters,
  never-invent schema relaxation, ops/CI.
- **Supersedes/extends**: [ADR 0001](0001-money-path-and-idempotency.md) — the
  charge-once-after-compile and jobId-keyed idempotency invariants carry forward
  unchanged; this ADR adds a second pipeline behind them.

## Context

The production loop is not "generate once". Users iterate on wording — "make the
summary tighter", "lead with leadership", "match their tone". Under ADR 0001 that
loop was a P1-2 **refine that re-ran the full 8-step generation pipeline and
deliberately charged 1 credit** (a new jobId in the version chain). That was
honest but wrong-shaped for the actual behaviour:

- The resume is *already* tailored to the JD and the artifacts already exist;
  re-parsing the JD, re-parsing the background, re-analysing the match, and
  re-selecting a template on every wording nudge is wasted latency and cost.
- Charging a credit per nudge makes "refine" feel like "regenerate", discouraging
  the very iteration that produces a good resume. A paid generation already bought
  the first PDF.

Two smaller findings compounded this. The pipeline's **step-5 ATS score was an
LLM call whose entire output was discarded** — once a JD is present (always, in
the pipeline) the headline score was overridden by deterministic keyword
coverage, so the LLM report was pure latency + cost + a schema to maintain. And
the background parser occasionally produced a truthful "I don't know this date"
that **failed `resumeDataSchema`** (non-empty string constraints), turning an
honest unknown into a hard error.

## Decisions

### A dedicated refinement core, not a re-run
`src/server/core/refine.ts` (`runRefinementPipeline`) operates on a completed
parent job's stored artifacts + first-class sanitized `feedback` (1..8000) + an
explicit `scope`, and runs **4 steps**: revise → deterministic ATS re-score →
render → compile. It returns the same `GenerateResult` shape as a full
generation, so transports and persistence handle both identically. The
retry/backoff + typed-error machinery is **extracted verbatim** into
`src/server/core/step.ts` (`makeStepRunner`) and shared by both pipelines so they
never drift.

### The scope model
`scope ∈ 'resume' | 'cover_letter' | 'both'` (default `'resume'`). The revise
step is ONE parallel reason-tier wave: `reviseResume` ∥ `reviseCoverLetter`, each
a **minimal-diff** agent, each skipped (passed through byte-for-byte) when out of
scope. The letter revision deliberately grounds on the **original** resume: both
sides run concurrently, so the revised resume isn't available yet, and grounding
on the stable base is the correct choice. The resume side passes a deterministic
**faithfulness gate**; a violation triggers exactly one corrective revise pass
(mirroring the generation loop) so a revision can't silently invent skills or
employers.

### Free by default, but the charge path is real
Refinement is **FREE** behind `export const REFINE_COST_CREDITS = 0`. The full
charge path — a mirror of the generation charge site, kind `resume_refinement`,
keyed on the reserved jobId, gated on a pre-flight `hasCredits` check and
refusing delivery if the atomic charge loses a race — is implemented and unit
tested behind the constant (tests drive it via a `costCredits` dep override).
Flipping the constant to `1` starts charging with no other change. This keeps
ADR 0001's **charge-once-after-compile** invariant literally true: the refine
charge is a *guarded sibling* of the sole generation charge site, and it is
reached only after a successful compile, so a failed refine is always free.

### parsedJD persistence — refine-of-refine never re-parses
`GenerateResult` now carries `parsedJD`, persisted via `toWireResult`. A refine
reads it from the parent artifacts, so a chain of refinements parses the JD
exactly once. `buildRefineArtifacts` (`src/server/jobs/refineArtifacts.ts`) is
the single pure mapping from a parent row's stored input+result to
`RefineArtifacts`, tolerant of **old rows** that predate parsedJD /
coverLetter / templateId persistence — a missing parsedJD is re-parsed once,
folded into the revise step (still 4 progress events).

### v1 parity ("the API is the UI")
Both transports run the same core: `POST /api/refine` (web SSE, mirrors
`/api/generate`'s events) and `POST /api/v1/resumes/{id}/refine` (agent-facing
async 202 job). The shared job runner dispatches refine-shaped stored inputs via
`isRefineInput`; v1 `createJob` became a thin adapter over the shared
`reserveJob`, and the failed-key **reclaim-and-re-run** semantics are identical
to generation (documented in `docs/api/v1.md`).

### Deterministic ATS (delete the discarded LLM)
Step 5 is now pure `scoreATSDeterministic` (keyword coverage, `keyword-coverage.ts`).
`atsReportSchema` / `ATSReport` and prompt id `score-ats` were deleted. Downstream
behaviour is unchanged because the deterministic score is exactly the value the
LLM output was already being overridden with.

### JD-parse cache + bounded job concurrency
`withJdParseCache` (`src/server/core/jdParseCache.ts`) wraps
`parseJobDescription` at the `deps.ts` seam: a `sha256(model + prompt-version +
JD)` key, 200 entries, 1h TTL, clone-on-store/hit. It is **cross-user by design**
— no caller data enters the parse prompt, so a hit can't leak another user's
data. `createSemaphore` (`src/server/jobs/concurrency.ts`) is a dependency-free
FIFO cap (`JOB_CONCURRENCY`, default 2) on in-flight background jobs; excess jobs
wait as `queued`, which is exactly what pollers should see, and bounds concurrent
LLM chains + `typst` subprocesses on the single VPS.

### Edit-agent cover letters + context cost
The conversational edit agent gained cover-letter tools
(`rewriteCoverLetterParagraph` / `setCoverLetterText` / `previewCoverLetter`),
independent letter tracking in `EditContext`, a `cover-letter` SSE event, and
letter-aware version snapshots (old snapshots stay valid). Token streaming moved
`generateText` → `streamText` with `onChunk` deltas and `onError` rethrow.
Context cost dropped: the system prompt embeds a compact tool-editable
projection (`buildResumeProjection`) instead of the full ResumeData, history
replay is windowed to the last 30 text turns (`tailHistoryWindow`), and per-thread
snapshot GC keeps the newest 3 assistant blobs (`gcThreadSnapshots`). Prompt id
`edit-agent` → v3. Editing stays FREE.

### Never-invent schema relaxation
`resumeDataSchema` now tolerates empty strings on the fields the AI must never
invent (education `startDate`/`endDate`/`location`; work
`startDate`/`endDate`/`location`/`type`; project `description`), and the
`parse-background` prompt (v2) states the rule. A truthful "unknown" no longer
fails validation, so the parser is not pressured into fabricating a plausible
value to satisfy the schema.

## Consequences & invariants

- **Billing invariants (ADR 0001) hold.** One charge site per pipeline, both
  after compile; the refine site is off (constant = 0); edit-agent turns and
  manual version saves never charge. No unbilled delivery; jobId-keyed
  idempotency and the version chain (`parent_job_id`/`root_job_id`) are unchanged
  — a refine is a new job in the parent's chain.
- **Ops learning — `Promise.all` step attribution.** The parallel revise wave (and
  the generation pipeline's parallel pairs) means a rejection surfaces without a
  clean 1:1 step label; each side is wrapped in its own `runStep(step, …)` so the
  thrown `PipelineStepError` still carries the right `step`, and `promptVersions`
  records ONLY the steps that actually executed (`executedPromptVersions`) so
  attribution never credits a skipped or short-circuited step.
- **Ops learning — logger cause chain.** Wrapping errors (`PipelineStepError(step,
  msg, cause)`) hid the root cause in logs until the logger was taught to
  serialize the `err.cause` chain (depth-capped, PR #48). Structured logs now
  show the full chain, which is what makes a failed background job debuggable
  from `logs.yml` alone.
- **Cache correctness.** The JD cache is cross-user only because the parse prompt
  is a pure function of public JD text + model + prompt version; any future change
  that routes caller data into that prompt MUST re-key or drop the cache.
- **CI/ops.** `.github/workflows/ci.yml` runs the full gate on PRs and master
  pushes (`npm ci --legacy-peer-deps`, matching the Dockerfile; placeholder env
  incl. a v4-shaped Stack UUID); `deploy.yml` is gated on a checks job; a
  `logs.yml` `workflow_dispatch` tails prod container logs over SSH. Removed the
  unused `openai` dep and `vercel.json`; moved `drizzle-kit` to devDeps.

## What shipped (PRs #32–#48; each codex-reviewed to SHIP, gate green)

| Area | Summary |
|------|---------|
| Refinement core | `refine.ts` (4 steps, scope model, faithfulness gate + one corrective pass, free behind `REFINE_COST_CREDITS`), `step.ts` (shared runner), `refineArtifacts.ts` (old-row tolerance), reviser agents. |
| Transports | `POST /api/refine` (web SSE, version chain) + `POST /api/v1/resumes/{id}/refine` (async job, shared runner dispatch); editor scope chips + 4-step gallery, no cost dialog. |
| Pipeline/perf | Deleted the step-5 ATS LLM (deterministic only); `parsedJD` persisted on the result; `jdParseCache.ts`; `concurrency.ts` FIFO semaphore (`JOB_CONCURRENCY`); v1 `createJob` → thin `reserveJob` adapter. |
| Edit agent | Cover-letter tools, single-bullet tools, `streamText` token streaming, `buildResumeProjection` + `tailHistoryWindow`, snapshot GC, letter-aware manual versions; prompt `edit-agent` v3. |
| Validation (#46) | `resumeDataSchema` never-invent fields tolerate empty strings; `parse-background` v2. |
| Ops (#47/#48 + CI) | `ci.yml`, `logs.yml`, deploy gated on checks; logger `err.cause` serialization; removed `openai` dep + `vercel.json`; drizzle-kit → devDeps. |

## Working model
Claude implements; after each unit, Codex runs an adversarial read-only review of
the diff; findings are verified (not blindly accepted or rejected) before the next
step. This ADR is the living record for the refinement-first phase.
