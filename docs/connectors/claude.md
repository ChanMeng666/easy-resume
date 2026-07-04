# Connect Vitex to Claude (hosted MCP connector)

Vitex runs a **hosted MCP server**, so you can connect it to Claude.ai or Claude
Desktop with a browser sign-in — no terminal, no API key to copy or paste. Once
connected, you can ask Claude to generate a tailored resume, refine it, and manage
reusable candidate profiles, and it will call Vitex directly.

- **Connector URL:** `https://www.vitex.org.nz/api/mcp`
- **Auth:** OAuth 2.1 in the browser (sign in with your Vitex account and approve
  access). Claude stores the resulting token for you; you never see or handle it.

> Prefer a local, terminal-based setup instead? The `vitex mcp` stdio server
> (`npx -y vitex-cli mcp`, with a `VITEX_API_KEY` env var) also works with Claude
> Desktop and Claude Code. This guide covers the **hosted** connector, which needs
> no API key and no local install.

## Prerequisites

- A Vitex account. If you don't have one, sign up at
  [`https://www.vitex.org.nz`](https://www.vitex.org.nz) first. New accounts start
  with 3 free credits.
- Claude.ai (custom connectors are available on paid plans) or Claude Desktop.

## Add the connector

1. In Claude, open **Settings → Connectors**.
2. Click **Add custom connector**.
3. For the **remote MCP server URL**, enter:

   ```
   https://www.vitex.org.nz/api/mcp
   ```

4. Give it a name (e.g. `Vitex`) and add / connect it.
5. Claude opens a **Vitex sign-in** page in your browser. Sign in with your Vitex
   account, then approve the consent screen — you are authorizing the connector to
   **generate resumes and spend your Vitex credits** on your behalf.
6. When the browser flow completes, Claude shows the connector as connected and
   its tools become available in a conversation. In a chat, enable the Vitex
   connector (via the tools/attachments menu) and ask Claude to use it.

## What happens under the hood

The connection uses standard **OAuth 2.1 with PKCE** and **Dynamic Client
Registration** — the same mechanism Claude uses for any custom MCP server:

- Claude registers itself with Vitex's authorization server and sends you to
  Vitex to sign in.
- After you approve, Vitex mints an **API key scoped to your account** and hands
  it back to Claude as the access token. The token *is* a normal Vitex API key
  (the same credential the HTTP API uses), so every call is billed and
  owner-scoped exactly like the rest of Vitex.
- The minted key appears in your **Vitex Dashboard**, labeled `MCP: <client>`
  (the connector's name), so you can see and revoke it at any time.

## What you can do (available tools)

Once connected, Claude can call these Vitex tools:

| Tool | What it does |
| --- | --- |
| `get_account` | Read your account identity, credit balance, and tier. Read-only. |
| `generate_resume` | Compile a tailored, ATS-optimized resume PDF + cover letter from a job description and your background (or a saved profile). |
| `refine_resume` | Revise a generated resume with natural-language feedback (resume, cover letter, or both). Free. |
| `get_resume` | Fetch a generation/refine job by id (status, ATS score, result). Read-only. |
| `download_pdf` | Get the hosted URL of a succeeded job's compiled PDF. |
| `list_profiles` | List your saved candidate profiles (reusable backgrounds). |
| `create_profile` | Save a reusable background so you don't re-paste it for every job. Free. |
| `publish_profile` | Publish a profile to a stable public career URL (`/p/<slug>`). Free. |
| `unpublish_profile` | Close a published profile's public URL. Free. |

Example prompts:

- "Use Vitex to generate a resume for this job description: … — my background is …"
- "Refine that resume to lead with the payments impact and tighten the summary."
- "Save my background as a Vitex profile so I can reuse it."

## Billing

Billing is **outcome-based**: you are charged **1 credit only when a resume job
produces a successfully compiled PDF**. Everything else is free —

- validation errors, LLM-step failures, and compilation failures cost nothing;
- **refinements and edits are free**;
- creating, publishing, or listing profiles is free.

New accounts start with 3 free credits. Check your balance anytime by asking
Claude to run `get_account`, or on your [Dashboard](https://www.vitex.org.nz/dashboard).

## Revoking access

To disconnect the connector, **delete the `MCP: …` key** in your
[Vitex Dashboard](https://www.vitex.org.nz/dashboard) (under your API keys /
connections). Revoking the key immediately invalidates the connector's access;
removing the connector inside Claude stops it from calling Vitex as well.

## Troubleshooting

- **The sign-in page won't load, or the connector can't reach Vitex.** Confirm the
  URL is exactly `https://www.vitex.org.nz/api/mcp` (with `www`). Vitex sessions
  are pinned to the `www` host, so a non-`www` URL will not complete sign-in.
- **You're asked to sign in repeatedly.** Make sure you can sign in to
  `https://www.vitex.org.nz` directly in the same browser first, then retry adding
  the connector.
- **"Out of credits."** Generation needs at least 1 credit. Top up on the
  [Pricing page](https://www.vitex.org.nz/pricing); refinements stay free.

## See also

- [Connect Vitex to ChatGPT](./chatgpt.md)
- [Vitex v1 API reference](../api/v1.md)
