# ADR 0004 — Evaluated the GPT-5.6 family and declined it

- **Status**: Accepted — **the generation pipeline stays on `gpt-5.4-mini-2026-03-17`
  + `gpt-5.5-2026-04-23`.** The tiering *infrastructure* built during the evaluation
  is kept; only the model swap is rejected.
- **Date**: 2026-07-31
- **Authors**: Claude Opus 5 (1M context) — planning, implementation, and the A/B
  evaluation, run across parallel subagents. (Unlike ADRs 0002/0003 there was no
  second-model review pass on this one; the adversarial role was played by the
  measurements, which overturned the author's own recommendation.)
- **Scope**: an A/B evaluation of the GPT-5.6 family (`sol`/`terra`/`luna`) against
  the incumbent models; the resulting decision not to migrate; a third `chat` tier
  for the edit agent (effort fix only, no model change); deploy-time override
  plumbing; and two production bugs the work uncovered.
- **Builds on**: [ADR 0001](0001-money-path-and-idempotency.md) (charge once, after
  compile) and [ADR 0002](0002-refinement-first-architecture.md). Nothing here
  touches the pipeline shape, the step count, or the single charge site.

## Context

Vitex charges one credit per successfully compiled resume, so per-generation model
cost is a direct margin line, and the surfaces that are **free** to the user
(refinement, the conversational edit agent) are pure cost. GPT-5.6 arrived with a
three-model lineup priced well below the incumbents — `sol` $5/$30, `terra` $2/$12,
`luna` $0.20/$1.20 per M tokens, against `gpt-5.5` at $5/$30 and `gpt-5.4-mini` at
$0.75/$4.50 — so the obvious move was to re-tier onto it. On paper a generation
would drop roughly 60%.

A second, unrelated problem was found while mapping the tiers: `runEditTurn`'s
`streamText` call passed **no** `providerOptions`, so it never emitted a
`reasoningEffort` and silently ran at OpenAI's *default* `medium` effort — on the
reason-tier model, in a loop that is free for the user and rate-limited at 30
turns/min. That is the highest unit cost in the repo, and it was invisible because
the tiering documentation only ever described two tiers.

We did not take the paper savings on faith. We ran the swap as a measured A/B.

## The evaluation

A harness ran the full generation pipeline over fixed fixtures, varying only the
model tier. Metrics: **reference ATS** (scored against a held-out reference, not
the badge shown to users), **highlight bullet count** (how much of the candidate's
experience survives into the resume), retention of a specific true fact
(`mentoring` — the candidate really did mentor two junior engineers), and measured
$/run.

`pmm` fixture:

| arm | n | reference ATS | highlight bullets | `mentoring` kept | $/run |
|---|---:|---:|---:|---:|---:|
| **A — 5.4-mini + 5.5 (incumbent)** | 4 | **84.3** | **17.3** | **4/4** | $0.1537 |
| B — luna + terra | 4 | 76.8 | 12.0 | **0/4** | $0.0570 |
| S — 5.4-mini + sol | 2 | 78.5 | 11.0 | 2/2 | $0.1456 |
| B-fix — terra + a retention-hardened prompt | 2 | 77.0 | 11.0 | **0/2** | $0.0536 |

`swe` fixture, reference ATS: **A = 82.0**, B = 79.0, S = 80.5.

### Mechanism: brevity is a family trait, and prompting does not fix it

The headline is not the ATS delta — it is the **highlight bullet count: 17.3 → 12.0
→ 11.0 → 11.0**. Every 5.6 arm compresses the resume by roughly a third, and
`sol` — the most expensive model in the family — writes just as short as the
cheapest. That rules out "we picked the wrong 5.6 model": **terseness is a family
characteristic, not a per-model defect.**

Nor is it a prompt problem. Arm B-fix re-ran terra with an explicitly
retention-hardened tailoring prompt, and terra was additionally probed at `low` and
`medium` effort. All three conditions converge on ≈77 reference ATS and 11 bullets.
The behavior is not steerable from our side.

**Why this is disqualifying for a resume product specifically.** The failure mode is
*not* fabrication — the deterministic faithfulness gate catches invented facts, and
it stayed green. It is **silent omission of things the candidate genuinely did**.
`mentoring` is the clean example: a true, verifiable fact, present in the input,
dropped in 4/4 terra runs (and 2/2 in B-fix). A resume generator that quietly
shortens your career is worse than one that fails loudly, because the user cannot
see what is missing.

## Decisions

### 1. Do not migrate the generation pipeline

Stay on `gpt-5.4-mini-2026-03-17` (extract) + `gpt-5.5-2026-04-23` (reason). The
~$0.097/run saving is real, and it is not worth 5+ points of reference ATS, a third
of the candidate's bullets, and the loss of true facts.

### 2. The "same-price generational upgrade" argument is wrong here

The most seductive version of this migration was: forget the cheap models, just
move `gpt-5.5 → gpt-5.6-sol`. Same price ($5/$30), newer generation — apparently a
free upgrade with nothing to weigh.

Arm S refutes it. Sol scored **78.5 vs 84.3** on `pmm` and **80.5 vs 82.0** on
`swe`, at 11.0 bullets vs 17.3, for $0.1456 vs $0.1537 — a 5% cost difference, i.e.
noise. So this was never a "cost vs quality" trade-off to be balanced. **At equal
price there is no upside to weigh against the downside** — the trade is strictly
negative, and the intuition that a newer generation at the same price must be at
least as good is simply false here.

### 3. Do not move the extract tier to luna either

Even holding the reason tier fixed, swapping only `parse_jd` onto luna was rejected:

- **The saving is trivial**: $0.0024/run, **1.6% of total generation cost**. JD
  parsing is a small fraction of the token spend.
- **The user-visible damage is not.** Luna extracts 15–20% more keywords from the
  same JD, which inflates the denominator of the ATS badge: on `swe` the badge fell
  from **50.0 to 36.5** with **no change whatsoever in resume quality** — the same
  resume, scored against a bigger keyword set. Users would read a 13-point drop as
  their resume getting worse.
- **Arm S is the control that isolates this**: holding extract on 5.4-mini, the
  badge read 51.0 vs the 50.0 baseline — zero displacement. So the badge movement is
  attributable to the extract model, not to run-to-run variance.

### 4. Keep the `chat` tier — fix the effort, not the model

The third tier stays, with `AI_MODEL_CHAT` defaulting to the **same** model as the
reason tier (`gpt-5.5-2026-04-23`). What changes is that the edit-agent loop now
sends an explicit `reasoningEffort: 'low'` instead of inheriting OpenAI's default
`medium`. Reasoning tokens bill as output at $30/M, so this is a real reduction on
the repo's only free, un-metered LLM surface — with no model change and therefore
none of the quality risk measured above. (The A/B harness covered the generation
pipeline, not the chat loop, so this is a directional cost argument, not a measured
one.)

The tier also exists as a *seam*: if a cheaper chat model is ever validated, it is
one constant — or one GitHub variable — away.

### 5. Extract effort stays `none`

`minimal` is not a legal value on any model we run (see "Incident 1"). `none` is the
floor, and it has a bonus: it is the one effort at which `@ai-sdk/openai` actually
forwards a `temperature`, so `AI_TEMPERATURE_EXTRACT=0` is live and JD parsing keeps
its intended determinism — which is the assumption the JD parse cache is built on.

### 6. Data sharing stays on — but the free-allowance argument is dead

Part of the original case for terra/luna was OpenAI's input/output sharing program:
those models sit in the group covered by a free daily token allowance (10M/day for
the group, 2.5M/day at our usage tier), so sharing would have subsidised a large
share of generation cost.

**That argument is void under the decision above.** The free-token group covers
terra/luna/5-mini/5-nano/4.1-mini/4o-mini and the o-series — **not**
`gpt-5.4-mini-2026-03-17` and **not** `gpt-5.5-2026-04-23`, the two models we
actually run. Sharing buys us nothing at the current tiering. It must not be
cited as support for a future migration either: it is a reason to prefer a
specific *model group*, and this evaluation found that group's output quality
unacceptable for a resume product. Cheap tokens for worse resumes is not a trade.

Enrolment nonetheless **remains on**, by the operator's explicit choice. The
consequence is unchanged and is the part that matters: the prompts we send and the
completions we receive — a candidate's resume, name, email address, phone number,
employment and education history — are shared with OpenAI and used to train their
models. `src/app/privacy/page.tsx` discloses this in plain words, and it now also
states that the allowance does not apply to the models we run, so no reader can
infer that their data is buying them a cheaper service. **A privacy policy that
states a false reason is worse than one that states no reason** — do not
reintroduce the "it keeps generation cheap" framing, and do not soften the
disclosure itself.

## What we keep (the evaluation was not wasted)

None of the following depends on which model is selected, and all of it survives the
"no" decision:

- **The three-tier factory** in `models.ts` (`makeTier`): each tier is one
  (model id + effort) pair with its own env override, its own sampling/reasoning
  fragments, and a fingerprint. Adding or re-cutting a tier is a one-line change.
- **Deploy-time variable injection** (`.github/workflows/deploy.yml`): all eight
  knobs — three `AI_MODEL_*`, three `AI_REASONING_EFFORT_*`, two `AI_TEMPERATURE_*`
  — now flow from GitHub repository **variables** into the container. Before this,
  production only ever received `OPENAI_API_KEY`, so **changing a model required a
  code change and a full redeploy**. It is now a variable edit. That is the single
  most valuable artifact of this round: the *next* model evaluation, whenever 5.7 or
  a fixed 5.6 arrives, costs a variable flip instead of a PR.
  (Unset renders as an empty string, which is safe: `set -e` without `set -u`, and
  every reader in `models.ts` falls back on falsy input — `||` for ids, `if (!raw)`
  for temperatures, an allowlist test for efforts.)
- **43 new tests**, including a literal assertion of the default model ids (the SDK's
  model-id type ends in `(string & {})`, so a typo is *not* a type error), the
  effort allowlist, provider-contract tests against `MockLanguageModelV3`, and a
  drift test tying `.env.example` to the code defaults.
- **`jdParseCache` salted with the tier fingerprint** (`<id>@<effort>`) instead of a
  bare model id, so retuning either the model *or* the effort invalidates the cache
  immediately rather than serving pre-change parses for up to an hour.
- **`matching-engine` aligned on `strictJsonSchema: false`** — see "Incident 2".

## Incident 1: `minimal` effort had been 400-ing every generation since 2026-07-07

**Symptom.** Every call carrying `reasoningEffort: 'minimal'` is rejected by the
OpenAI Responses API with a hard 400. Measured directly against the API:

| model | `minimal` | `none` | `low` |
|---|---|---|---|
| `gpt-5.4-mini-2026-03-17` | **400** | 200 | 200 |
| `gpt-5.5-2026-04-23` | **400** | 200 | 200 |
| `gpt-5.6-luna` | **400** | 200 | 200 |
| `gpt-5.6-terra` | **400** | 200 | 200 |

The error lists the legal set: `none/low/medium/high/xhigh` for gpt-5.4-mini, plus
`max` for gpt-5.6. **No model we run accepts `minimal`.**

**Root cause — three conditions, none sufficient alone:**

1. Our `ALLOWED_EFFORTS` allowlist admitted `minimal`, a value the API does not
   accept. It validated *shape* and was trusted as if it validated *legality*.
2. `@ai-sdk/openai` neither normalizes nor validates the effort — it forwards the
   string verbatim. Nothing sits between our allowlist and the 400.
3. The extract tier's code **default** was `minimal`, and `deploy.yml` injected no
   `AI_*` variables at all, so production ran the code default unconditionally.
   No env override could have masked or fixed it in place.

Net effect: `parse_jd` — **step 1 of the 8-step generation pipeline** — 400'd on
every generation from commit `4711ad7` (2026-07-07, "add per-tier reasoning-effort
control") onward. Reproduced end to end.

**Why it survived three weeks undetected — the part worth internalizing.** This
repo's standing cheap-verification trick is "run a free refine": it exercises the
real `generateObject` path against a live model at no credit cost, so it has been
the sanctioned way to prove the LLM path after an SDK or model change. That trick
has a structural blind spot: **a refine never calls `parse_jd`.** It reads
`parsedJD` off the parent job's persisted result and only re-parses for legacy jobs
stored before `parsedJD` persistence; the edit agent does not touch that step
either. So the entire extract tier sat outside the one verification routine we
habitually ran, while the unit tests inject fakes for every agent and never issue a
real API call. Every layer was green while step 1 was dead.

**Defenses:** `minimal` is removed from `ALLOWED_EFFORTS` and from the
`ReasoningEffort` type; the extract default is `none`; a test asserts every tier's
default effort is a member of the set the API actually accepts. `max` is likewise
removed — it is gpt-5.6-only, and we do not run gpt-5.6. `.env.example` states that
legality is per-model and that a bad value is a 400, not a warning. The process fix
lives in CLAUDE.md's Testing section: **a free refine is not a sufficient smoke test
of the extract tier.**

## Incident 2: `analyzeMatch` was missing `strictJsonSchema: false`

`analyzeMatch` (step 3) was the only one of the seven `generateObject` call sites
that did not pass `strictJsonSchema: false`, while `matchAnalysisSchema` carries
numeric `min`/`max` bounds — constraints OpenAI's strict structured-output mode
rejects. The six other sites had the flag; this one had drifted. Fixed by aligning
it with the rest.

The pattern is the same as Incident 1 and worth naming: **an option that must be
present at every call site, enforced only by copy-paste, will eventually be missing
at one of them.** Both bugs are of that shape.

## Consequences & invariants

- **No pipeline or billing change.** Same 8 generation steps, same 4 refine steps,
  same single charge site after compile. Refine and edits stay free.
- **`models.ts` remains the single source of truth for defaults.** `CLAUDE.md` and
  `.env.example` mirror it and can drift; the drift test now pins the three
  `AI_MODEL_*` lines in `.env.example` to the code defaults.
- **Model ids are now operationally changeable.** Prefer flipping the GitHub
  variable over editing the default: the default is the documented baseline, the
  variable is the lever.
- **A cheaper model is not a free lunch, and this is now the documented precedent.**
  Any future proposal to move the reason tier must clear the same bar: reference
  ATS, highlight bullet count, and retention of true facts on both fixtures — not a
  price table.

## Validity of the evaluation — stated plainly

- Arms S and B-fix have **n = 2**. "No evidence that sol clears the bar" is not the
  same claim as "proven that sol fails." With that sample size the ATS figures alone
  would not carry a decision.
- What does carry it is the **mechanistic** evidence, which is consistent across all
  four arms and both fixtures: the bullet count collapses to 11–12 for every 5.6
  configuration regardless of price tier, effort level, or prompt hardening. That
  signal is far more stable than the ATS scores, and it points at a family trait
  rather than sampling noise.
- The fixtures are two synthetic candidate profiles (`pmm`, `swe`). They are not a
  representative sample of real users.
- **Known cost of re-evaluating later: gpt-5.6 ships no dated snapshots.** `GET
  /v1/models` lists only `gpt-5.6-sol` / `-terra` / `-luna` — floating aliases whose
  weights OpenAI can change with no version bump and no notice. So today's "no" has
  a shelf life in both directions: the models may improve without announcement, and
  a future re-test must be re-run rather than reasoned from this ADR. Re-running the
  harness is the only way to know.

## Deferred

- **A standing quality regression suite.** The A/B harness is re-runnable but
  manual; nothing runs it on a schedule.
- **Re-evaluating 5.6 (or 5.7) later.** The cost of doing so is now a variable flip
  plus a harness run, which is the point of keeping the infrastructure.
- **A cheaper chat-tier model**, if one is ever validated against the edit loop
  specifically — the tier and its env var already exist.
