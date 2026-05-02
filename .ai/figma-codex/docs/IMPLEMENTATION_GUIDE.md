# Implementation Guide：按阶段改造

## Phase 0：准备与基线

目标：让 Codex 和 Beads 明确长期工作方式，先了解仓库再动手。

要完成：

- 合并 `AGENTS.figmacodex.append.md` 到 `AGENTS.md`。
- 运行 `bd init` 与 `.ai/figma-codex/scripts/init-beads-tasks.sh`。
- 记录当前仓库结构、实际 build/test/lint 命令。
- 确认 Codex CLI 版本和 Figma MCP 连接方式。

验收：

- `bd ready --json` 能列出任务。
- `AGENTS.md` 包含 Figma-native 和 Beads 工作协议。
- 有一份 repo map / baseline notes。

## Phase 1：Figma mode 基础设施

目标：Open Design 能识别 `od.mode: figma`，prompt composer 能切换到 Figma-native 交付语义。

要完成：

- 扩展 skill registry / types / filters。
- 扩展 project metadata。
- 添加 Figma-native directive。
- 添加 Figma result schema。
- 添加单元测试。

验收：

- 新增 `skills/figma-native-screen/SKILL.md` 可被发现。
- `preview.type: figma-canvas` 不会被当成普通 HTML artifact。
- composer 对 Figma mode 明确禁止 HTML 作为最终交付。

## Phase 2：Codex adapter 与事件流

目标：Codex 执行和 UI 事件能支持 MCP tool calls。

要完成：

- 更新 Codex adapter，避免 `--full-auto`。
- 解析 `codex exec --json` JSONL。
- 把 MCP tool calls 转成 UI 进度事件。
- 添加 mocked JSONL 测试。

验收：

- 可解析包含 MCP tool call 的 fixture。
- UI 能显示 Figma 操作事件。
- 错误/超时/缺 MCP 连接有清晰提示。

## Phase 3：Skills 与 Design System

目标：提供可复用 Figma-native skill 和 Figma-specific design system schema。

要完成：

- `figma-native-screen`
- `figma-native-landing`
- `figma-native-dashboard`
- `figma-native-mobile-flow`
- `figma-canvas-critique`
- `design-systems/figma-native-base/DESIGN.md`
- `FIGMA.md`、`tokens.json`、`component-map.json`

验收：

- Open Design UI 可选这些 skills。
- 每个 skill 有明确输入、工作流、输出报告、质检要求。
- Figma mode 能读 DESIGN.md + FIGMA.md。

## Phase 4：UI 与 demo

目标：能完整跑一个 Figma-native demo。

要完成：

- New project 表单加入 Figma target。
- Chat/result panel 支持 Figma result card。
- 可选的 `create_new_file` 流程文案。
- demo prompt 与文档。

验收：

- 用户输入 Figma URL 后能触发 Figma-native mode。
- result card 显示 file URL / frame / checks / issues。
- mocked E2E 通过。

## Phase 5：开源质量

目标：可维护、可贡献、可扩展。

要完成：

- README / docs / maintainer guide。
- tests / fixtures / examples。
- license / trademark / third-party attribution audit。
- release checklist。

验收：

- 新 contributor 能按文档跑起来。
- 没有把品牌 design systems 描述成官方授权。
- Figma MCP 的权限限制、seat 要求、rate limits 在文档中说明。
