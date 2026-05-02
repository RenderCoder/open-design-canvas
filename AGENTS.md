# Directory guide

This file is the single source of truth for agents entering this repository. Read this file first; after entering `apps/`, `packages/`, or `tools/`, read that layer's `AGENTS.md` for module-level details. Do not copy module details back into the root file; root stays focused on cross-repository boundaries, workflow, and commands.

## Core documentation index

- Product and onboarding: `README.md`, `README.zh-CN.md`, `QUICKSTART.md`.
- Contribution and environment: `CONTRIBUTING.md`, `CONTRIBUTING.zh-CN.md`.
- Architecture and protocols: `docs/spec.md`, `docs/architecture.md`, `docs/skills-protocol.md`, `docs/agent-adapters.md`, `docs/modes.md`.
- Roadmap and references: `docs/roadmap.md`, `docs/references.md`, `specs/current/maintainability-roadmap.md`.
- Directory-level agent guidance: `apps/AGENTS.md`, `packages/AGENTS.md`, `tools/AGENTS.md`.

## Workspace directories

- Workspace packages come from `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `tools/*`, and `e2e`.
- Top-level content directories: `skills/` (artifact-shape skills), `design-systems/` (brand `DESIGN.md` files), `craft/` (universal brand-agnostic craft rules a skill can opt into via `od.craft.requires`).
- `apps/web` is the Next.js 16 App Router + React 18 web runtime; do not restore `apps/nextjs`.
- `apps/daemon` is the local privileged daemon and `od` bin. It owns `/api/*`, agent spawning, skills, design systems, artifacts, and static serving.
- `apps/desktop` is the Electron shell; it discovers the web URL through sidecar IPC.
- `apps/packaged` is the thin packaged Electron runtime entry; it starts packaged sidecars and owns the `od://` entry glue only.
- `packages/contracts` is the pure TypeScript web/daemon app contract layer.
- `packages/sidecar-proto` owns the Open Design sidecar business protocol; `packages/sidecar` owns the generic sidecar runtime; `packages/platform` owns generic OS process primitives.
- `tools/dev` is the local development lifecycle control plane.
- `tools/pack` is the local packaged build/start/stop/logs control plane and mac beta release artifact preparation surface.
- `e2e` contains Playwright UI specs and Vitest/jsdom integration tests.

## Inactive or placeholder directories

- `apps/nextjs` and `packages/shared` have been removed; do not recreate or reference them.
- `.od/`, `.tmp/`, `e2e/.od-data`, Playwright reports, and agent scratch directories are local runtime data and must stay out of git.

# Development workflow

## Environment baseline

- Runtime target is Node `~24` and `pnpm@10.33.2`; use Corepack so the pnpm version pinned in `package.json` is selected.
- New project-owned entrypoints, modules, scripts, tests, reporters, and configs should default to TypeScript.
- Residual JavaScript is limited to generated output, vendored dependencies, explicitly documented compatibility build artifacts, and the allowlist in `scripts/check-residual-js.ts`.

## Local lifecycle

- Use `pnpm tools-dev` as the only local development lifecycle entry point.
- Do not add or restore root lifecycle aliases: `pnpm dev`, `pnpm dev:all`, `pnpm daemon`, `pnpm preview`, or `pnpm start`.
- Ports are governed by `tools-dev` flags: `--daemon-port` and `--web-port`.
- `tools-dev` exports `OD_PORT` for the web proxy target and `OD_WEB_PORT` for the web listener; do not use `NEXT_PORT`.

## Boundary constraints

- Keep shared API DTOs, SSE event unions, error shapes, task shapes, and example payloads in `packages/contracts`; update contracts before wiring divergent web/daemon request or response shapes.
- Keep `packages/contracts` pure TypeScript and free of Next.js, Express, Node filesystem/process APIs, browser APIs, SQLite, daemon internals, and sidecar control-plane dependencies.
- Keep project-owned entrypoints, modules, scripts, tests, reporters, and configs TypeScript-first; generated `dist/*.js` is runtime output, and source edits belong in `.ts` files.
- New `.js`, `.mjs`, or `.cjs` files need an explicit generated/vendor/compatibility reason and must pass `pnpm check:residual-js`.
- App business logic must not know about sidecar/control-plane concepts. Keep sidecar awareness in `apps/<app>/sidecar` or the desktop sidecar entry wrapper.
- Shared web/daemon app contracts belong in `packages/contracts`; that package must not depend on Next.js, Express, Node filesystem/process APIs, browser APIs, SQLite, daemon internals, or the sidecar control-plane protocol.
- Sidecar process stamps must have exactly five fields: `app`, `mode`, `namespace`, `ipc`, and `source`.
- Orchestration layers (`tools-dev`, `tools-pack`, packaged launchers) must call package primitives; do not hand-build `--od-stamp-*` args or process-scan regexes.
- Packaged runtime paths must be namespace-scoped and independent from daemon/web ports; ports are transient transport details only.
- Default runtime files live under `<project-root>/.tmp/<source>/<namespace>/...`; POSIX IPC sockets are fixed at `/tmp/open-design/ipc/<namespace>/<app>.sock`.

## Git commit policy

- Git commits must not include `Co-authored-by` trailers or any other co-author metadata.

## Validation strategy

- After package, workspace, or command-entry changes, run `pnpm install` so workspace links and generated dist entries stay fresh.
- Before marking regular work ready, run at least `pnpm typecheck` and `pnpm test`; run `pnpm build` as well when build boundaries are involved.
- For the web/e2e loop, prefer `pnpm tools-dev run web --daemon-port <port> --web-port <port>`.
- On a GUI-capable machine, validate desktop by running `pnpm tools-dev`, then `pnpm tools-dev inspect desktop status`.
- Stamp/namespace changes must validate two concurrent namespaces and run desktop `inspect eval` plus `inspect screenshot` for each namespace.
- Path/log changes must run `pnpm tools-dev logs --namespace <name> --json` and confirm log paths are under `.tmp/tools-dev/<namespace>/...`.

# Common commands

```bash
pnpm install
pnpm tools-dev
pnpm tools-dev start web
pnpm tools-dev run web --daemon-port 17456 --web-port 17573
pnpm tools-dev status --json
pnpm tools-dev logs --json
pnpm tools-dev inspect desktop status --json
pnpm tools-dev inspect desktop screenshot --path /tmp/open-design.png
pnpm tools-dev stop
pnpm tools-dev check
```

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:ui
pnpm test:ui:headed
pnpm test:e2e:live
pnpm check:residual-js
```

```bash
pnpm --filter @open-design/web typecheck
pnpm --filter @open-design/daemon test
pnpm --filter @open-design/desktop build
pnpm --filter @open-design/tools-dev build
pnpm --filter @open-design/tools-pack build
pnpm -r --if-present run typecheck
pnpm -r --if-present run test
```

# FAQ

## Why is there no root `pnpm dev` / `pnpm start`?

To avoid starting daemon, web, and desktop through inconsistent env, port, namespace, or log paths. All local lifecycle flows must go through `pnpm tools-dev`.

## Why should `apps/nextjs` not be restored?

The current web runtime is `apps/web`. The historical `apps/nextjs` layout has been removed from the active repo shape; restoring it would reintroduce duplicate app boundaries and stale scripts.

## How does desktop discover the web URL?

Desktop queries runtime status through sidecar IPC. The web URL comes from `tools-dev` launch status, not from desktop guessing ports or reading web internals.

## How are sidecar-proto, sidecar, and platform split?

`@open-design/sidecar-proto` owns Open Design app/mode/source constants, namespace validation, stamp fields/flags, IPC message schema, status shapes, and error semantics. `@open-design/sidecar` provides only generic bootstrap, IPC transport, path/runtime resolution, launch env, and JSON runtime files. `@open-design/platform` provides only generic OS process stamp serialization, command parsing, and process matching/search primitives, consuming the proto descriptor.

## Where is data written?

The daemon writes `.od/` by default: SQLite at `.od/app.sqlite`, agent CWDs under `.od/projects/<id>/`, and saved renders under `.od/artifacts/`. `OD_DATA_DIR` can relocate data relative to the repo root; Playwright uses it to isolate test data.

## When is `pnpm install` required?

Run `pnpm install` after changing package manifests, workspace layout, command entrypoints, bin/link-related content, or after adding/removing workspace packages.

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

<!-- END BEADS INTEGRATION -->

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

<!-- FIGMA_CODEX_UPGRADE_START -->
# Figma Native + Codex Upgrade Working Agreements

这些规则适用于 Open Design → Figma-native 改造计划。

## Beads 是长期任务来源

- 长周期任务必须用 `bd`，不要只依赖临时 todo 或聊天上下文。
- 每个会话开始运行：`bd prime || true`、`bd ready --json`。
- 开始做任务前必须运行：`bd show <id> --long`，然后 `bd update <id> --claim`。
- 不允许只看任务标题就动手。
- 工作中出现关键决策、发现风险、依赖变化时，用 `bd update <id> --notes "..."` 记录。
- 完成任务后运行验证命令，并用 `bd close <id> --reason "Completed: ..."` 关闭。
- 发现新工作，创建新 bead；不要扩大当前 bead 的范围。

## Figma-native 改造原则

- Open Design 的定位：设计流程、prompt stack、skill system、design systems、质检与编排层。
- Codex CLI 的定位：工程改造、脚本执行、非交互式/交互式 agent 执行层。
- Figma Remote MCP 的定位：真实 Figma-native canvas 写入层。
- 不要把 Figma REST API 当作主写画布通道；画布创建/更新优先通过 Figma MCP 的 `use_figma`。
- Figma 写入必须产生可编辑结构：frames、components、instances、variables、styles、Auto Layout、semantic layer names。
- 禁止把 screenshot-only mockup、HTML artifact 或一张静态图片当成 Figma-native 交付物。

## Figma MCP 使用规则

- 配置 Codex 的 Figma Remote MCP：

  ```bash
  codex mcp add figma --url https://mcp.figma.com/mcp
  ```

  按提示完成 Figma OAuth；不要把 OAuth token、私有 file ID 或客户设计内容写入仓库。普通工程任务不要强制依赖 OAuth，真实 Figma smoke test 再验证连接。
- 真实写画布前，必须确认 Figma MCP 已连接。
- 需要新文件时优先使用 `create_new_file`；已有文件必须要求用户提供 Figma file URL 或 selection URL。
- `use_figma` 前必须加载/遵守 Figma 官方 `figma-use` skill；若环境不可用，要把问题记录为阻塞或验证风险。
- 先用 `search_design_system` 查 components / variables / styles，再创建 primitives。
- 大型上下文先用 `get_metadata` 获取 sparse tree，不要一次性拉取巨大 frame。
- 需要视觉校验时用 `get_screenshot`；需要 token 校验时用 `get_variable_defs`。
- Web app 有可运行 UI 且含图片时，采用 `generate_figma_design` 捕获作为视觉参考，再用 `use_figma` 生成/整理 design-system-linked 结构。

## Codex 工程规则

- 真实仓库代码优先于本包文档。任何文件路径都要先 `rg` / `find` / `sed` 确认。
- 不要使用过时的 `--full-auto`。脚本和文档优先使用 `--sandbox workspace-write`。
- 使用 Codex JSONL 时，要解析 MCP tool calls、plan updates、file changes、command executions。
- 每次改动后运行项目实际支持的 lint/test/check 命令；如果命令不存在，先查 `package.json`、`pnpm-workspace.yaml`、`Makefile`、`tools` 目录。
- 开源质量要求：文档、测试、可扩展 schema、错误处理、边界说明同步完成。

## 产物质量标准

Figma-native MVP 通过的最低标准：

- 用户能选择 Figma-native skill。
- 用户能提供或新建 Figma file target。
- Prompt composer 能进入 Figma-native mode，并明确禁止 HTML 作为最终交付。
- Codex adapter 能运行现代 `codex exec`，并可解析 JSONL 中的 MCP 事件。
- UI 能显示 Figma result card：file URL、page/frame、created/updated nodes、reused components、variables/styles、screenshots/metadata checks、known issues。
- 至少一个 figma-native-screen skill 能被发现、被注入、被测试。
<!-- FIGMA_CODEX_UPGRADE_END -->
