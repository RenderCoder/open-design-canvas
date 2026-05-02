# Open Design Canvas Repo Map

Updated: 2026-05-02

This baseline was produced for Beads task `open-design-canvas-w39` / task key
`A00`. It records the current fork as observed on disk, not the desired future
architecture. Later Figma-native tasks should treat this file as a starting map
and re-check paths before editing.

## Inspection Sources

Required context read before writing:

- `AGENTS.md`
- `GOLDEN_PROMPT.md`
- `README.FIGMA_CODEX_UPGRADE.md`
- `AGENTS.figmacodex.append.md`
- `.ai/figma-codex/docs/RESEARCH_BRIEF.md`
- `.ai/figma-codex/docs/ARCHITECTURE.md`
- `.ai/figma-codex/docs/IMPLEMENTATION_GUIDE.md`
- `.ai/figma-codex/docs/OPEN_DESIGN_PATCH_GUIDE.md`
- `.ai/figma-codex/docs/QA_CHECKLIST.md`
- `.ai/figma-codex/task_manifest.json`
- `.ai/figma-codex/tasks/A00.md`

Repo inspections used:

- `find . -maxdepth 3 \( -name package.json -o -name pnpm-workspace.yaml -o -name turbo.json -o -name Makefile -o -name vitest.config.ts -o -name playwright.config.ts -o -name AGENTS.md \)`
- `find apps -maxdepth 3 -type f ...`
- `find packages tools e2e -maxdepth 3 -type f ...`
- `find skills design-systems craft -maxdepth 3 -type f`
- `rg "composeSystemPrompt|DISCOVERY_AND_PHILOSOPHY|DECK_FRAMEWORK|prompt" apps/web apps/daemon packages -n`
- `rg "listSkills|parseFrontmatter|previewType|skillMode|inferMode|normalizeSurface" apps/daemon apps/web packages -n`
- `rg "codex exec|full-auto|--json|json-event-stream|spawn" apps/daemon apps/web packages tools e2e -n`
- `rg "artifact|preview|lint|export|download|iframe|srcdoc" apps/daemon apps/web packages e2e -n`
- `cat package.json` and package manifests under `apps/`, `packages/`, `tools/`, and `e2e`

Note: the installed `bd` command does not support `bd show <id> --long`.
The required command was attempted first and failed with `unknown flag: --long`;
`bd show open-design-canvas-w39 --json` was used to read the full issue body.

## Workspace Shape

The workspace is a pnpm monorepo declared in `pnpm-workspace.yaml`:

- `apps/*`
- `packages/*`
- `tools/*`
- `e2e`

Root `package.json`:

- package name: `open-design`
- runtime target: Node `~24`
- package manager: `pnpm@10.33.2`
- root bin: `od -> ./apps/daemon/dist/cli.js`
- root build: `pnpm --filter @open-design/web build`
- root typecheck: recursive package typecheck, daemon build, residual JS check
- root test: recursive package tests, one workspace at a time

No `Makefile` or `turbo.json` was found at the inspected depth.

## Applications

### `apps/web`

Role: Next.js 16 App Router plus React 18 client runtime.

Key paths:

- `apps/web/app/layout.tsx`: App Router entry shell.
- `apps/web/src/App.tsx`: main client shell.
- `apps/web/src/router.ts`: client routing entry.
- `apps/web/src/components/NewProjectPanel.tsx`: project creation form and metadata builder.
- `apps/web/src/components/ProjectView.tsx`: project chat/workspace runtime.
- `apps/web/src/components/AssistantMessage.tsx`: agent event rendering.
- `apps/web/src/components/ToolCard.tsx`: tool event card rendering.
- `apps/web/src/components/FileViewer.tsx`: file preview/export surface.
- `apps/web/src/components/PreviewModal.tsx`: fullscreen preview surface.
- `apps/web/src/providers/daemon.ts`: `/api/runs` SSE client and daemon event translator.
- `apps/web/src/providers/registry.ts`: registry fetch helpers.
- `apps/web/src/artifacts/parser.ts`: streaming `<artifact>` tag parser.
- `apps/web/src/artifacts/renderer-registry.ts`: HTML/deck/React/Markdown/SVG renderer selection.
- `apps/web/src/artifacts/manifest.ts`: artifact manifest support.
- `apps/web/src/runtime/srcdoc.ts`: sandboxed HTML preview document.
- `apps/web/src/runtime/exports.ts`, `markdown.tsx`, `zip.ts`: export helpers.
- `apps/web/src/media/models.ts`: image/video/audio model catalog.
- `apps/web/src/types.ts`: web-facing re-exports from `@open-design/contracts`.
- `apps/web/next.config.ts`: rewrites `/api/*`, `/artifacts/*`, and `/frames/*` to `OD_PORT` in dev; static export in regular production.

Current Figma-native gap:

- Project creation tabs are `prototype`, `deck`, `template`, `image`, `video`, `audio`, and `other`; there is no `figma` create tab yet.
- UI `AgentEvent` currently models status/text/thinking/tool/usage/raw. It has no Figma-specific progress event or result card yet.

### `apps/daemon`

Role: local Express plus SQLite daemon and `od` CLI. It owns API routes,
agent spawning, skills, design systems, artifact persistence, media generation,
static serving, and `.od/` data.

Key paths:

- `apps/daemon/src/cli.ts`: `od` command entry.
- `apps/daemon/src/server.ts`: Express API server, run orchestration, prompt composition call site.
- `apps/daemon/src/db.ts`: SQLite schema and project/conversation/message/tab persistence.
- `apps/daemon/src/projects.ts`: project filesystem helpers.
- `apps/daemon/src/runs.ts`: chat run state/SSE service.
- `apps/daemon/src/agents.ts`: CLI agent registry and spawn argument builders.
- `apps/daemon/src/json-event-stream.ts`: Codex/Gemini/OpenCode/Cursor JSONL parser.
- `apps/daemon/src/claude-stream.ts`: Claude stream-json parser.
- `apps/daemon/src/copilot-stream.ts`: GitHub Copilot stream parser.
- `apps/daemon/src/acp.ts`, `apps/daemon/src/pi-rpc.ts`: ACP and Pi RPC sessions.
- `apps/daemon/src/skills.ts`: skill discovery and frontmatter normalization.
- `apps/daemon/src/design-systems.ts`: `DESIGN.md` registry.
- `apps/daemon/src/craft.ts`: `craft/*.md` loader for skill-declared craft references.
- `apps/daemon/src/prompts/system.ts`: daemon prompt composer used by `/api/runs`.
- `apps/daemon/src/prompts/discovery.ts`: OD discovery and design-philosophy layer.
- `apps/daemon/src/prompts/deck-framework.ts`: fixed deck framework directive.
- `apps/daemon/src/prompts/media-contract.ts`: image/video/audio generation contract.
- `apps/daemon/src/lint-artifact.ts`: HTML artifact lint and agent feedback.
- `apps/daemon/src/artifact-manifest.ts`: artifact manifest validation.
- `apps/daemon/src/design-system-preview.ts`, `design-system-showcase.ts`: design-system HTML previews.
- `apps/daemon/src/document-preview.ts`: text/document preview helper.
- `apps/daemon/src/deploy.ts`: Vercel deploy helper.
- `apps/daemon/src/media.ts`: media generation and task tracking.
- `apps/daemon/sidecar/`: daemon sidecar entry.

Important route clusters in `apps/daemon/src/server.ts`:

- `/api/agents`
- `/api/skills`, `/api/skills/:id`, `/api/skills/:id/example`
- `/api/design-systems`, `/api/design-systems/:id`, `/preview`, `/showcase`
- `/api/prompt-templates`, `/api/prompt-templates/:surface/:id`
- `/api/projects/*`, `/api/projects/:id/files/*`, `/api/projects/:id/upload`
- `/api/runs`, `/api/runs/:id/events`, `/api/runs/:id/cancel`
- `/api/artifacts/save`, `/api/artifacts/lint`, `/artifacts/*`
- `/frames/*`
- media and deploy routes

Current Figma-native gap:

- `apps/daemon/src/agents.ts` still builds Codex as `codex exec --json --skip-git-repo-check --full-auto -c sandbox_workspace_write.network_access=true ... -`.
- `.ai/figma-codex/docs/OPEN_DESIGN_PATCH_GUIDE.md` says the target is `codex exec --json --sandbox workspace-write` and not `--full-auto`; this is already tracked by task `C20`.
- `apps/daemon/src/json-event-stream.ts` parses Codex status, agent messages, usage, and command executions only. It does not yet parse MCP tool calls, plan updates, file changes, or Figma progress.

### `apps/desktop`

Role: Electron shell. It discovers the web URL from sidecar IPC rather than
guessing ports.

Key paths:

- `apps/desktop/package.json`
- built output under `apps/desktop/dist/main/*` after build

### `apps/packaged`

Role: thin packaged Electron runtime entry. It starts packaged daemon/web
sidecars and registers `od://` glue.

Key paths:

- `apps/packaged/src/index.ts`
- `apps/packaged/src/launch.ts`
- `apps/packaged/src/sidecars.ts`
- `apps/packaged/src/protocol.ts`
- `apps/packaged/src/paths.ts`
- `apps/packaged/src/config.ts`
- `apps/packaged/AGENTS.md`

## Packages

### `packages/contracts`

Role: pure TypeScript shared contracts for the web/daemon app boundary.

Key paths:

- `packages/contracts/src/api/projects.ts`: `ProjectKind`, `ProjectMetadata`, project DTOs.
- `packages/contracts/src/api/registry.ts`: agent, skill, design-system DTOs.
- `packages/contracts/src/sse/chat.ts`: chat SSE events and `DaemonAgentPayload`.
- `packages/contracts/src/prompts/system.ts`: duplicate/shared prompt composer used by the web path.
- `packages/contracts/src/index.ts`: public exports.

Current Figma-native gap:

- `ProjectKind` does not include `figma`.
- `ProjectMetadata` has no `figmaTarget` or `figmaOutputSettings`.
- `SkillSummary.mode` and `surface` unions do not include `figma`.
- `DaemonAgentPayload` has no MCP/Figma-specific event variant.
- There are two prompt-composer implementations: `apps/daemon/src/prompts/system.ts` and `packages/contracts/src/prompts/system.ts`. Future prompt changes must keep both call paths aligned or consolidate intentionally.

### `packages/sidecar-proto`

Role: Open Design sidecar business protocol.

Key path:

- `packages/sidecar-proto/src/index.ts`

Owns app/mode/source constants, namespace validation, the five-field stamp
descriptor (`app`, `mode`, `namespace`, `ipc`, `source`), IPC messages, status
types, and error semantics.

### `packages/sidecar`

Role: generic sidecar runtime primitives.

Key path:

- `packages/sidecar/src/index.ts`

Includes bootstrap, IPC transport, path/runtime resolution, launch env, and
JSON runtime file helpers.

### `packages/platform`

Role: generic OS process primitives.

Key path:

- `packages/platform/src/index.ts`

Includes process spawning, command parsing, process matching/search, and stamp
serialization through the sidecar protocol descriptor.

## Tools

### `tools/dev`

Role: local development lifecycle control plane and `tools-dev` bin.

Key paths:

- `tools/dev/src/index.ts`
- `tools/dev/src/config.ts`
- `tools/dev/src/sidecar-client.ts`
- `tools/dev/src/diagnostics.ts`

Use `pnpm tools-dev` instead of root `pnpm dev` or `pnpm start`.

### `tools/pack`

Role: packaged build/start/stop/logs and release artifact preparation.

Key paths:

- `tools/pack/src/index.ts`
- `tools/pack/src/mac.ts`
- `tools/pack/src/win.ts`
- `tools/pack/src/resources.ts`
- `tools/pack/AGENTS.md`

## Skills, Design Systems, Craft, and Templates

Observed filesystem counts on 2026-05-02:

- `skills/*/SKILL.md`: 57
- `design-systems/*/DESIGN.md`: 131
- skills with `od.mode: figma`: 5

Key directories:

- `skills/`: Open Design skills with extended `od:` frontmatter.
- `skills/figma-native-screen/`
- `skills/figma-native-landing/`
- `skills/figma-native-dashboard/`
- `skills/figma-native-mobile-flow/`
- `skills/figma-canvas-critique/`
- `design-systems/`: `DESIGN.md` based design systems.
- `design-systems/figma-native-base/DESIGN.md`
- `design-systems/figma-native-base/FIGMA.md`
- `design-systems/figma-native-base/tokens.json`
- `design-systems/figma-native-base/component-map.json`
- `craft/`: universal craft rules loaded through `od.craft.requires`.
- `prompt-templates/`: image/video prompt templates.
- `assets/prompt-templates/`: prompt-template preview assets.
- `assets/frames/`: device/browser frame HTML files served through `/frames/*`.

Current Figma-native gap:

- The Figma-native skills and `figma-native-base` design system already exist
  on disk, but the core registry contract only recognizes web/image/video/audio
  surfaces and prototype/deck/template/design-system/image/video/audio modes.
- `apps/daemon/src/skills.ts` will preserve an explicit `od.mode: figma` at
  runtime because it takes `data.od?.mode`, but TypeScript contracts and UI
  filters do not yet model that value.
- `normalizeSurface` in `apps/daemon/src/skills.ts` only allows `web`, `image`,
  `video`, and `audio`; `od.surface: figma` currently normalizes to `web`.

## Prompt Composition Baseline

Daemon prompt path:

- `apps/daemon/src/server.ts` resolves project metadata, skill, design system,
  craft sections, and template snapshots.
- It calls `composeSystemPrompt` from `apps/daemon/src/prompts/system.ts`.
- The result is folded into the user message for local CLI agents.

Web/API prompt path:

- `apps/web/src/components/ProjectView.tsx` imports `composeSystemPrompt` from
  `@open-design/contracts`.
- `packages/contracts/src/prompts/system.ts` mirrors much of the daemon prompt
  composer.

Prompt stack today:

- discovery and design-philosophy directive
- official designer prompt
- active `DESIGN.md`
- optional craft references
- active `SKILL.md`
- project metadata
- deck framework directive for deck projects
- media generation contract for image/video/audio projects

Current Figma-native gap:

- No `FIGMA_NATIVE_DIRECTIVE` exists in either prompt composer.
- Existing discovery text still frames outputs as HTML artifacts.
- There is no prompt-level switch for `metadata.outputMode === "figma-native"`.

## Agent Adapter and Event Stream Baseline

Agent registry:

- `apps/daemon/src/agents.ts` defines Claude Code, Codex CLI, Gemini CLI,
  OpenCode, Hermes, Kimi, Cursor Agent, GitHub Copilot CLI, Qwen, Pi, and Kiro
  adapter metadata.

Codex adapter today:

- command starts with `exec`
- uses `--json`
- uses `--skip-git-repo-check`
- uses `--full-auto`
- configures `sandbox_workspace_write.network_access=true`
- optionally disables plugins with `OD_CODEX_DISABLE_PLUGINS=1`
- passes `-C <project cwd>`
- sends the composed prompt through stdin using trailing `-`
- parses stdout through `apps/daemon/src/json-event-stream.ts` with parser kind
  `codex`

Structured event flow:

- daemon parser emits `DaemonAgentPayload` from `packages/contracts/src/sse/chat.ts`
- web provider translates payloads in `apps/web/src/providers/daemon.ts`
- UI renders generic tool cards in `apps/web/src/components/AssistantMessage.tsx`
  and `apps/web/src/components/ToolCard.tsx`

Current Figma-native gap:

- Codex MCP tool-call events are not parsed into typed events yet.
- Figma-specific progress phases are not exposed to the UI yet.
- There is no parser/result schema for `figma_native_result` in app code yet.

## Preview, Export, and Persistence Baseline

HTML artifact flow:

- Agent emits `<artifact identifier="..." type="..." title="...">...</artifact>`.
- `apps/web/src/artifacts/parser.ts` parses streamed artifact tags.
- `apps/daemon/src/server.ts` `/api/artifacts/save` persists generated HTML
  under runtime artifact storage and returns a served URL.
- `apps/daemon/src/lint-artifact.ts` lints saved or posted HTML.
- `apps/web/src/artifacts/renderer-registry.ts` chooses renderers for HTML,
  deck HTML, React component, Markdown, and SVG files.
- `apps/web/src/runtime/srcdoc.ts` builds sandboxed iframe HTML.
- `apps/web/src/components/FileViewer.tsx` and `PreviewModal.tsx` expose preview
  and export actions.
- `apps/daemon/src/deploy.ts` prepares Vercel deploy file sets.

Document/file flow:

- Project files live under `.od/projects/<id>/`.
- Project metadata and conversations live in `.od/app.sqlite` by default.
- `apps/daemon/src/document-preview.ts` supports document preview.
- `apps/web/src/components/FileWorkspace.tsx` manages file tabs.

Current Figma-native gap:

- The persistence and preview system is oriented around local files and HTML
  artifacts. A Figma-native result will need a result envelope/card rather than
  a saved iframe artifact as the final deliverable.

## Test and Validation Map

Canonical validation command reference for later beads:

- `.ai/figma-codex/docs/VALIDATION_COMMANDS.md`

Root commands from `package.json`:

- `pnpm install`
- `pnpm tools-dev`
- `pnpm tools-pack`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:ui`
- `pnpm test:ui:headed`
- `pnpm test:e2e:live`
- `pnpm check:residual-js`

Root commands that do not exist in this fork:

- No root `pnpm lint` script.
- No root `pnpm format` script.
- No root `pnpm dev`, `pnpm start`, `pnpm dev:all`, or `pnpm daemon`
  lifecycle alias; use `pnpm tools-dev`.
- No `Makefile`.
- No `turbo.json`; this workspace is not currently driven by Turbo.

Package commands:

- `pnpm --filter @open-design/web build`
- `pnpm --filter @open-design/web typecheck`
- `pnpm --filter @open-design/web test`
- `pnpm --filter @open-design/daemon build`
- `pnpm --filter @open-design/daemon typecheck`
- `pnpm --filter @open-design/daemon test`
- `pnpm --filter @open-design/desktop build`
- `pnpm --filter @open-design/desktop typecheck`
- `pnpm --filter @open-design/packaged build`
- `pnpm --filter @open-design/packaged typecheck`
- `pnpm --filter @open-design/contracts typecheck`
- `pnpm --filter @open-design/sidecar-proto test`
- `pnpm --filter @open-design/sidecar-proto typecheck`
- `pnpm --filter @open-design/sidecar test`
- `pnpm --filter @open-design/sidecar typecheck`
- `pnpm --filter @open-design/platform test`
- `pnpm --filter @open-design/platform typecheck`
- `pnpm --filter @open-design/tools-dev test`
- `pnpm --filter @open-design/tools-dev typecheck`
- `pnpm --filter @open-design/tools-dev build`
- `pnpm --filter @open-design/tools-pack typecheck`
- `pnpm --filter @open-design/tools-pack build`
- `pnpm --filter @open-design/e2e test`
- `pnpm --filter @open-design/e2e typecheck`
- `pnpm --filter @open-design/e2e test:ui`
- `pnpm --filter @open-design/e2e test:ui:headed`
- `pnpm --filter @open-design/e2e test:e2e:live`

Useful targeted tests for future Figma-native work:

- Skill registry changes: `pnpm --filter @open-design/daemon test -- tests/system-prompt-template.test.ts tests/json-event-stream.test.ts`
- Agent/Codex adapter changes: `pnpm --filter @open-design/daemon test -- tests/agents.test.ts tests/json-event-stream.test.ts`
- Contract/type changes: `pnpm --filter @open-design/contracts typecheck`
- Artifact parser/renderer changes: `pnpm --filter @open-design/web test -- src/artifacts/renderer-registry.test.ts src/artifacts/manifest.test.ts`
- UI result rendering changes: `pnpm --filter @open-design/e2e test -- tests/assistant-message.test.tsx`
- Web project form changes: `pnpm --filter @open-design/web test -- src/components/DesignsTab.test.ts src/components/FileViewer.test.tsx`
- Lifecycle changes: `pnpm tools-dev check`, plus `pnpm tools-dev status --json`
- Prompt/skill-only metadata changes: use a content anchor check first, for
  example `test -s skills/figma-native-screen/SKILL.md && rg --line-number
  "mode: figma|figma-canvas|use_figma|search_design_system|get_metadata|get_screenshot|get_variable_defs"
  skills/figma-native-screen/SKILL.md design-systems/figma-native-base/FIGMA.md`,
  then run the smallest affected prompt/registry test once the task changes
  code.

CI/release notes:

- `.github/workflows/release-stable.yml` runs install, daemon build, desktop
  build, recursive typecheck, and residual JS check.
- The stable release workflow explicitly notes workspace tests are not gated
  there because existing i18n content coverage can drift independently.

## Current Risk List

High priority:

- Codex adapter uses `--full-auto` despite the Figma/Codex upgrade docs calling
  for `--sandbox workspace-write`; this is in scope for `C20`, not A00.
- `figma` mode/surface exists in shipped skills but is not part of the typed
  registry contract or UI create flow.
- Two prompt composer copies exist. Figma-native prompt changes must be applied
  carefully to daemon and contract code paths.
- Codex JSONL parser does not yet recognize MCP tool-call events, so Figma MCP
  actions would currently appear as raw lines or be dropped.

Medium priority:

- Figma-native design-system files (`FIGMA.md`, `tokens.json`,
  `component-map.json`) exist, but the design-system loader only reads
  `DESIGN.md`.
- Existing artifact preview/export flow assumes local HTML or file outputs; a
  Figma-native result needs a separate structured result card.
- `.codex/config.example.toml` exists, and `.codex/config.toml` is present in
  the workspace. Do not read or commit secret-bearing local config without
  checking content and policy.
- The worktree had pre-existing dirty and untracked `.ai/figma-codex` changes
  before A00 editing. Future commits should stage only scoped files.

Lower priority:

- README marketing counts and current filesystem counts differ because this
  fork already includes many additional skills/design systems. Use filesystem
  discovery for implementation decisions.
- `bd show --long` is required by project instructions but unsupported by the
  installed `bd`; use `bd show --json` or plain `bd show` after recording the
  failed `--long` attempt.

## Follow-up Beads Already Represented

The task graph already contains beads for the main gaps found here:

- `A01`: merge AGENTS and Codex/Figma MCP setup guidance.
- `A02`: confirm Figma-native ADR and schema.
- `A03`: discover and record validation commands.
- `B10`: extend skill registry for `od.mode: figma`.
- `B11`: add Figma-native prompt directive.
- `B12`: extend project metadata for Figma target.
- `B14`: add Figma result report schema and parser.
- `B15`: implement Figma result card UI.
- `C20`: modernize Codex adapter invocation.
- `C21`: parse Codex JSONL MCP tool-call events.
- `D35`: build the `FIGMA.md` / tokens / component-map bridge.
- `D36`: make the prompt composer read both `DESIGN.md` and `FIGMA.md`.

No additional bead was created during A00 because the unexpected gaps are
already covered by existing task graph entries.
