# vitex-cli

A thin command-line client for the hosted [Vitex](https://www.vitex.org.nz) resume
API — and a one-command **MCP server** so Claude Desktop, Claude Code, and Cursor
can generate, refine, and download tailored resumes for you.

> **The API is the UI.** Vitex compiles a tailored, ATS-optimized resume PDF and
> cover letter from a job description plus your background. This CLI is a *thin
> wrapper* over the hosted v1 HTTP API — no local pipeline, no Typst, no LLM. It is
> to Vitex what `gh` is to GitHub.

## Install

```bash
npm install -g vitex-cli
# or run without installing:
npx vitex-cli --help
```

Requires Node.js >= 20.

## Authentication

Mint an API key once while signed in to the web app (the raw token is shown
**once**; only its SHA-256 hash is stored). Then:

```bash
export VITEX_API_KEY="vitex_xxx_yyy"
```

Every command reads `VITEX_API_KEY` (or `--api-key <token>`). The key is never
echoed in output. The base URL defaults to `https://www.vitex.org.nz` and can be
overridden with `--api-url` or `VITEX_API_URL`.

## Billing (outcome-based)

You are charged **1 credit only when a job produces a compiled PDF** (`status:
succeeded`). Validation errors, LLM-step failures, and compilation failures are
**free**. Refinements are **free**. New accounts start with 3 free credits.

## Async job model

`generate` and `refine` return a **job id** immediately (`status: queued`). Poll
it with `vitex job <id>` until `succeeded | failed`, then `vitex pdf <id>` — or
pass `--wait` to let the CLI poll for you.

## Commands

| Command | What it does |
| --- | --- |
| `vitex generate --jd <file\|-> (--background <file\|-> \| --profile <id>) [--template <id>] [--wait] [-o out.pdf]` | Create a resume job from a job description + background |
| `vitex job <id>` | Poll a job by id |
| `vitex pdf <id> [-o out.pdf]` | Download a succeeded job's PDF (default `<id>.pdf`) |
| `vitex refine <id> --feedback <text\|@file> [--scope resume\|cover_letter\|both] [--wait] [-o out.pdf]` | Refine a succeeded resume (free) |
| `vitex profiles list` | List saved candidate backgrounds |
| `vitex profiles get <id>` | Show one profile with parsed data |
| `vitex profiles create --background <file\|-> [--label <text>] [--voice <file\|->]` | Save a reusable background |
| `vitex profiles update <id> [--background <file\|->] [--label <text>] [--voice <file\|->]` | Update a profile |
| `vitex profiles delete <id>` | Delete a profile |
| `vitex profiles publish <id>` | Publish a public `/p/<slug>` career endpoint |
| `vitex profiles unpublish <id>` | Close a published profile |
| `vitex whoami` | Verify your key and show your credit balance + tier (`GET /api/v1/me`; never spends credits) |
| `vitex mcp` | Run the stdio MCP server |

### Global flags

- `--json` — print raw JSON instead of a terse human line.
- `--api-url <url>` — override the base URL (default `https://www.vitex.org.nz`).
- `--api-key <token>` — override `VITEX_API_KEY`.
- `-h, --help`, `--version`.

### Input conventions

- A `-` argument reads **stdin** (e.g. `--jd -`).
- `--feedback` also accepts `@file` to read the feedback from a file.

### Exit codes

`0` ok · `2` usage error · `3` API error · `4` poll timeout · `1` unexpected.

## Examples

```bash
# Generate and wait, then save the PDF
vitex generate --jd jd.txt --background bg.txt --wait -o resume.pdf

# Pipe a JD in and reuse a saved profile, machine-readable output
echo "Senior Go engineer, payments, distributed systems" \
  | vitex generate --jd - --profile <profileId> --json

# Refine a succeeded resume and save the new version's PDF
vitex refine <jobId> --feedback "Lead with the payments impact." --wait -o v2.pdf

# Save a reusable background once
vitex profiles create --background bg.txt --label "My Background"
```

Errors print a single line to stderr in the shape `error <CODE>: <message>
(requestId)`, sourced from the API's machine-readable envelope.

## MCP server (Claude Desktop / Claude Code / Cursor)

`vitex mcp` starts a [Model Context Protocol](https://modelcontextprotocol.io)
server over stdio. Add it to your client's MCP config and the assistant can drive
Vitex directly:

```json
{
  "mcpServers": {
    "vitex": {
      "command": "npx",
      "args": ["-y", "vitex-cli", "mcp"],
      "env": { "VITEX_API_KEY": "vitex_xxx_yyy" }
    }
  }
}
```

For **Claude Code**, add the same server with:

```bash
claude mcp add vitex --env VITEX_API_KEY=vitex_xxx_yyy -- npx -y vitex-cli mcp
```

### Tools

Each generate/refine tool blocks and polls internally, so the assistant gets a
final result in one call. Every tool reads `VITEX_API_KEY` from the environment.

| Tool | Purpose |
| --- | --- |
| `get_account` | Return your identity + credit balance + tier (read-only; check credits before generating) |
| `generate_resume` | Compile a tailored resume from `jobDescription` + `background` or `profile_id` (returns the final job incl. `atsScore`) |
| `refine_resume` | Refine a succeeded resume with `feedback` (+ optional `scope`) |
| `get_resume` | Fetch a job by id |
| `download_pdf` | Download a succeeded job's PDF to a temp file, return its path |
| `list_profiles` | List saved candidate backgrounds |
| `create_profile` | Save a reusable background |
| `publish_profile` / `unpublish_profile` | Toggle a profile's public career endpoint |

## Reference

- Full v1 API: <https://github.com/ChanMeng666/easy-resume/blob/master/docs/api/v1.md>
- OpenAPI spec: <https://www.vitex.org.nz/openapi.yaml>
- Agent playbook: <https://www.vitex.org.nz/skill.md>

## Changelog

- **0.2.0** — `whoami` now uses the dedicated `GET /api/v1/me` endpoint (shows your
  credit balance + tier, not just a key check); new `get_account` MCP tool so
  agents can check credits before generating.
- **0.1.0** — Initial release.

## License

MIT
