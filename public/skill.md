# Vitex agent skill — generate a tailored resume with curl

This is a provider-agnostic playbook that teaches **any** agent (Claude, ChatGPT,
Cursor, or your own) to drive Vitex end to end over HTTP. Vitex compiles a
tailored, ATS-optimized resume PDF and cover letter from a job description plus a
candidate background.

**Career as Code:** the candidate background is source code, each resume PDF is a
build artifact compiled on demand for one job description, and refinements form a
commit-style version chain. You pay only for a successful build.

- Base URL: `https://www.vitex.org.nz`
- Auth: `Authorization: Bearer vitex_<prefix>_<secret>` on every request
- Full reference: `https://www.vitex.org.nz/openapi.yaml` and
  [`docs/api/v1.md`](https://github.com/ChanMeng666/easy-resume/blob/master/docs/api/v1.md)

---

## 0. Prerequisite (one-time, human-in-the-loop)

Minting an API key is **cookie-session only** (`POST /api/keys` is not reachable
with a Bearer token), so the human must do it once in the browser:

1. Sign in at `https://www.vitex.org.nz`.
2. Open the dashboard and create an API key.
3. Copy the raw token — it is shown **once** and only its SHA-256 hash is stored.

Then set it in your shell:

```bash
export VITEX_BASE="https://www.vitex.org.nz"
export VITEX_KEY="vitex_xxx_yyy"        # the raw token from step 3
```

New accounts start with **3 free credits**.

---

## 1. (Optional) Save a reusable background — "enter once, reuse across JDs"

Create a profile so you can tailor many resumes without re-pasting the background.
Parsing happens server-side and is **free** (no PDF → no charge).

```bash
curl -sS -X POST "$VITEX_BASE/api/profiles" \
  -H "Authorization: Bearer $VITEX_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "My Background",
    "rawBackground": "8 years building payment systems at Acme and Globex. Led a team of 5. Go, TypeScript, Postgres, Stripe.",
    "voiceSample": "Optional: paste a paragraph you wrote so cover letters match your voice."
  }'
# -> 201 { "id": "<profileId>", "label": "...", "createdAt": "...", "updatedAt": "..." }
```

Save the `id` as `PROFILE_ID`. List profiles anytime with
`GET $VITEX_BASE/api/profiles`.

A profile can also be **published** (`POST /api/profiles/{id}/publish` → `{ slug, url }`) to a public, agent-readable endpoint at `$VITEX_BASE/p/{slug}` (with `/json` and `/md` twins) that serves an allowlist projection — never email/phone/photo.

---

## 2. Create a generation job

Provide `jobDescription` plus **either** an inline `background` **or** a saved
`profile_id`. Send an `Idempotency-Key` (a UUID) so a retry never creates a
second job or a second charge.

```bash
IDEM=$(uuidgen)   # any UUID

curl -sS -X POST "$VITEX_BASE/api/v1/resumes" \
  -H "Authorization: Bearer $VITEX_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEM" \
  -d '{
    "jobDescription": "Senior Backend Engineer at a fintech. Go, distributed systems, payments...",
    "background": "8 years building payment systems. Go, TypeScript, Postgres, Stripe."
  }'
# -> 202 { "id": "<jobId>", "status": "queued", "_links": { "self": "...", "pdf": "..." } }
```

To use a saved profile instead of an inline background, swap the body for:

```json
{ "jobDescription": "Senior Backend Engineer ...", "profile_id": "<profileId>" }
```

`templateId` is optional; it is auto-selected from the job description if omitted.
Save the returned `id` as `JOB_ID`.

---

## 3. Poll until the job finishes

`status` moves through `queued → running → succeeded | failed`. Poll every couple
of seconds:

```bash
while true; do
  RESP=$(curl -sS "$VITEX_BASE/api/v1/resumes/$JOB_ID" \
    -H "Authorization: Bearer $VITEX_KEY")
  STATUS=$(printf '%s' "$RESP" | jq -r '.status')
  echo "status: $STATUS"
  [ "$STATUS" = "succeeded" ] && break
  if [ "$STATUS" = "failed" ]; then
    printf '%s' "$RESP" | jq '.error'   # the machine-readable envelope
    break
  fi
  sleep 2
done
```

On success, the `result` object carries `resumeData`, `typstCode` (the
zero-lock-in Typst source), `coverLetter`, `atsScore`, `matchAnalysis`,
`templateId`, and `usage` (`{ charged, credits, transactionId }`).

---

## 4. Download the compiled PDF

Available once `status` is `succeeded`:

```bash
curl -sS "$VITEX_BASE/api/v1/resumes/$JOB_ID/pdf" \
  -H "Authorization: Bearer $VITEX_KEY" \
  -o resume.pdf
# Content-Type: application/pdf
```

---

## 5. Refine with natural-language feedback (free)

Refining a succeeded resume creates a **new** job in the parent's version chain
(the parent is never mutated). It is currently **free**. Optionally set `scope` to
choose what the feedback touches.

```bash
REFINE_IDEM=$(uuidgen)

curl -sS -X POST "$VITEX_BASE/api/v1/resumes/$JOB_ID/refine" \
  -H "Authorization: Bearer $VITEX_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $REFINE_IDEM" \
  -d '{
    "feedback": "Lead with the payments impact and tighten the summary to two lines.",
    "scope": "resume"
  }'
# -> 202 { "id": "<refineJobId>", "status": "queued", "_links": { ... } }
```

`scope` is optional and one of `resume` (default) | `cover_letter` | `both`.
`feedback` is required (1–8000 characters). Poll the returned `id` and fetch its
PDF exactly as in steps 3–4.

---

## Outcome-based billing (read this)

- You are charged **1 credit only when a job produces a compiled PDF**
  (`status: succeeded`).
- **A failed job costs nothing** — validation errors, LLM-step failures, and
  compilation failures are all free.
- **Retrying with the same `Idempotency-Key` never double-charges.** Re-POSTing a
  succeeded key returns the existing result without re-running; an in-flight key
  returns the same job; a failed key is reclaimed and re-run (the prior failure
  was free).
- **Refinement is currently free** (the refine job reports `charged: false`).

---

## Error envelope

Every error — an HTTP response or a `failed` job's `error` field — has one shape,
so you never parse prose:

```json
{ "error": { "code": "PIPELINE_COMPILATION_FAILED", "message": "...", "retriable": false, "step": "compile", "requestId": "req_...", "details": {} } }
```

| `code` | HTTP | `retriable` | What to do |
| --- | --- | --- | --- |
| `VALIDATION_FAILED` | 400 | no | Fix the request body/fields |
| `UNAUTHENTICATED` | 401 | no | Missing/invalid key — re-check the Bearer token |
| `INSUFFICIENT_CREDITS` | 402 | no | Out of credits (no model spend happened) — top up |
| `RATE_LIMITED` | 429 | yes | Back off; honor `Retry-After` / `X-RateLimit-*` |
| `PIPELINE_STEP_FAILED` | 502 | yes | An LLM step failed — retry the job |
| `PIPELINE_COMPILATION_FAILED` | 422 | no | Typst failed to compile — the job is free; adjust input |
| `PIPELINE_TIMEOUT` | 504 | yes | Compilation timed out — retry |
| `NOT_FOUND` | 404 | no | Job/profile not found or not yours |
| `CONFLICT` | 409 | varies | Idempotency-key collision; see `retriable` |
| `INTERNAL` | 500 | no | Unexpected — report with `requestId` |

Always trust the `retriable` flag over the HTTP code for retry decisions.

---

## Rate limits (per user)

| Endpoint | Limit |
| --- | --- |
| `POST /api/v1/resumes` | 30 / 60s |
| `POST /api/v1/resumes/{id}/refine` | 10 / 60s |
| `POST /api/profiles`, `PUT /api/profiles/{id}` | 20 / 60s |

A `429` carries `Retry-After` and `X-RateLimit-*` headers.

---

## Advanced: iterative editing (threads)

For a running conversation that makes many small edits to one resume and its
cover letter, Vitex also exposes a stateful conversational edit agent
(`POST /api/threads`, then `POST /api/threads/{id}/messages` as SSE). It is free
and accepts the same Bearer key. For one-shot "change this resume with words",
prefer the stateless `POST /api/v1/resumes/{id}/refine` above. See
[`docs/api/v1.md`](https://github.com/ChanMeng666/easy-resume/blob/master/docs/api/v1.md)
for the thread event shapes.
