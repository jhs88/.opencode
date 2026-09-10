import type { Plugin } from "@opencode-ai/plugin";

import path from "path";
import { fileURLToPath } from "url";
import { existsSync, appendFileSync, mkdirSync } from "fs";
import { homedir } from "os";

// Bridge between cachebro MCP file reads and OpenCode's FileTime tracking.
//
// Problem: OpenCode requires files to be read (via built-in Read tool) before
// they can be edited. Cachebro's MCP read_file/read_files tools don't register
// with FileTime, so edits fail with "You must read file X before overwriting it."
//
// Solution: Hook tool.execute.before to capture file paths from cachebro args,
// then hook tool.execute.after to register those paths via fileTime.read().

// Tool names after MCP sanitization (clientName_toolName)
const CACHEBRO_READ_FILE = "cachebro_read_file";
const CACHEBRO_READ_FILES = "cachebro_read_files";

function isCachebroReadTool(tool: string): boolean {
  return tool === CACHEBRO_READ_FILE || tool === CACHEBRO_READ_FILES;
}

// Stash file paths from tool.execute.before keyed by callID
const pendingReads = new Map<string, string[]>();

// Logging setup
const LOG_DIR = path.join(
  homedir(),
  ".config",
  "opencode",
  "logs",
  "cachebro-bridge",
);
const LOG_FILE = path.join(LOG_DIR, "cachebro.log");
let loggingEnabled = true;

function log(message: string) {
  if (!loggingEnabled) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `${timestamp} ${message}\n`);
  } catch {
    // Silently fail if logging doesn't work
  }
}

function extractPaths(tool: string, args: Record<string, unknown>): string[] {
  if (tool === CACHEBRO_READ_FILE) {
    const p = args.path;
    return typeof p === "string" ? [p] : [];
  }
  if (tool === CACHEBRO_READ_FILES) {
    const paths = args.paths;
    if (Array.isArray(paths)) {
      return paths.filter((p): p is string => typeof p === "string");
    }
  }
  return [];
}

export const CachebroBridgePlugin: Plugin = async (input) => {
  const fileTime = input.fileTime;
  const projectDir = input.directory;
  log(
    `[cachebro-bridge] initializing plugin (${fileTime ? "FileTime available" : "FileTime NOT available"}, projectDir: ${projectDir})`,
  );
  if (!fileTime) {
    log(
      "[cachebro-bridge] fileTime not available on PluginInput — plugin disabled",
    );
    return {};
  }

  log("[cachebro-bridge] active, cachebro reads will register with FileTime");

  // Normalize path to absolute with forward slashes, matching OpenCode conventions
  function normalizePath(filepath: string): string {
    let resolved = filepath;
    if (!path.isAbsolute(filepath)) {
      resolved = path.resolve(projectDir, filepath);
    }
    // OpenCode uses forward slashes consistently; path.resolve returns backslashes on Windows
    return resolved.replace(/\\/g, "/");
  }

  return {
    "tool.execute.before": async (
      hookInput: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> },
    ) => {
      if (!isCachebroReadTool(hookInput.tool)) return;
      const rawPaths = extractPaths(hookInput.tool, output.args);
      const paths = rawPaths.map(normalizePath);
      log(
        `[cachebro-bridge] captured ${paths.length} paths from tool ${hookInput.tool} (callID: ${hookInput.callID}): ${paths.join(", ")}`,
      );
      if (paths.length > 0) {
        pendingReads.set(hookInput.callID, paths);
      }
    },

    "tool.execute.after": async (hookInput: {
      tool: string;
      sessionID: string;
      callID: string;
    }) => {
      if (!isCachebroReadTool(hookInput.tool)) return;
      const paths = pendingReads.get(hookInput.callID);
      log(
        `[cachebro-bridge] processing after hook for tool ${hookInput.tool} (callID: ${hookInput.callID}), ${paths ? paths.length : 0} paths to register with FileTime`,
      );
      pendingReads.delete(hookInput.callID);
      if (!paths || paths.length === 0) return;

      for (const filepath of paths) {
        log(
          `[cachebro-bridge] registering read of file ${filepath} with FileTime for session ${hookInput.sessionID}`,
        );
        fileTime.read(hookInput.sessionID, filepath);
      }
    },
  };
};
