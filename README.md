# OpenCode Config

Local LLM coding agent config — all models run locally via llama.cpp.

## Structure

```
~/.config/opencode/
├── opencode.jsonc      # Main config: models, providers, MCP servers
├── dcp.jsonc           # Dynamic Context Pruning settings
├── tui.json            # TUI theme and behavior
├── AGENTS.md           # Global rules injected into every session
├── agent/              # Custom agents (pre-prompts)
│   ├── orchestrator.md # Primary mode — task decomposition
│   ├── reviewer.md     # Read-only code review
│   ├── docs.md         # Library/API documentation
│   └── test.md         # Test writing and debugging
├── skill/              # Reusable skills (loaded on demand)
│   └── code-navigation/
│       └── SKILL.md    # Tool reference for grepika/tilth/cachebro
├── plugin/             # Custom plugins
│   ├── OpenSlimEdit.ts     # Shortens built-in tool descriptions, trims read output
│   └── cachebro-bridge.ts  # Registers cachebro reads with FileTime so edits don't fail
└── docs/               # Config documentation
```

## Agents as Pre-Prompts

OpenCode doesn't have a "prompt" concept. Instead, **agents act as pre-prompts** — they define behavior, permissions, and output format for a session mode. When you select an agent, its instructions are injected before your message.

### Built-in Agents

OpenCode ships with default agents that require no config. They're always available regardless of what's defined in `agent/`. The config can override their behavior — for example `opencode.jsonc` overrides the `explore` agent model and gives `plan` permission to write `.md` files.

These built-in agents are distinct from custom agents in `agent/`.

### Custom Agents

Defined in `agent/*.md` with frontmatter controlling behavior:

```yaml
---
description: What this agent does
mode: subagent | primary
permission:
  edit: deny # block file writes
  bash: # allowlist/denylist for shell commands
    "git diff": allow
    "*": deny
  task: allow # can spawn subagents
---
```

- `mode: primary` — runs as the main session (orchestrator)
- `mode: subagent` — spawned by other agents via the `task` tool
- Permissions are restrictive by default — only explicitly allowed actions work

## Skills

Skills are loaded on-demand when their description matches the task. They supplement the agent's pre-prompt with detailed guidance without consuming context until needed.

- `code-navigation` — full reference for grepika, tilth, cachebro tool usage and anti-patterns

## MCP Servers

Configured in `opencode.jsonc` → `mcp`:

| Server       | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| **grepika**  | Code search (NL + regex), file outlining, directory tree                |
| **tilth**    | Structural code search — symbol definitions, callers, blast-radius deps |
| **cachebro** | Cached file reads — saves tokens on repeated reads of the same file     |
| **context7** | Remote context provider                                                 |
| **gh_grep**  | GitHub code search                                                      |

## Plugins

These plugins where taken from Mark's [setup](https://github.com/markerikson/opencode-config-example/blob/main/config/AGENTS.md)

### OpenSlimEdit

Reduces token consumption by:

- Replacing verbose built-in tool descriptions with compact versions
- Shortening file paths in `read` output to relative paths
- Stripping footer metadata from `read` output
- Expanding line-range syntax (`55-64`) in `edit.oldString` automatically

### Cachebro Bridge

Bridges cachebro's MCP file reads with OpenCode's FileTime system. Without it, edits fail because OpenCode doesn't know the file was already read via cachebro.

## Global Rules

`AGENTS.md` is injected into every session. Contains:

- Critical behavioral rules (no auto-commit, no `any` types, no sycophancy)
- Tool selection quick-reference table
- Decision flowchart for code navigation tools
