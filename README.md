# OpenCode config

Local-model defaults through CLIProxyAPI, shared coding skills, and MCP tools for code navigation and web research.

## Files

| Path | Purpose |
| --- | --- |
| `opencode.jsonc` | Models, providers, MCP servers, and permissions |
| `dcp.jsonc` | Dynamic Context Pruning settings |
| `tui.json` | Theme and TUI settings |
| `AGENTS.md` | Global behavior and tool-selection rules |
| `agent/` | Orchestrator, reviewer, docs, and test agents |
| `skill/` | Client-specific skills and links to shared skills |
| `plugin/` | Active local plugins |
| `scripts/` | Configuration and integration checks |
| `retired/` | Inactive plugin source |

Restart OpenCode after changing configuration, agents, skills, or plugins.

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

The main model is `qwen3.6-27b`; small/explore uses `qwen3.6-35b-a3b`. Both proxy aliases route to MTP builds. The catalog contains the proxy's advertised local aliases, with reasoning, modality, and context metadata from its configuration. The configured output budget is 8,192 tokens per response, not a claim about each model's maximum. Cloud models are not included in this provider's catalog.

## Agents and skills

Custom agents live in `agent/*.md`. Select the orchestrator as a primary agent; reviewer, docs, and test are subagents. Built-in agents remain available. The config overrides the explore model and permits the plan agent to edit Markdown files.

OpenCode discovers shared skills from `~/.agents/skills` as well as `skill/`. Skills need `name` and `description` frontmatter. Use `opencode debug skill` to inspect discovery.

The local `code-navigation` skill describes Grepika, Tilth, and Cachebro usage. `AGENTS.md` holds the shorter tool-selection rules and the no-auto-commit policy.

## MCP tools

| Server | Purpose |
| --- | --- |
| Grepika | Code search, outlines, references, and directory trees |
| Tilth | Symbol definitions, callers, and dependency analysis |
| Cachebro | Cached file reads |
| Context7 | Library documentation |
| gh_grep | Public code search through grep.app |
| Firecrawl | Self-hosted web search, scraping, URL mapping, and crawling |

Chrome DevTools and Next DevTools entries are disabled.

### Firecrawl

Requires Node.js 22 or newer. OpenCode launches `npx -y firecrawl-mcp` over stdio, using the endpoint and optional key from the environment.

Keep `FIRECRAWL_API_URL` exported and pointed at your self-hosted service. Without it, upstream can default to Firecrawl Cloud.

The lab instance currently needs no API key. Leave `FIRECRAWL_API_KEY` unset unless authentication is enabled. OAuth-token inheritance remains disabled.

Enabled tools:

- `firecrawl_firecrawl_search`
- `firecrawl_firecrawl_scrape`
- `firecrawl_firecrawl_map`
- `firecrawl_firecrawl_crawl`
- `firecrawl_firecrawl_check_crawl_status`

OpenCode names MCP tools `<server>_<tool>`, hence the repeated prefix. Other Firecrawl tools are disabled.

Crawls require approval and finite page/depth limits. Keep external links and subdomains disabled unless requested. The crawl tool waits for completion; the status tool reads an existing job. The request timeout is 120 seconds. A timeout or client interruption does not automatically cancel the remote crawl, so avoid unattended or long-running crawls.

## Plugins

- **OpenSlimEdit** shortens tool descriptions and read output, and accepts line ranges such as `55-64` in `edit.oldString`. Adapted from [Mark Erikson's OpenCode config](https://github.com/markerikson/opencode-config-example/blob/main/config/AGENTS.md).
- **DCP** provides dynamic context pruning, configured in `dcp.jsonc`.

The old Cachebro bridge is inactive under `retired/`. OpenCode 1.18.3 does not require it. Read current file contents before editing, using Cachebro or built-in `read`.

## Verification

Configuration, MCP discovery, and plugin tests, without model inference:

```bash
opencode mcp list
node --experimental-strip-types --test ~/.config/opencode/scripts/verify-plugins.test.mjs
python3 ~/.config/opencode/scripts/verify-firecrawl.py
```

Live search, scrape, map, and one-page crawl with status readback:

```bash
python3 ~/.config/opencode/scripts/verify-firecrawl.py --live
```

The live check makes web requests without an approval prompt. It does not test model tool selection or the conversational approval UI.

## Differences from Pi

OpenCode uses native question, task, and todo tools. Pi's managed background-terminal tools, JavaScript workflows, A2A integration, and full custom-agent roster are not installed here. Firecrawl's MCP integration also lacks Pi's automatic crawl cancellation.

## Documentation

- [OpenCode MCP configuration](https://opencode.ai/docs/mcp-servers/)
- [OpenCode plugins](https://opencode.ai/docs/plugins/)
- [OpenCode skills](https://opencode.ai/docs/skills/)
- [Firecrawl local and self-hosted setup](https://docs.firecrawl.dev/mcp-server/local)
