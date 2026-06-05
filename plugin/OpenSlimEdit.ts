import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "fs";
import * as path from "path";

const LINE_RANGE_RE = /^(\d+)(?:\s*-\s*(\d+))?$/;

const SLIM: Record<string, string> = {
  read: [
    "Read file/directory. Prefer cachebro_read_file/cachebro_read_files instead — they cache and save tokens on re-reads.",
    "Absolute path required. Returns lines prefixed `<line>: <content>`. Dirs return entries with trailing `/`.",
    "Default 2000 lines. Use offset (1-indexed) for later sections. Lines >2000 chars truncated.",
    "Use grep or grepika to find relevant sections in large files. Use glob if unsure of path. Avoid tiny 30-line slices. Can read images/PDFs.",
  ].join(" "),
  edit: [
    "String replacement in files. oldString can be a line range like '55-64'.",
    "Use cachebro_read_file to read the file first or this tool will error. Match indentation exactly from read output (after `<line>: ` prefix — never include the prefix).",
    "Fails if oldString not found. Fails if multiple matches — add surrounding context to disambiguate.",
    "Use replaceAll for renaming across the file. Prefer editing over creating new files.",
  ].join(" "),
  multiedit: [
    "Multiple edits to one file atomically. Preferred over Edit for multiple changes to the same file.",
    "Provide file_path + edits array [{oldString, newString, replaceAll?}]. Edits apply sequentially — each on the result of the prior.",
    "All-or-nothing: if any edit fails, none apply. Ensure earlier edits don't break later ones' oldString.",
  ].join(" "),
  write:
    "Write/overwrite file. Must use cachebro_read_file on existing files first. Prefer Edit over Write for existing files. Never proactively create .md/README files.",
  bash: [
    "Run shell command in persistent session. Use workdir param instead of `cd &&`.",
    "For file ops use dedicated tools (cachebro_read_file/Edit/Write/Glob/Grep), not cat/sed/awk/echo.",
    "Quote paths with spaces. Long output auto-truncated — don't pipe through head/tail.",
    "Chain dependent commands with &&. Run independent commands as parallel tool calls.",
    "Git: never force-push, hard-reset, skip hooks, or auto-commit unless user explicitly asks.",
  ].join(" "),
  glob: "Fast file pattern matching (e.g. '**/*.ts'). For finding files by topic/relevance, prefer grepika (ranked results). Use glob for known patterns, specific extensions, or directory structure exploration. Batch multiple speculative searches.",
  grep: "Regex content search across files. For finding relevant files by topic, prefer grepika (ranked results). For symbol lookups, prefer CKB tools. Use grep for exact regex patterns, literal strings, or when you need line-level matches. Supports include filter (e.g. '*.ts'). Use `rg` via Bash for match counting.",
  list: "List files/dirs at absolute path. Prefer Glob/Grep when you know what to search for.",
  webfetch:
    "Fetch URL content as markdown/text/html. Read-only. HTTP auto-upgrades to HTTPS. Prefer more specialized tools if available.",
  task: [
    "Launch subagent for complex multistep tasks. Specify subagent_type to select agent. Include task_id to resume a prior session.",
    "Give detailed self-contained prompts. Agent result is not visible to user — summarize it. Launch multiple agents in parallel when possible.",
    "Don't use Task for: reading specific files (use cachebro_read_file), finding classes (use Glob), searching 2-3 files (use cachebro_read_files).",
  ].join(" "),
  batch:
    "Run 1-25 independent tool calls concurrently. All start in parallel. Partial failures don't stop others. Don't nest batches. Don't batch dependent operations.",
  todowrite:
    "Track tasks for the session. Use for 3+ step tasks, multiple items, or complex work. States: pending/in_progress/completed/cancelled. One in_progress at a time. Mark complete immediately. Skip for trivial single-step work.",
  todoread:
    "Read current todo list. Use frequently — before new tasks, after completions, when uncertain. Takes no parameters.",
  question:
    "Ask user a question during execution. Answers returned as label arrays. 'Type your own answer' auto-added when custom=true. Put recommended option first with '(Recommended)' suffix.",
  lsp: "LSP code intelligence. Prefer CKB tools (ckb_searchSymbols, ckb_findReferences, ckb_getCallGraph, ckb_explore) when available — they're faster and more token-efficient. Fallback operations: goToDefinition, findReferences, hover, documentSymbol, workspaceSymbol, goToImplementation, prepareCallHierarchy, incomingCalls, outgoingCalls. Requires filePath + line + character (both 1-based).",
};

export const OpenSlimeditPlugin: Plugin = async ({ directory }) => {
  function resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) return path.normalize(filePath);
    return path.resolve(directory, filePath);
  }

  return {
    // Aggressively shorten ALL tool descriptions
    "tool.definition": async (input: any, output: any) => {
      if (SLIM[input.toolID]) {
        output.description = SLIM[input.toolID];
      }
    },

    // Compact read output: shorten path, strip footer
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "read") return;
      if (output.output.includes("<type>directory</type>")) return;

      const pathMatch = output.output.match(/<path>(.+?)<\/path>/);
      if (!pathMatch) return;

      // Shorten to relative path
      const absPath = path.normalize(pathMatch[1]);
      const relPath = path.relative(directory, absPath);
      output.output = output.output.replace(
        `<path>${pathMatch[1]}</path>`,
        `<path>${relPath}</path>`,
      );

      // Remove type tag and footer
      output.output = output.output.replace("<type>file</type>\n", "");
      output.output = output.output.replace(
        /\n\n\(End of file - total \d+ lines\)\n/,
        "\n",
      );
    },

    // Expand line ranges in oldString
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "edit") return;
      const args = output.args;
      if (!args.oldString || !args.filePath) return;

      const filePath = resolvePath(args.filePath);
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        return;
      }

      if (content.includes(args.oldString)) return;

      const match = args.oldString.trim().match(LINE_RANGE_RE);
      if (!match) return;

      const lines = content.split("\n");
      const startLine = parseInt(match[1], 10);
      const endLine = match[2] ? parseInt(match[2], 10) : startLine;

      if (startLine >= 1 && endLine <= lines.length && startLine <= endLine) {
        args.oldString = lines.slice(startLine - 1, endLine).join("\n");
      }
    },
  } as any;
};

export default OpenSlimeditPlugin;
