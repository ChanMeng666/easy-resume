# Releasing `vitex-cli`

Publishing is fully automated by [`.github/workflows/release.yml`](../.github/workflows/release.yml)
over **OIDC trusted publishing** — no npm token is stored anywhere, and no
publish ever prompts for 2FA.

## The release button is a tag

```bash
# from the repo root, on master with the version bumped + merged
git tag cli-v0.2.1
git push origin cli-v0.2.1
```

Pushing a `cli-v*` tag runs the workflow, which:

1. builds + tests `cli/`,
2. publishes `vitex-cli` to npm with `--provenance` (idempotent — skips if the
   version already exists), then
3. syncs `server.json` to the official MCP Registry (non-fatal on rejection).

The tag namespace is **`cli-v*`** (not a bare `v*`): this repo also deploys a web
app, so the CLI keeps its own tag namespace to avoid collisions.

Before tagging, bump the version in `cli/package.json` (+ `cli/package-lock.json`
via `npm version <v> --no-git-tag-version`), keep `server.json`'s `version` and
its `packages[].version` in lock-step, add a `CHANGELOG.md` entry, and land it on
`master`.

## The one-time human step (per package)

Trusted publishing requires a **one-time** registration on npmjs.com — the only
human, 2FA-gated action in the whole flow:

> npmjs.com → **vitex-cli** → Settings → Trusted Publisher → GitHub Actions:
> - **Organization or user:** `ChanMeng666` (GitHub owner casing, exact)
> - **Repository:** `easy-resume`
> - **Workflow filename:** `release.yml` (filename only, not a path)
> - **Environment name:** _(leave empty)_
> - **Allowed actions:** check **"Allow npm publish"**

npm asks for a 2FA OTP to save this. It is done **once, ever** (until the config
itself changes). Renaming `release.yml` breaks publishing until this registration
is redone.

## When a publish fails with an auth error

**Redo the npmjs trusted-publisher registration above — never add a token.**
Tokens are the deprecated path; an auth failure means the trust contract
(owner / repo / workflow-filename, all case-sensitive) does not match this
workflow. Fix the registration, then re-run the workflow (`gh workflow run
release.yml`, or re-push the tag) — the publish is idempotent, so re-runs are
safe.

## MCP Registry note

The MCP Registry sync is **non-fatal**: if it is rejected (e.g. a first-time
namespace publish needing extra setup) the workflow logs a warning and still
succeeds, because the npm publish is the money path. Re-running the workflow
re-attempts the sync, guarded by the registry's own state so it never
double-publishes.
