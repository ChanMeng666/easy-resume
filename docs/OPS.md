# Vitex Operations Runbook

Single source of truth for running Vitex in production. Last major revision:
2026-07-14 (hardening round: compile sandbox, rate limits, Cloudflare proxy,
health-gated deploys, auto-migrations).

## Production topology

| Fact | Value |
|---|---|
| Droplet | `fanfic-lab-coolify` (DigitalOcean id `562611948`), nyc1, 2 GB RAM / 2 vCPU / 60 GB disk |
| Origin IP | `159.223.173.17` (also hosts `web-sunostats`, `web-archcanvas`, `coolify-proxy`) |
| Edge | **Cloudflare proxy (orange cloud)** on `vitex.org.nz` + `www` → Traefik v3.6 (`coolify-proxy`, Coolify-managed) → container `web-vitex-<sha7>` on the external docker network `coolify` (no host port published) |
| TLS | Cloudflare edge cert to visitors; **SSL mode Full (Strict)**; origin cert = Let's Encrypt via Traefik HTTP-01 (`certificatesresolvers.letsencrypt.acme.httpchallenge`) |
| DB | Neon Postgres (managed, off-box) — also backs rate limiting |
| PDF storage | Cloudflare R2 bucket `vitex-pdfs` (best-effort; recompile fallback) |
| Registry | `ghcr.io/chanmeng666/easy-resume/web` |

Shared-box rule: **nothing here may restart or reconfigure docker daemon-wide**
— sunostats/archcanvas/Traefik share the daemon. Log rotation is already global
(`/etc/docker/daemon.json`: json-file, 10m × 3). A 1 GB swapfile exists.

## Deploy flow (`.github/workflows/deploy.yml`)

Push to `master` → `checks` (tests/tsc/lint) → `build-and-push` (GHCR, buildx,
checksum-pinned typst/FontAwesome ADDs) → `migrate` (runs idempotent
`scripts/migrate.ts` against prod Neon on the GH runner — **a failed migration
blocks the swap**) → `deploy` (SSH to the droplet):

1. New container starts as `web-vitex-<sha7>` **alongside** the old one, same
   Traefik labels (Traefik merges both into one service and round-robins —
   that overlap is the zero-downtime mechanism). Caps:
   `--memory=768m --memory-swap=1g --cpus=1.5`.
2. Health gate polls the container HEALTHCHECK (`/api/health`, liveness-only,
   no DB) for up to ~90 s.
   - **Healthy** → every other `web-vitex*` container is removed; repo-scoped
     image cleanup keeps the newest 3 sha tags + `:latest`.
   - **Not healthy** → new container's logs are printed, the new container is
     removed, the workflow fails — **the old container keeps serving.**

What a failed gate looks like in Actions: the deploy job fails on
`::error::health gate failed for web-vitex-<sha7>` with the last 100 log lines
above it. Production is still on the previous sha; no action is required to
restore service.

## Rollback

- **Preferred**: re-run the deploy job of the last green commit from the
  Actions UI (Re-run jobs → deploy), or `gh run rerun <run-id>`.
- **Manual (SSH)** — battle-tested 2026-07-14, ~1 minute end to end:
  `docker images ghcr.io/chanmeng666/easy-resume/web` still holds the previous
  2 sha tags. Copy the current container's env
  (`docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' <cur> >
  /tmp/rollback.env`, strip PATH/NODE_*/HOSTNAME/TYPST_* lines), then
  `docker run` the previous sha with `--env-file /tmp/rollback.env`, the same
  five Traefik labels and resource caps from deploy.yml, wait for
  `docker inspect -f '{{.State.Health.Status}}'` = `healthy`, then
  `docker rm -f` the bad container and delete /tmp/rollback.env.
- DB: migrations are additive-only by convention (`IF NOT EXISTS`), so old
  code tolerates a newer schema during rollback. Never write destructive DDL
  into `scripts/migrate.ts` without a manual plan.

## Logs

- `docker logs web-vitex-<sha7>` (find the name via `docker ps --filter
  name=web-vitex`). One JSON object per line (`createLogger`), includes
  `requestId`; grep recipes:
  `docker logs <c> 2>&1 | grep '"level":"error"'`,
  `... | grep '<requestId>'`.
- Remote pull without SSH: Actions → "Fetch container logs" workflow
  (`logs.yml`, workflow_dispatch) — resolves the current sha-named container
  automatically.
- Rotation is daemon-global (10m × 3 files); nothing to manage per deploy.

## Migrations

- Automatic on every deploy (`migrate` job). Manual run:
  `DATABASE_URL=<prod url> npm run db:migrate` from any machine (Neon is
  publicly reachable). `scripts/migrate.ts` is the single source of truth —
  add idempotent DDL there; do NOT use drizzle-kit generate.

## Cloudflare (edge)

- Zone `vitex.org.nz` (account chanmeng.dev@gmail.com). Proxied records: apex
  A + `www` A → origin. MX/TXT (Resend email) stay DNS-only.
- Settings as of 2026-07-14: SSL **Full (Strict)**; **Always Use HTTPS ON**;
  Rocket Loader OFF (breaks Next hydration — keep off); Bot Fight Mode OFF
  (free plan cannot exempt Stripe webhooks / ChatGPT-Claude MCP connectors —
  keep off); no edge rate-limit rule yet (app-level limits cover /api; add
  one only if an L7 flood actually materializes).
- **Client IP**: the app resolves client IPs via `src/server/http/clientIp.ts`
  (trust order `CF-Connecting-IP` → last `X-Forwarded-For` hop → `X-Real-Ip`).
  Caveat: the origin IP stays directly reachable (shared droplet, can't lock
  the firewall to CF ranges), so a direct-to-origin caller can forge
  `CF-Connecting-IP`; worst case is per-IP rate-limit evasion — same exposure
  as pre-Cloudflare. Revisit if all apps on the box move behind CF.
- **SSE through CF**: free-plan idle timeout is 100 s between bytes (error
  524). Generation/refine emit progress every few seconds, so fine; if a
  pipeline step ever stalls >100 s, users see 524 while the job continues
  server-side.
- **Origin cert renewal (the one real risk)**: Traefik renews via HTTP-01
  through the proxy. If the origin cert ever *expires* first, Full (Strict)
  → 526 → challenges can't complete → death spiral. Recovery: grey-cloud both
  A records (DNS-only), wait for Traefik's automatic retry to renew, then
  orange-cloud again. Baseline: origin cert `notAfter = 2026-09-04` (recorded
  at flip time; next renewal ~2026-08-05 — confirm it succeeded through the
  proxy with `echo | openssl s_client -connect 159.223.173.17:443 -servername
  www.vitex.org.nz | openssl x509 -noout -dates`).
- Rollback of the whole edge: flip both A records back to DNS-only (instant).

## Monitoring, alerts, backups (DigitalOcean)

- Droplet alerts (email chanmeng.dev@gmail.com): memory >85% (5m),
  disk >80% (5m), CPU >90% (10m).
- Uptime check `vitex-www` → https://www.vitex.org.nz (us_east) with alerts:
  `vitex-down` (down 2m), `vitex-ssl-expiry` (cert <14 d), `vitex-slow`
  (latency >2000 ms for 10m). Note: it now measures through Cloudflare — the
  real user path. The `vitex-ssl-expiry` alert watches the *edge* cert; the
  origin cert is covered by the openssl check above.
- **Weekly droplet backups ON** (whole-box, keeps 4). Manual snapshot before
  risky box-level changes: `doctl compute droplet-action snapshot 562611948
  --snapshot-name <name>`. Last known: `post-hardening-2026-07-08`.
- Data: Neon has its own PITR/backups; R2 objects are recompute-able from
  stored Typst.

## Incident basics

- Container OOM? `docker inspect -f '{{.State.OOMKilled}}' <c>`; memory cap is
  768m — check `docker stats` and raise in deploy.yml if steady-state creeps
  past ~450 MB.
- Disk: `df -h /` + `docker system df`; deploy prunes this repo's images, other
  repos manage their own.
- Health: `curl https://www.vitex.org.nz/api/health` (edge→origin) — liveness
  only, never reflects DB/LLM outages by design.
- Whole-box restore: DigitalOcean console → droplet → Backups/Snapshots →
  restore (destructive; affects all three apps).

## App-layer security posture (pointers)

- `/api/compile`: authenticated (session or API key), `compile:` 30/min,
  per-request temp dir + `typst --root` sandbox, subprocess forced offline via
  blackholed proxy env.
- Rate limits: see CLAUDE.md "Rate Limiting" for the full key table
  (Postgres-backed, fail-open).
- Security headers: set in `next.config.ts` `headers()` — CSP + HSTS are
  prod-only; any new third-party browser origin must be added to the CSP or it
  will be blocked. Do NOT also enable HSTS at the Cloudflare edge (single
  source of truth: the app). `script-src` includes `'unsafe-eval'` because the
  Stack Auth SDK evals a browser-compat shim at startup — removing it crashes
  every page (incident 2026-07-14: shipped without it, app-wide hydration
  crash, manually rolled back in ~1 min using the retained previous image).
  **Any CSP change must be verified against a local production build in a real
  browser before merging** (`npm run build && npx next start`, then drive /,
  /pricing, /connect, /editor watching the console for violations).
- Secrets: gitleaks CI gate + pre-commit; deploy secrets live in GitHub
  Actions; BuildKit secret mounts keep them out of image layers.
- Dependencies: Dependabot weekly (grouped) + `npm audit --omit=dev
  --audit-level=high` blocking in CI.
