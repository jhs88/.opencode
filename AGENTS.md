# Global Rules

Standard behaviors that OpenCode should always follow.

## Quick Reference — Critical Rules

- **Never auto-commit** — always wait for explicit user instruction
- **Use `~/` paths** — never expand to full platform paths in bash commands
- **No sycophancy** — no "You're absolutely right!", no empty validation
- **No `any` types** — always use actual TypeScript types
- **Escalate after 2 failures** — stop, analyze, try a different approach
- **Minimize context** — read outlines first, then targeted sections

## Tool Rules

**Principle: minimize context consumption.** Read outlines first, then targeted sections. Be surgical.

| Need                         | Tool                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| Directory overview           | `grepika_toc`                                              |
| Symbol definitions / callers | `tilth_tilth_search` (use `kind:callers` for caller tracing)     |
| File structure               | `grepika_outline` → `grepika_get` (read only needed lines) |
| Code search (NL/regex)       | `grepika_search`                                           |
| Cached file reads            | `cachebro_read_file` / `cachebro_read_files`               |

### Quick Decision

- "Find files about X topic" → **grepika** (NL search)
- "Where is Y defined?" → **tilth** (structural)
- "What calls Z?" → **tilth** (callers)
- Regex/text pattern → **grepika** (grep mode)

### Non-Code Files

- Config, JSON, small files: `cachebro_read_file` / `cachebro_read_files`
- Markdown/docs: scan headers with `rg` first, read targeted sections
- Fallback if cachebro misbehaves: built-in `Read` tool

**Load `code-navigation` skill for full tool reference and workflow patterns.**

Read current file contents before editing, using cachebro or built-in `read`. The retired Cachebro bridge is not required by OpenCode 1.18.3; do not claim that MCP reads update a FileTime API.

## Web research

Use `firecrawl_firecrawl_search` for web queries, `firecrawl_firecrawl_scrape` for known URLs, and `firecrawl_firecrawl_map` for URL discovery. Use Context7 for library documentation and `gh_grep` for public code examples.

Firecrawl uses the explicitly configured self-hosted API. Never substitute Firecrawl Cloud or a hosted MCP endpoint when it fails. Report the failure instead.

Crawling requires user approval. Always provide a finite `limit` and `maxDiscoveryDepth`, with `allowExternalLinks: false` and `allowSubdomains: false` unless explicitly requested. Poll `firecrawl_firecrawl_check_crawl_status` using the returned job ID. A job ID alone is not completed work. Do not start unattended crawls: this MCP integration does not expose Pi's automatic crawl cancellation.

Prefer markdown and small search limits. Agent, monitor, research-index, extraction, and browser-interaction tools are deliberately disabled. Use OpenCode's native `question`, `task`, and todo tools for interaction and delegation; Pi-specific background/workflow tools are not installed here.
