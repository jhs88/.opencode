# OpenCode config

Native V2 configuration. Local-model defaults through CLIProxyAPI, shared coding skills, and MCP tools for code navigation and web research.

Converted from the V1 shape on 2026-10-03 (see git history for the V1 files).

## Files

| Path | Purpose |
| --- | --- |
| `opencode.jsonc` | Models, providers, MCP servers, permissions (native V2 fields) |
| `dcp.jsonc` | Dynamic Context Pruning settings (read by the DCP plugin) |
| `cli.json` | Theme and terminal client settings (replaces V1 `tui.json`) |
| `service.json` | Private background-service configuration. Managed by OpenCode — do not edit |
| `AGENTS.md` | Global behavior and tool-selection rules |
| `agents/` | Orchestrator, reviewer, docs, and test agents (V2-preferred location) |
| `skills/` | Client-specific skills and links to shared skills (V2-preferred location) |
| `plugins/` | Active local plugins, auto-discovered by V2 |
| `scripts/` | Configuration and integration checks |
| `retired/` | Inactive source (V1 `tui.json`, old Cachebro bridge) |
| `package.json` | V2 plugin dependency (`@opencode/plugin`) resolved by `node_modules` for local TS plugins |

Configuration files generally reload automatically, but restart the service after changing plugins, agents, or skills:

```bash
opencode service restart
```

## Environment

OpenCode reads these variables from the process environment using `{env:NAME}` references:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLIPROXYAPI_API_KEY` | Yes | Proxy authentication |
| `FIRECRAWL_API_URL` | Yes for Firecrawl | Self-hosted API endpoint |
| `FIRECRAWL_API_KEY` | No | Authentication if the Firecrawl instance requires it |

Export them in the environment that launches OpenCode. For this lab:

```bash
export FIRECRAWL_API_URL=http://172.16.8.179:3002
# CLIPROXYAPI_API_KEY must already be exported by your credential setup.
opencode
```

A variable stored only in Pi's `agent/.env` is not exported to OpenCode. Desktop launches must inherit the variables too.

## Models

The `llamacpp` provider uses CLIProxyAPI at `https://cliproxyapi.scherreik.com/v1` through the Responses API. The provider name is retained for existing agent references.

The main model is `qwen3.6-27b`; the small/fast model is `qwen3.6-35b-a3b` (used by the `explore` agent override and the built-in `title` agent, replacing V1's `small_model`). Both proxy aliases route to MTP builds. The catalog contains the proxy's advertised local aliases with explicit `capabilities` and `limit` metadata. Output budgets use publisher recommendations and selected coding examples where available, with a 32,768-token fallback; they are client generation budgets, not model maxima. Cloud models are not included in this provider's catalog.

Context limits use the matching upstream model configs' defaults. The [model limits audit](docs/model-limits-audit.md) records all 26 aliases, primary sources, and optional extended windows. The [output limits audit](docs/model-output-limits-audit.md) documents generation defaults and recommended budgets separately from hard model limits.

V2 honors these primary-request budgets up to its 256,000-token runtime ceiling and reduces them when necessary to fit the remaining context. Its summary budget is capped at 32,000. See the [version-specific request preparation](https://github.com/anomalyco/opencode/blob/v2.0.20/packages/core/src/session/model-request.ts).

V1's per-model `reasoning: true` had no V2 equivalent and is dropped (V2 ignores the field); the proxy handles reasoning natively.

## Agents and skills

Custom agents live in `agents/*.md` with native V2 frontmatter (ordered `permissions` rules; `bash` → `shell`, `task` → `subagent`). Select the orchestrator as a primary agent; reviewer, docs, and test are subagents. The config overrides the explore model and permits the plan agent to edit Markdown files.

Reviewer's old `temperature: 0.1` was dropped on purpose: V2 accepts agent-level request bodies but does not send them with model requests yet.

OpenCode discovers shared skills from `~/.agents/skills` as well as `skills/`. Skills need `name` and `description` frontmatter.

The local `code-navigation` skill describes Grepika and Tilth usage. The local `unslop` skill provides writing guidance. `AGENTS.md` holds the shorter tool-selection rules and the no-auto-commit policy.

The local `technical-writing` skill packages Pstack's Diátaxis, Google developer style, STE, and Global English standard at the same pinned revision as Pi. Its body is unchanged. License and provenance live beside `SKILL.md`. Global writing instructions and the docs agent require loading `technical-writing` and `unslop` through OpenCode's native `skill` tool. Pi's skill-preload frontmatter and `/skill:` invocation syntax are not used here. This controls writing style without widening the docs agent's library-documentation scope or enabling shell access.

## MCP tools

Servers are configured under `mcp.servers`. `enabled` became the inverse `disabled`, and the single timeout became `timeout: { catalog, execution }`.

| Server | Purpose |
| --- | --- |
| Grepika | Code search, outlines, references, and directory trees |
| Tilth | Symbol definitions, callers, and dependency analysis |
| Context7 | Library documentation |
| gh_grep | Public code search through grep.app |
| Firecrawl | Self-hosted web search, scraping, URL mapping, and crawling |

Chrome DevTools and Next DevTools entries are disabled.

### Firecrawl

Requires Node.js 22 or newer. OpenCode launches `npx -y firecrawl-mcp` over stdio, using the endpoint and optional key from the environment.

Keep `FIRECRAWL_API_URL` exported and pointed at your self-hosted service. Without it, upstream can default to Firecrawl Cloud.

The lab instance currently needs no API key. Leave `FIRECRAWL_API_KEY` unset unless authentication is enabled. OAuth-token inheritance remains disabled.

Enabled tools (V2 replaces V1's `tools` map with ordered permission rules: a `firecrawl_*` deny-all followed by explicit allows, last match wins):

- `firecrawl_firecrawl_search`
- `firecrawl_firecrawl_scrape`
- `firecrawl_firecrawl_map`
- `firecrawl_firecrawl_crawl` — allowed only via `ask` (approval required)
- `firecrawl_firecrawl_check_crawl_status`

OpenCode names MCP tools `<server>_<tool>`, hence the repeated prefix. Other Firecrawl tools are denied.

Crawls require approval and finite page/depth limits. Keep external links and subdomains disabled unless requested. The crawl tool waits for completion; the status tool reads an existing job. The request timeout is 120 seconds. A timeout or client interruption does not automatically cancel the remote crawl, so avoid unattended or long-running crawls.

## Plugins

- **OpenSlimEdit** (`plugins/OpenSlimEdit.ts`) shortens tool descriptions and read output, and accepts line ranges such as `55-64` in `edit.oldString`. Ported to the V2 plugin API (`ctx.tool.transform` + `ctx.tool.hook`) on 2026-10-03, with type-only imports so it has no runtime package dependency to resolve. Adapted from [Mark Erikson's OpenCode config](https://github.com/markerikson/opencode-config-example/blob/main/config/AGENTS.md).
- **DCP** (`@tarquinen/opencode-dcp@3.2.0`) provides dynamic context pruning, configured in `dcp.jsonc`. Pinned to 3.2.0, the first dual V1/V2 release (default export `{ id, setup, server }`). The unpinned `@latest` had been resolving through stale caches to V1-only 3.1.x builds that fail to load in V2. Bump the pin and restart when DCP ships an update worth taking.
- **herdr agent state** — herdr's OpenCode integration was V1-only as of herdr 0.9.3, so it failed to load in V2. Removed 2026-10-03. Reinstalling herdr's integration (or a herdr release with V2 support) will restore it.

The old Cachebro bridge is inactive under `retired/`. Read current file contents before editing, using built-in `read`.

## Verification

Configuration, MCP discovery, and plugin logic tests, without model inference:

```bash
opencode mcp list
node --test ~/.config/opencode/scripts/verify-plugins.test.mjs
python3 ~/.config/opencode/scripts/verify-v2.test.py
python3 ~/.config/opencode/scripts/verify-firecrawl.py
```

Plugin load status (after a service restart):

```bash
opencode api get /api/plugin
```

Live search, scrape, and map:

```bash
python3 ~/.config/opencode/scripts/verify-firecrawl.py --live
```

After explicit user approval, include a one-page crawl with status readback:

```bash
python3 ~/.config/opencode/scripts/verify-firecrawl.py --crawl
```

These direct MCP checks do not test model tool selection or the conversational approval UI. `--live` does not crawl; `--crawl` also runs the live checks and requires approval before invocation.

## Differences from Pi

OpenCode V2 uses native question, subagent, and Code Mode (`execute`) tools. Pi's managed background-terminal tools, JavaScript workflows, A2A integration, and full custom-agent roster are not installed here. Firecrawl's MCP integration also lacks Pi's automatic crawl cancellation.

## Documentation

- [OpenCode V2 configuration](https://opencode.ai/v2/docs/config)
- [OpenCode V2 MCP servers](https://opencode.ai/v2/docs/mcp-servers)
- [OpenCode V2 plugins](https://opencode.ai/v2/docs/build/plugins)
- [V1 to V2 migration guide](https://opencode.ai/v2/docs/migrate-v1)
- [Firecrawl local and self-hosted setup](https://docs.firecrawl.dev/mcp-server/local)
