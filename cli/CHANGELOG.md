# Changelog

All notable changes to `vitex-cli` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.1

No functional changes — a discoverability + release-infrastructure release.

- **MCP tool annotations** on all 9 stdio MCP tools (`readOnlyHint` /
  `destructiveHint` / `openWorldHint`), so MCP clients can present accurate
  read-only vs. mutating hints for `get_account`, `generate_resume`,
  `refine_resume`, `get_resume`, `download_pdf`, `list_profiles`,
  `create_profile`, `publish_profile`, and `unpublish_profile`.
- **`mcpName`** (`io.github.ChanMeng666/vitex`) in `package.json`, matching the
  repo's `server.json`, so the package can be verified and listed in the official
  [MCP Registry](https://registry.modelcontextprotocol.io).
- Released via OIDC **trusted publishing** (`.github/workflows/release.yml`) with
  npm provenance; see [RELEASING.md](./RELEASING.md).

## 0.2.0

- `whoami` now uses the dedicated `GET /api/v1/me` endpoint (shows your credit
  balance + tier, not just a key check).
- New `get_account` MCP tool so agents can check credits before generating.

## 0.1.0

- Initial release.
