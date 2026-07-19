# Vitex MCP — Automated Install Guide (for AI agents)

This document lets an AI coding agent (e.g. Cline) install and configure the
**Vitex** MCP server from docs alone. Vitex turns a job description plus a
candidate background into a tailored, ATS-optimized **resume PDF + cover letter**
— "Career as Code".

There are two ways to connect. Pick one.

- **Local (stdio)** — run the published `vitex-cli` npm package as a stdio MCP
  server. Simplest for Claude Desktop, Claude Code, Cline, and Cursor. Needs a
  Vitex API key in the environment.
- **Remote (hosted)** — point an OAuth-capable client at the hosted Streamable
  HTTP endpoint; the user signs in in the browser (no API key to paste).

Both expose the **same 9 tools** and run the same backend, so billing and behavior
are identical.

---

## Prerequisites

- **Node.js ≥ 20** (only for the local stdio option; `npx` ships with Node).
- **A Vitex account + API key** (for the local option). Mint one at
  <https://www.vitex.org.nz/dashboard> → "Connections & API Keys". The raw token
  (`vitex_<prefix>_<secret>`) is shown once — copy it then. New accounts get 3 free
  credits; 1 credit is charged only on a successfully compiled resume PDF
  (refinements, AI edits, and failed builds are free).

---

## Option A — Local stdio server (`vitex-cli`)

The server is launched with:

```bash
npx -y vitex-cli mcp
```

It reads the API key from the `VITEX_API_KEY` environment variable.

### Client configuration

Add this entry to the MCP client's config file (for Cline: the MCP Servers
settings JSON; for Claude Desktop: `claude_desktop_config.json`). Replace the
placeholder token with the real key.

```json
{
  "mcpServers": {
    "vitex": {
      "command": "npx",
      "args": ["-y", "vitex-cli", "mcp"],
      "env": {
        "VITEX_API_KEY": "vitex_xxx_yyy"
      }
    }
  }
}
```

That is the entire setup — no build step, no clone. `npx -y` fetches and runs the
package on demand.

### Verify

After the client restarts, the `vitex` server should list 9 tools (below). A quick
check is the read-only `get_account` tool, which returns the account's userId,
credit balance, and tier without spending anything.

---

## Option B — Hosted remote server (OAuth)

For clients that support remote MCP over Streamable HTTP with OAuth (e.g. ChatGPT
custom connectors, Claude connectors):

- **MCP server URL:** `https://www.vitex.org.nz/api/mcp`

Add it as a custom connector; the client discovers the OAuth Authorization Server
automatically and opens a browser sign-in. On approval, Vitex mints a scoped API
key as the access token — no key to paste. Revoke it any time from the dashboard's
"Connections & API Keys" list. Setup walkthroughs:
[ChatGPT](docs/connectors/chatgpt.md) · [Claude](docs/connectors/claude.md).

---

## The 9 tools

| Tool | Read-only | What it does |
|------|-----------|--------------|
| `get_account` | ✅ | Return userId, credit balance, and tier. Never spends credits. |
| `generate_resume` | — | Compile a tailored resume PDF + cover letter from a job description and a background (inline or a saved `profile_id`). Costs 1 credit on success. |
| `refine_resume` | — | Refine a succeeded resume with natural-language feedback (new version in the chain). Free. |
| `get_resume` | ✅ | Fetch a generation/refine job by id (status, result, ATS score). |
| `download_pdf` | ✅ | Get/download the compiled PDF for a succeeded job. |
| `list_profiles` | ✅ | List saved candidate backgrounds (reusable across job descriptions). |
| `create_profile` | — | Save a reusable candidate background. Free. |
| `publish_profile` | — | Publish a profile to a public career page (`/p/<slug>`). Never exposes email/phone/photo. Free. |
| `unpublish_profile` | — | Close a published profile's public endpoint. Free. |

Every tool carries MCP annotations (`title`, `readOnlyHint`, `destructiveHint:
false`, `openWorldHint: false`). No tool deletes data.

---

## Links

- Website: <https://www.vitex.org.nz>
- Privacy policy: <https://www.vitex.org.nz/privacy>
- v1 REST API reference: [`docs/api/v1.md`](docs/api/v1.md) · OpenAPI: `/openapi.yaml`
- npm package: <https://www.npmjs.com/package/vitex-cli>
