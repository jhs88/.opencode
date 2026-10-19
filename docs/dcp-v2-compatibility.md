# DCP OpenCode V2 compatibility audit

Audited 2026-10-05 using the project's release notes, source repository, issues and pull requests through GitHub's first-party API, and npm's package registry. No crawl or hosted Firecrawl fallback was used. The other machine's OpenCode version and exact failure have not been established, so upstream reports identify possibilities rather than its diagnosed cause.

## Published support and maintenance status

**V2 support has already shipped.** DCP **3.2.0**, released 2026-09-20, adds native OpenCode V2 compression, slash commands, and the DCP TUI panel, while retaining V1 support. The project owner confirmed that version in the original V2 support issue. V2 compression permissions currently support `allow` and `deny`; `ask` remains unsupported. [Release notes](https://github.com/Tarquinen/opencode-dynamic-context-pruning/releases/tag/v3.2.0), [owner confirmation](https://github.com/Tarquinen/opencode-dynamic-context-pruning/issues/618#issuecomment-5763363779).

The npm registry still identifies **3.2.0** as `latest`. Although `beta` is numerically higher at **3.2.8-beta0**, that artifact was published **2026-04-01**, before the stable V2 release. Its version number alone is not evidence of a newer V2 fix. [npm registry metadata](https://registry.npmjs.org/@tarquinen%2Fopencode-dcp).

The repository shows recent maintenance: the owner merged published-package installation verification and corrected V2 installation instructions on September 21, then project-status documentation on September 25. The merged installation work reports DCP 3.2.0 loading on OpenCode 1.18.31 and 2.0.12, with the V2 command registered. [Installation verification PR](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/626), [September 25 merge](https://github.com/Tarquinen/opencode-dynamic-context-pruning/commit/f8232fde1e63c2251687e4d9634bd53ce11568cb).

The maintainer says DCP development has slowed because most new context-management work moved to **Sleev**, and new features land there first. This supports describing DCP as maintained with reduced development priority, rather than abandoned. That assessment is an inference from the project statement and recent merges. The reviewed release notes, project status, and pending compatibility PRs contain **no announced release date for the next DCP update**. [Project status](https://github.com/Tarquinen/opencode-dynamic-context-pruning/blob/f8232fde1e63c2251687e4d9634bd53ce11568cb/README.md#project-status).

## Known limitations and pending fixes

| Source | Status on audit date | What it establishes |
| --- | --- | --- |
| [PR #651](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/651) | Open, unmerged | A contributor proposes updating `@opencode/plugin` to 2.0.22, changing OpenTUI packaging, and adapting to the newer nested media asset shape. This is proposed work, not a released fix or maintainer promise. |
| [PR #652](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/652) | Open, unmerged | A contributor reports silent plugin loading failures when the runtime `@opencode-ai/plugin` import cannot resolve in OpenCode's package cache, and proposes bundling it. The related [issue #585](https://github.com/Tarquinen/opencode-dynamic-context-pruning/issues/585) originally reports V1 failures, so it does not establish that every V2 installation fails. |
| [PR #627](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/627) | Open, unmerged | Broader proposed V2 compatibility improvements, including reported compression problems after backend restarts. Review comments identify unresolved concerns; it is not a ready published workaround. |
| [PR #628](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/628) | Open, unmerged | A proposed fix to expose `/dcp-compress` in the V2 TUI slash palette. A missing autocomplete entry is distinct from the server command or compression tool failing. |

The merged V2 implementation also notes that V2 lacks the V1 text-completion hook used to remove model-echoed reference markers such as `@4@`. This is a documented display limitation, separate from loading or compression execution. [Merged V2 support PR](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/617).

An important correction: a commenter initially claimed that DCP 3.2.0's V2 token tracking was entirely broken in issue #618. The same person explicitly retracted that claim in **issue #631**, reporting working token counting, request-level compression, and persisted state on OpenCode **2.0.16** after correcting their configuration. The remaining report concerns misplaced threshold keys, limited warnings, and the requirement to restart after configuration edits. The earlier comment should not be cited as proof of blanket V2 incompatibility. [Corrected report](https://github.com/Tarquinen/opencode-dynamic-context-pruning/issues/631).

## This configuration and diagnostic implications

The current V2 checkout pins `@tarquinen/opencode-dcp@3.2.0`; `dcp.jsonc` sets `compress.permission` to `allow` and enables debug logging. Therefore the documented unsupported `ask` setting is not present here. Published npm metadata lists the V1 API package `@opencode-ai/plugin >=1.18.29` as a peer dependency; the inspected 3.2.0 bundle contains runtime imports of that package. That matches the mechanism described in PR #652, but missing dependency resolution on the other machine remains unconfirmed. [Published package metadata and tarball reference](https://registry.npmjs.org/@tarquinen%2Fopencode-dcp/3.2.0), [proposed bundling fix](https://github.com/Tarquinen/opencode-dynamic-context-pruning/pull/652).

Distinguish whether the package fails to load, the TUI panel/command is missing, compression throws, or automatic nudges simply have not triggered. The exact OpenCode version and startup error or DCP log are needed to select among those paths. The README documents `~/.config/opencode/logs/dcp/` for debug logs and requires restarting OpenCode after DCP configuration changes. [Configuration and logging documentation](https://github.com/Tarquinen/opencode-dynamic-context-pruning/blob/f8232fde1e63c2251687e4d9634bd53ce11568cb/README.md#configuration).

## Local terminal verification

Tested 2026-10-05 on this machine with OpenCode **2.0.20** and the configured DCP **3.2.0**, using standalone servers rather than restarting the shared background service.

- Launched the terminal interface and opened DCP through the command palette in a disposable diagnostic session. The DCP panel opened.
- Polled a persistent standalone server's `/api/plugin` after initialization: `opencode-dcp` reported `state.status: active` and both server/TUI features. `/api/command` included `dcp` and `dcp-compress`. A one-shot API call can return an empty list before initialization; that alone is not a plugin load failure.
- A minimal read-only model prompt returned `OK` in approximately seven seconds with DCP enabled.
- Explicitly invoked compression in that same disposable session. The completed `compress` tool returned `Compressed 2 messages into [Compressed conversation section].`; the next model response was `DCP_TEST_OK`. The summary was also verified in DCP's persisted session state. This tests manual tool compression; it does not establish every automatic pruning strategy or compatibility with other client versions.
- The cache used here contains the published DCP package's `@opencode-ai/plugin` peer at 1.18.34. Thus the missing-peer condition reported in PR #652 was not reproduced here.

An initial harness inadvertently let OpenCode consume the harness script through inherited stdin; that request was interrupted at the test timeout and is not counted as evidence of a DCP failure. The corrected test closed stdin and completed successfully. All temporary standalone instances were stopped. No configuration changes or commits were made. The other machine's specific failure remains unconfirmed.
