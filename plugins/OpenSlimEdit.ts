// Type-only import: erased at runtime so the plugin has no bare-package
// dependency the service has to resolve (it only needs node: builtins).
import type { Context, Plugin } from "@opencode/plugin/promise/plugin";
import * as fs from "node:fs";
import * as path from "node:path";

const LINE_RANGE_RE = /^(\d+)(?:\s*-\s*(\d+))?$/;

// Shortened descriptions for V2 builtin tool IDs (bash -> shell, task -> subagent).
// Custom tool routing (grepika/tilth) is preserved from the V1 plugin.
export const SLIM: Record<string, string> = {
  read: [
    "Read file/directory. Read current content before editing.",
    "Absolute path required. Returns lines prefixed `<line>: <content>`. Dirs return entries with trailing `/`.",
    "Default 2000 lines. Use offset (1-indexed) for later sections. Lines >2000 chars truncated.",
    "Use grep or grepika to find relevant sections in large files. Use glob if unsure of path. Avoid tiny 30-line slices. Can read images/PDFs.",
  ].join(" "),
  edit: [
    "String replacement in files. oldString can be a line range like '55-64'.",
    "Read the current file before editing using read. Match indentation exactly from read output (after `<line>: ` prefix — never include the prefix).",
    "Fails if oldString not found. Fails if multiple matches — add surrounding context to disambiguate.",
    "Use replaceAll for renaming across the file. Prefer editing over creating new files.",
  ].join(" "),
  write:
    "Write/overwrite file. Inspect existing content first using read. Prefer Edit over Write for existing files. Never proactively create .md/README files.",
  shell: [
    "Run shell command in persistent session. Use workdir param instead of `cd &&`.",
    "For file ops use dedicated tools (Read/Edit/Write/Glob/Grep), not cat/sed/awk/echo.",
    "Quote paths with spaces. Long output auto-truncated — don't pipe through head/tail.",
    "Chain dependent commands with &&. Run independent commands as parallel tool calls.",
    "Git: never force-push, hard-reset, skip hooks, or auto-commit unless user explicitly asks.",
  ].join(" "),
  glob: "Fast file pattern matching (e.g. '**/*.ts'). For finding files by topic/relevance, prefer grepika (ranked results). Use glob for known patterns, specific extensions, or directory structure exploration. Batch multiple speculative searches.",
  grep: "Regex content search across files. For finding relevant files by topic, prefer grepika (ranked results). For symbol lookups, prefer tilth_tilth_search. Use grep for exact regex patterns, literal strings, or when you need line-level matches. Supports include filter (e.g. '*.ts'). Use `rg` via Bash for match counting.",
  subagent: [
    "Launch subagent for complex multistep tasks. Specify subagent_type to select agent. Pass a sessionID to resume a prior subagent conversation.",
    "Give detailed self-contained prompts. Agent result is not visible to user — summarize it. Launch multiple agents in parallel when possible.",
    "Don't use for: reading specific files (use Read), finding classes (use Glob), searching 2-3 files (use Read/Grep).",
  ].join(" "),
  question:
    "Ask user a question during execution. Answers returned as label arrays. 'Type your own answer' auto-added when custom=true. Put recommended option first with '(Recommended)' suffix.",
  webfetch:
    "Fetch URL content as markdown/text/html. Read-only. HTTP auto-upgrades to HTTPS. Prefer more specialized tools if available.",
  websearch:
    "Search the web through the configured search integration. Use for current information beyond the knowledge cutoff and to verify facts.",
};

// Pure helpers, exported for unit testing.

// Expand "55-64" (or "55") in oldString to the literal lines of the file.
// Returns undefined when no expansion applies.
export function expandLineRange(content: string, oldString: string): string | undefined {
  if (content.includes(oldString)) return undefined;
  const match = oldString.trim().match(LINE_RANGE_RE);
  if (!match) return undefined;
  const lines = content.split("\n");
  const startLine = parseInt(match[1], 10);
  const endLine = match[2] ? parseInt(match[2], 10) : startLine;
  if (startLine >= 1 && endLine <= lines.length && startLine <= endLine) {
    return lines.slice(startLine - 1, endLine).join("\n");
  }
  return undefined;
}

// Compact read tool output: relativize absolute paths under the location directory.
// Handles the V2 header format ("Read file <path>, lines a-b") and, defensively,
// the legacy V1 <path>/<type>/footer format. Directory listings pass through.
export function compactReadOutput(directory: string, output: string): string {
  if (!output) return output;
  if (output.includes("<type>directory</type>")) return output;

  // Legacy V1 shape: <path>...</path><type>file</type>...
  const pathMatch = output.match(/<path>(.+?)<\/path>/);
  if (pathMatch) {
    let compacted = output;
    const absPath = path.normalize(pathMatch[1]);
    const relPath = path.relative(directory, absPath);
    compacted = compacted.replace(`<path>${pathMatch[1]}</path>`, `<path>${relPath}</path>`);
    compacted = compacted.replace("<type>file</type>\n", "");
    compacted = compacted.replace(/\n\n\(End of file - total \d+ lines\)\n/, "\n");
    return compacted;
  }

  // V2 shape: first line is "Read file <abs path>" or "Read file <abs path>, lines a-b"
  const headerMatch = output.match(/^Read (?:file|directory) (.+?)(?:, lines \d+-\d+)?$/m);
  if (headerMatch) {
    const absPath = path.normalize(headerMatch[1]);
    const relPath = path.relative(directory, absPath);
    if (relPath && !relPath.startsWith("..")) {
      return output.replace(headerMatch[1], relPath);
    }
  }
  return output;
}

// Plain object (Plugin.define is an identity helper on this same interface).
const definition: Plugin = {
  id: "openslimedit",
  async setup(ctx: Context) {
    const directory = ctx.location.directory;

    // Aggressively shorten builtin tool descriptions.
    await ctx.tool.transform((editor) => {
      for (const [toolID, description] of Object.entries(SLIM)) {
        if (!editor.get(toolID)) continue;
        editor.update(toolID, (tool) => {
          tool.description = description;
        });
      }
    });

    // Expand line ranges in edit.oldString
    await ctx.tool.hook("execute.before", (event) => {
      if (event.tool !== "edit") return;
      const args = event.input as { filePath?: unknown; oldString?: unknown };
      if (typeof args.oldString !== "string" || typeof args.filePath !== "string" || !args.oldString) return;

      const filePath = path.isAbsolute(args.filePath)
        ? path.normalize(args.filePath)
        : path.resolve(directory, args.filePath);
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        return;
      }

      const expanded = expandLineRange(content, args.oldString);
      if (expanded !== undefined) {
        args.oldString = expanded;
      }
    });

    // Compact read output: relativize paths, strip legacy tags/footer
    await ctx.tool.hook("execute.after", (event) => {
      if (event.tool !== "read" || event.status !== "completed") return;
      const result = event.result as unknown as { content?: unknown } | undefined;
      if (!result || typeof result.content !== "string") return;
      (event as { result: unknown }).result = {
        ...result,
        content: compactReadOutput(directory, result.content),
      };
    });
  },
};

export default definition;
