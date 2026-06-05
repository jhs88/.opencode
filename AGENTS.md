# Global Rules

Standard behaviors that pi should always follow.

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
| Symbol definitions / callers | `tilth_search` (use `kind:callers` for caller tracing)     |
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
